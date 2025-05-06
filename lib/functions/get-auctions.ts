import type { Utxo } from 'cashscript';
import type { GetAuctionsParams } from '../interfaces/index.js';

/**
 * Retrieves all active auctions.
 *
 * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
 */
export const getAuctions = async ({
	category,
	networkProvider,
	contracts,
}: GetAuctionsParams): Promise<Utxo[]> =>
{
	const registryUtxos = await networkProvider.getUtxos(contracts.Registry.address);

	return registryUtxos.filter((utxo) => utxo.token?.category === category && utxo.token?.nft?.capability === 'mutable');
};
