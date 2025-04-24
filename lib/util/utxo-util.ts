import type { LibauthOutput, UnlockableUtxo } from 'cashscript';
import { RegistrationCounterUTXONotFoundError, ThreadNFTUTXONotFoundError, AuctionUTXONotFoundError, AuthorizedContractUTXONotFoundError } from '../errors.js';
import { cashScriptOutputToLibauthOutput } from 'cashscript/dist/utils.js';
import { cashAddressToLockingBytecode, decodeCashAddress, lockingBytecodeToAddressContents, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { binToHex } from '@bitauth/libauth';
import { hexToBin } from '@bitauth/libauth';
import { addressContentsToLockingBytecode } from '@bitauth/libauth';

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

export const convertAddressToPkh = (userAddress: string): string =>
{
	const decodeAddressObj = decodeCashAddress(userAddress);
	if(typeof decodeAddressObj == 'string') throw new Error('error decodeCashAddress()');
	const userPkh = decodeAddressObj.payload;
	const userPkhHex = binToHex(userPkh);

	return userPkhHex;
};

export const convertCashAddressToTokenAddress = (cashAddress: string): string =>
{
	// @ts-ignore
	const lockingBytecode = cashAddressToLockingBytecode(cashAddress).bytecode;
	const addressContents = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, tokenSupport: true });

	// @ts-ignore
	return addressContents.address;
};

export const convertPkhToLockingBytecode = (userPkh: string): any =>
{
	const userPkhBin = hexToBin(userPkh);
	const userLockingBytecode = addressContentsToLockingBytecode({ type: 'P2PKH', payload: userPkhBin });

	return userLockingBytecode;
};

export const formatTimestamp = (unixTimestamp: string | number): string =>
{
	if(Number(unixTimestamp) > 500_000_000)
	{
		const date = new Date(Number(unixTimestamp) * 1000);
		const year = date.getUTCFullYear();
		const month = String(date.getUTCMonth() + 1).padStart(2, '0');
		const day = String(date.getUTCDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	return `blockheight ${unixTimestamp}`;
};

export const satsToBchAmount = (sats: number): number => sats / 100_000_000;
