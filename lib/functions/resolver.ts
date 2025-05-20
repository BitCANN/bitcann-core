// // Name to address
// // Returns the bitcoin cash address for the given name.
// export const resolveNameCore = async () => {
//   // Option 1: Use chain graph to lookup the trail of UTXO, and see where the existing utxo exists.
// }

import type { LookupAddressCoreParams, LookupAddressCoreResponse } from '../interfaces/resolver.js';

/**
 * Retrieves all domain names associated with a given Bitcoin Cash address.
 *
 * This function queries the blockchain to find all UTXOs linked to the specified address
 * and filters them to extract the domain names owned by the address.
 *
 * @param {LookupAddressRequest} params - The parameters for the lookup operation.
 * @returns {Promise<LookupAddressResponse>} A promise that resolves to an object containing an array of domain names owned by the address.
 */
export const lookupAddressCore = async ({
	address,
	category,
	networkProvider,
}: LookupAddressCoreParams): Promise<LookupAddressCoreResponse> =>
{
	// Look for all the UTXOs for the given address and filter the names.
	const utxos = await networkProvider.getUtxos(address);

	const filteredUtxos = utxos.filter((utxo) => utxo.token?.category === category);

	const names = filteredUtxos.map((utxo) =>
	{
		const nameHex = utxo.token!.nft!.commitment.slice(16);

		return Buffer.from(nameHex, 'hex').toString('utf8');
	});

	return { names };
};