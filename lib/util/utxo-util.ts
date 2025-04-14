import { RegistrationCounterUTXONotFoundError, ThreadNFTUTXONotFoundError, AuctionUTXONotFoundError, AuthorizedContractUTXONotFoundError } from '../errors';

/**
 * Retrieves the registration UTXO from a list of UTXOs.
 * 
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {Promise<any>} A promise that resolves to the registration UTXO.
 * @throws {RegistrationCounterUTXONotFoundError} If no registration UTXO is found.
 */
export const getRegistrationUtxo = async ({ utxos, category }: { utxos: any[]; category: string }): Promise<any> =>
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
 * @param {string} params.authorizedContractLockingBytecodeHex - The authorized contract locking bytecode hex to match against.
 * @returns {Promise<any>} A promise that resolves to the thread UTXO.
 * @throws {ThreadNFTUTXONotFoundError} If no thread UTXO is found.
 */
export const getThreadUtxo = async ({ utxos, category, authorizedContractLockingBytecodeHex }: { utxos: any[]; category: string; authorizedContractLockingBytecodeHex: string }): Promise<any> =>
{
	const utxo = utxos.find(u => 
		u.token?.nft?.commitment === authorizedContractLockingBytecodeHex
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
 * @returns {Promise<any>} A promise that resolves to the auction UTXO.
 * @throws {AuctionUTXONotFoundError} If no auction UTXO is found.
 */
export const getAuctionUtxo = async ({ utxos, category }: { utxos: any[]; category: string }): Promise<any> =>
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
 * @returns {Promise<any>} A promise that resolves to the authorized contract UTXO.
 * @throws {AuthorizedContractUTXONotFoundError} If no authorized contract UTXO is found.
 */
export const getAuthorizedContractUtxo = async ({ utxos }: { utxos: any[] }): Promise<any> =>
{
	const utxo = utxos[Math.floor(Math.random() * utxos.length)];

	if(!utxo)
	{
		throw new AuthorizedContractUTXONotFoundError();
	}

	return utxo;
};