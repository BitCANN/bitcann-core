import { binToHex, cashAddressToLockingBytecode, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import type { LibauthOutput, UnlockableUtxo } from 'cashscript';
import { RegistrationCounterUTXONotFoundError, ThreadNFTUTXONotFoundError, AuctionUTXONotFoundError, AuthorizedContractUTXONotFoundError, RunningAuctionUTXONotFoundError, NameMintingUTXONotFoundError, ThreadWithTokenUTXONotFoundError } from '../errors.js';
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

/**
 * Retrieves the name minting UTXO from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {any} The name minting UTXO.
 * @throws {NameMintingUTXONotFoundError} If no name minting UTXO is found.
 */
export const getNameMintingUtxo = ({ utxos, category }: { utxos: any[]; category: string }): any =>
{
	const utxo = utxos.find(u =>
		u.token?.nft?.capability === 'minting'
    && u.token?.category === category
    && u.token?.amount == BigInt(0),
	);

	if(!utxo)
	{
		throw new NameMintingUTXONotFoundError();
	}

	return utxo;
};

/**
 * Retrieves all running auction UTXOs from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.name - The name to match against the UTXO's token commitment.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {any[]} An array of running auction UTXOs.
 * @throws {RunningAuctionUTXONotFoundError} If no running auction UTXOs are found.
 */
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

/**
 * Retrieves the running auction UTXO with the smallest token amount from a list of UTXOs.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.name - The name to match against the UTXO's token commitment.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {any} The running auction UTXO with the smallest token amount.
 * @throws {RunningAuctionUTXONotFoundError} If no running auction UTXO is found.
 */
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

/**
 * Generates source outputs from a list of unlockable UTXOs.
 *
 * @param {UnlockableUtxo[]} inputs - The list of unlockable UTXOs.
 * @returns {LibauthOutput[]} An array of LibauthOutput objects.
 */
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

/**
 * Creates a placeholder unlocker for a given address.
 *
 * @param {string} address - The address for which to create the unlocker.
 * @returns {any} The created placeholder unlocker.
 */
export const createPlaceholderUnlocker = (address: string): any =>
{
	const userPkh = convertAddressToPkh(address);

	return {
		generateLockingBytecode: () => convertPkhToLockingBytecode(userPkh),
		generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
	};
};

/**
 * Converts a cash address to a token address.
 *
 * @param {string} cashAddress - The cash address to convert.
 * @returns {string} The converted token address.
 */
export const convertCashAddressToTokenAddress = (cashAddress: string): string =>
{
	// @ts-ignore
	const lockingBytecode = cashAddressToLockingBytecode(cashAddress).bytecode;
	const addressContents = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, tokenSupport: true });

	// @ts-ignore
	return addressContents.address;
};
