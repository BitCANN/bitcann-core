import type { Utxo, Unlocker, Contract } from 'cashscript';
import { TransactionBuilder } from 'cashscript';
import { binToHex, decodeTransaction, hexToBin, cashAddressToLockingBytecode, hash256 } from '@bitauth/libauth';
import { fetchTransaction } from '@electrum-cash/protocol';
import { convertAddressToPkh, convertPkhToLockingBytecode } from './address.js';
import { extractOpReturnPayload } from './binary.js';
import type { GetValidCandidateTransactionsParams } from '../interfaces/index.js';

/**
 * Finds the internal authorization NFT UTXO from a list of UTXOs
 */
export const findInternalAuthNFTUTXO = (utxos: Utxo[], category: string): Utxo | null =>
	utxos.find((utxo) =>
		utxo.token?.nft?.capability === 'none'
		&& utxo.token?.category === category
		&& utxo.token?.nft?.commitment.length > 0,
	) || null;

/**
 * Finds the ownership NFT UTXO from a list of UTXOs
 */
export const findOwnershipNFTUTXO = (utxos: Utxo[], category: string, name: string): Utxo | null =>
	utxos.find((utxo) =>
		utxo.token?.nft?.capability === 'none'
		&& utxo.token?.category === category
		&& Buffer.from(utxo.token?.nft?.commitment.slice(16), 'hex').toString('utf8') === name,
	) || null;

/**
 * Finds the funding UTXO with highest satoshis from a list of UTXOs
 */
export const findFundingUTXO = (utxos: Utxo[]): Utxo | null =>
	utxos.reduce<Utxo | null>((max, utxo) =>
		(!utxo.token && utxo.satoshis > (max?.satoshis || 0)) ? utxo : max,
	null,
	);

/**
 * Creates a placeholder unlocker for a given address
 */
export const createPlaceholderUnlocker = (address: string): Unlocker =>
{
	const pkh = convertAddressToPkh(address);

	// @ts-ignore - The Unlocker type from cashscript is not fully exposed
	return {
		generateLockingBytecode: () => convertPkhToLockingBytecode(pkh),
		generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
	};
};



/**
 * Adjusts the last output of a transaction to account for transaction size fee
 */
export const adjustLastOutputForFee = (transaction: TransactionBuilder, fundingUTXO: Utxo, deductable: bigint = BigInt(0)): TransactionBuilder =>
{
	const transactionSize = transaction.build().length;
	transaction.outputs[transaction.outputs.length - 1].amount = fundingUTXO.satoshis - (BigInt(transactionSize) + deductable);

	return transaction;
};

/**
 * Validates if a transaction is valid for a domain contract
 */
export const isValidTransaction = (tx: any, domainContract: Contract, category: string): boolean =>
{
	let hasOpReturn = false;
	let hasCategoryFromContract = false;

	for(const output of tx.outputs)
	{
		if(output.valueSatoshis == 0)
		{
			hasOpReturn = true;
			continue;
		}

		if(!output.token || binToHex(output.token.category) != category)
		{
			continue;
		}

		const lockingBytecodeResult = cashAddressToLockingBytecode(domainContract.address);
		if(typeof lockingBytecodeResult === 'string')
		{
			continue;
		}

		if(binToHex(output.lockingBytecode) === binToHex(lockingBytecodeResult.bytecode))
		{
			hasCategoryFromContract = true;
		}
	}

	return hasOpReturn && hasCategoryFromContract;
};

/**
 * Gets valid candidate transactions from history
 */
export const getValidCandidateTransactions = async ({
	history,
	domainContract,
	category,
	electrumClient,
}: GetValidCandidateTransactionsParams): Promise<any[]> =>
{
	const validCandidateTransactions = [];

	for(const txn of history)
	{
		const tx = await fetchTransaction(electrumClient, txn.tx_hash);
		const decodedTx = decodeTransaction(hexToBin(tx));

		if(isValidTransaction(decodedTx, domainContract, category))
		{
			validCandidateTransactions.push(decodedTx);
		}
	}

	return validCandidateTransactions;
};

/**
 * Creates a registration ID from a UTXO
 */
export const createRegistrationId = (utxo: Utxo): string =>
{
	if(!utxo.token?.amount)
	{
		throw new Error('UTXO must have a token amount');
	}

	return utxo.token.amount.toString(16).padStart(16, '0');
};

// Extracted utility functions for better testing
export const extractRecordsFromTransaction = (tx: any): string[] =>
{
	const records: string[] = [];
	for(const output of tx.outputs)
	{
		if(output.valueSatoshis == 0)
		{
			const opReturnPayload = extractOpReturnPayload(binToHex(output.lockingBytecode));
			const utf8String = Buffer.from(opReturnPayload, 'hex').toString('utf8');
			records.push(utf8String);
		}
	}

	return records;
};

export const filterValidRecords = (records: string[]): string[] =>
{
	return records.filter(record =>
	{
		if(record.startsWith('RMV '))
		{
			return false;
		}

		return !records.some(rmvRecord =>
			rmvRecord.startsWith('RMV ')
        && binToHex(hash256(hexToBin(record))) === rmvRecord.split(' ')[1],
		);
	});
};