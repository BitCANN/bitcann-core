/**
 * Retrieves the registration UTXO from a list of UTXOs.
 * 
 * @param {Object} params - The parameters for the function.
 * @param {any[]} params.utxos - The list of UTXOs to search through.
 * @param {string} params.category - The category to match against.
 * @returns {Promise<any>} A promise that resolves to the registration UTXO.
 * @throws {Error} If no registration UTXO is found.
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
		throw new Error('Registration UTXO not found');
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
 * @throws {Error} If no thread UTXO is found.
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
		throw new Error('Thread UTXO not found');
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
 * @throws {Error} If no auction UTXO is found.
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
		throw new Error('Auction UTXO not found');
	}

	return utxo;
};
