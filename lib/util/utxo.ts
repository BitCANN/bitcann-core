import { binToHex, cashAddressToLockingBytecode, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import type { LibauthOutput, UnlockableUtxo } from 'cashscript';
import { RegistrationCounterUTXONotFoundError, ThreadNFTUTXONotFoundError, AuctionUTXONotFoundError, AuthorizedContractUTXONotFoundError, RunningAuctionUTXONotFoundError, DomainMintingUTXONotFoundError, ThreadWithTokenUTXONotFoundError } from '../errors.js';
import { cashScriptOutputToLibauthOutput } from 'cashscript/dist/utils.js';
import { convertAddressToPkh, convertPkhToLockingBytecode } from './address.js';

/**
 * Retrieves the registration UTXO from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {Promise<any>} A promise that resolves to the registration UTXO.
 * @throws {RegistrationCounterUTXONotFoundError} If no registration UTXO is found.
 */
export const getRegistrationUtxo = ({ utxos, category }: { utxos: any[]; category: string }): any =>
{
	const utxo = utxos.find(u =>
		u.token?.nft?.capability === 'minting'
		&& u.token?.category === category
		&& u.token?.nft?.commitment
		&& u.token?.amount >= BigInt(0),
	);

	if(!utxo)
	{
		throw new RegistrationCounterUTXONotFoundError();
	}

	return utxo;
};

export const getDomainMintingUtxo = ({ utxos, category }: { utxos: any[]; category: string }): any =>
{
	const utxo = utxos.find(u =>
		u.token?.nft?.capability === 'minting'
		&& u.token?.category === category
		&& u.token?.amount == BigInt(0),
	);

	if(!utxo)
	{
		throw new DomainMintingUTXONotFoundError();
	}

	return utxo;
};

export const getAllRunningAuctionUtxos = ({ name, utxos, category }: { name: string; utxos: any[]; category: string }): any[] =>
{
	const auctionUtxos = utxos.filter((utxo) =>
	{
		if(utxo.token?.category === category && utxo.token?.nft?.capability === 'mutable')
		{
			const nameHex = utxo.token.nft.commitment.slice(40);
			const nameFromCommitment = Buffer.from(nameHex, 'hex').toString('utf8');

			return nameFromCommitment === name;
		}

		return false;
	});

	if(auctionUtxos.length === 0)
	{
		throw new RunningAuctionUTXONotFoundError();
	}

	return auctionUtxos.sort((a, b) => (a.token.amount < b.token.amount ? -1 : 1));
};


export const getRunningAuctionUtxo = ({ name, utxos, category }: { name: string; utxos: any[]; category: string }): any =>
{
	const auctionUtxo = getAllRunningAuctionUtxos({ name, utxos, category })
		.reduce((prev, current) =>
		{
			if(!prev) return current;

			return (prev.token.amount < current.token.amount) ? prev : current;
		}, null);

	if(!auctionUtxo)
	{
		throw new RunningAuctionUTXONotFoundError();
	}

	return auctionUtxo;
};

/**
 * Retrieves the thread UTXO from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @param {string} params.threadContractAddress - The thread contract address to match against.
 * @returns {any} The thread UTXO.
 * @throws {ThreadNFTUTXONotFoundError} If no thread UTXO is found.
 */
export const getThreadUtxo = ({ utxos, category, threadContractAddress }: { utxos: any[]; category: string; threadContractAddress: string }): any =>
{
	const utxo = utxos.find(u =>
		// @ts-ignore
		u.token?.nft?.commitment === binToHex(cashAddressToLockingBytecode(threadContractAddress).bytecode)
		&& u.token?.nft?.capability === 'none'
		&& u.token?.category === category
		&& u.token?.amount >= BigInt(0),
	);

	if(!utxo)
	{
		throw new ThreadNFTUTXONotFoundError();
	}

	return utxo;
};

/**
 * Retrieves the thread UTXO with a token from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {any} The thread UTXO with a token.
 * @throws {ThreadWithTokenUTXONotFoundError} If no thread UTXO with a token is found.
 */
export const getThreadWithTokenUtxo = ({ utxos, category }: { utxos: any[]; category: string }): any =>
{
	const utxo = utxos.find(u =>
		u.token?.nft?.capability === 'none'
		&& u.token?.category === category
		&& u.token?.amount > BigInt(0),
	);

	if(!utxo)
	{
		throw new ThreadWithTokenUTXONotFoundError();
	}

	return utxo;
};

/**
 * Retrieves the auction UTXO from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {any} The auction UTXO.
 * @throws {AuctionUTXONotFoundError} If no auction UTXO is found.
 */
export const getAuctionUtxo = ({ utxos, category }: { utxos: any[]; category: string }): any =>
{
	const utxo = utxos.find(u =>
		u.token?.nft?.capability === 'mutable'
		&& u.token?.category === category
		&& u.token?.amount > 0,
	);

	if(!utxo)
	{
		throw new AuctionUTXONotFoundError();
	}

	return utxo;
};



/**
 * Retrieves a random authorized contract UTXO from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @returns {any} The authorized contract UTXO.
 * @throws {AuthorizedContractUTXONotFoundError} If no authorized contract UTXO is found.
 */
export const getAuthorizedContractUtxo = ({ utxos }: { utxos: any[] }): any =>
{
	const utxo = utxos[Math.floor(Math.random() * utxos.length)];

	if(!utxo)
	{
		throw new AuthorizedContractUTXONotFoundError();
	}

	return utxo;
};

export const generateSourceOutputs = (inputs: UnlockableUtxo[]): LibauthOutput[] =>
{
	// Generate source outputs from inputs (for signing with SIGHASH_UTXOS)
	const sourceOutputs = inputs.map((input) =>
	{
		const sourceOutput = {
			amount: input.satoshis,
			to: input.unlocker.generateLockingBytecode(),
			token: input.token,
		};

		return cashScriptOutputToLibauthOutput(sourceOutput);
	});

	return sourceOutputs;
};

export const findPureUTXO = (utxos: any[]): any =>
{
	const utxo = utxos.reduce((max, val) =>
		(!val.token && val.satoshis > (max?.satoshis || 0)) ? val : max,
	null);

	if(!utxo) throw new Error('Could not find user UTXO without token');

	return utxo;
};

export const createPlaceholderUnlocker = (address: string): any =>
{
	const userPkh = convertAddressToPkh(address);

	return {
		generateLockingBytecode: () => convertPkhToLockingBytecode(userPkh),
		generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
	};
};

export const convertCashAddressToTokenAddress = (cashAddress: string): string =>
{
	// @ts-ignore
	const lockingBytecode = cashAddressToLockingBytecode(cashAddress).bytecode;
	const addressContents = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, tokenSupport: true });

	// @ts-ignore
	return addressContents.address;
};
