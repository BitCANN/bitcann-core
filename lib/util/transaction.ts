import type { Utxo, Unlocker, Contract } from 'cashscript';
import { TransactionBuilder } from 'cashscript';
import { binToHex, decodeTransaction, hexToBin, cashAddressToLockingBytecode } from '@bitauth/libauth';
import { fetchTransaction } from '@electrum-cash/protocol';
import { convertAddressToPkh, convertPkhToLockingBytecode } from './address.js';
import { extractOpReturnPayload } from './binary.js';
import type { GetValidCandidateTransactionsParams } from '../interfaces/index.js';

/**
 * Finds the internal authorization NFT UTXO from a list of UTXOs.
 *
 * @param {Utxo[]} utxos - The list of UTXOs to search through.
 * @param {string} category - The category to match against the UTXO's token category.
 * @returns {Utxo | null} The found UTXO or null if not found.
 */
export const findInternalAuthNFTUTXO = (utxos: Utxo[], category: string): Utxo | null =>
	utxos.find((utxo) =>
		utxo.token?.nft?.capability === 'none'
		&& utxo.token?.category === category
		&& utxo.token?.nft?.commitment.length > 0,
	) || null;

/**
 * Finds the ownership NFT UTXO from a list of UTXOs.
 *
 * @param {Utxo[]} utxos - The list of UTXOs to search through.
 * @param {string} category - The category to match against the UTXO's token category.
 * @param {string} name - The name to match against the UTXO's token commitment.
 * @returns {Utxo | null} The found UTXO or null if not found.
 */
export const findOwnershipNFTUTXO = (utxos: Utxo[], category: string, name: string): Utxo | null =>
	utxos.find((utxo) =>
		utxo.token?.nft?.capability === 'none'
		&& utxo.token?.category === category
		&& Buffer.from(utxo.token?.nft?.commitment.slice(16), 'hex').toString('utf8') === name,
	) || null;

/**
 * Finds the funding UTXO with the highest satoshis from a list of UTXOs.
 *
 * @param {Utxo[]} utxos - The list of UTXOs to search through.
 * @returns {Utxo | null} The UTXO with the highest satoshis or null if not found.
 */
export const findFundingUTXO = (utxos: Utxo[]): Utxo | null =>
	utxos.reduce<Utxo | null>((max, utxo) =>
		(!utxo.token && utxo.satoshis > (max?.satoshis || 0)) ? utxo : max,
	null,
	);

/**
 * Creates a placeholder unlocker for a given address.
 *
 * @param {string} address - The address for which to create the unlocker.
 * @returns {Unlocker} The created placeholder unlocker.
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
 * Adjusts the last output of a transaction to account for transaction size fee.
 *
 * @param {TransactionBuilder} transaction - The transaction to adjust.
 * @param {Utxo} fundingUTXO - The UTXO used for funding the transaction.
 * @param {bigint} [deductable=BigInt(0)] - The amount to deduct from the transaction.
 * @returns {TransactionBuilder} The adjusted transaction.
 */
export const adjustLastOutputForFee = (transaction: TransactionBuilder, fundingUTXO: Utxo, deductable: bigint = BigInt(0)): TransactionBuilder =>
{
	const transactionSize = transaction.build().length;
	transaction.outputs[transaction.outputs.length - 1].amount = fundingUTXO.satoshis - (BigInt(transactionSize * 2) + deductable);

	return transaction;
};

/**
 * Validates if a transaction is valid for a domain contract.
 *
 * @param {any} tx - The transaction to validate.
 * @param {Contract} domainContract - The domain contract to validate against.
 * @param {string} category - The category to match against the transaction's outputs.
 * @returns {boolean} True if the transaction is valid, false otherwise.
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
 * Gets valid candidate transactions from history.
 *
 * @param {GetValidCandidateTransactionsParams} params - The parameters for fetching valid candidate transactions.
 * @returns {Promise<any[]>} A promise that resolves to an array of valid candidate transactions.
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
 * Creates a registration ID from a UTXO.
 *
 * @param {Utxo} utxo - The UTXO from which to create the registration ID.
 * @returns {string} The created registration ID.
 * @throws {Error} If the UTXO does not have a token amount.
 */
export const createRegistrationId = (utxo: Utxo): string =>
{
	if(!utxo.token?.amount)
	{
		throw new Error('UTXO must have a token amount');
	}

	return utxo.token.amount.toString(16).padStart(16, '0');
};

/**
 * Extracts records from a transaction.
 *
 * @param {any} tx - The transaction from which to extract records.
 * @returns {string[]} An array of extracted records.
 */
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
