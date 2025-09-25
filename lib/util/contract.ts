import { binToHex, hexToBin } from '@bitauth/libauth';
import { BitCANNArtifacts } from '@bitcann/contracts';
import type { NetworkProvider } from 'cashscript';
import { Contract } from 'cashscript';
import { ADDRESS_TYPE } from '../constants.js';
import { convertAddressToPkh } from './address.js';


/**
 * Constructs a Name contract for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the Name contract.
 * @param {string} params.name - The name.
 * @param {string} params.category - The category identifier for the name.
 * @param {string} params.tld - The TLD of the name.
 * @returns {Contract} The constructed Name contract.
 */
export const constructNameContract = (params: {
	name: string;
	category: string;
	provider: NetworkProvider;
	tld: string;
}): Contract =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	// Convert the name to a hex string.
	const nameHex = Buffer.from(params.name).toString('hex');

	const placeTLD = params.tld;
	const placeTLDHex = Array.from(placeTLD).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	// Construct the Name contract with the provided parameters.
	return new Contract(
		BitCANNArtifacts.Name,
		[ nameHex, placeTLDHex, reversedCategory ],
		{ provider: params.provider, addressType: ADDRESS_TYPE },
	);
};

/**
 * Retrieves the partial bytecode of the Name contract.
 *
 * @param {string} category - The category identifier for the name.
 * @param {Object} options - The options for constructing the Name contract.
 * @param {NetworkProvider} options.provider - The network provider.
 * @returns {string} The partial bytecode of the Name contract.
 */
export const getNamePartialBytecode = (params: { category: string; provider: NetworkProvider; tld: string }): string =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	// Placeholder name used for constructing a partial name contract bytecode.
	const placeholderName = 'test';
	const placeholderNameHex = Array.from(placeholderName).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	const placeTLD = params.tld;
	const placeTLDHex = Array.from(placeTLD).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	// Construct a placeholder name contract to extract partial bytecode.
	const PlaceholderNameContract = new Contract(BitCANNArtifacts.Name, [ placeholderNameHex, placeTLDHex, reversedCategory ], { provider: params.provider, addressType: ADDRESS_TYPE });
	const sliceIndex = 2 + 64 + 2 + placeholderName.length * 2 + 2 + placeTLD.length * 2;
	const namePartialBytecode = PlaceholderNameContract.bytecode.slice(sliceIndex, PlaceholderNameContract.bytecode.length);

	return namePartialBytecode;
};

/**
 * Constructs a set of contracts for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the contracts.
 * @param {string} params.creatorIncentiveAddress - The creator incentive address.
 * @returns {Object} An object containing the constructed contracts.
 */
export const constructContracts = (params: {
	creatorIncentiveAddress: string;
	category: string;
	provider: NetworkProvider;
	tld: string;
}): { [key: string]: Contract } =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	const namePartialBytecode = getNamePartialBytecode({ category: params.category, provider: params.provider, tld: params.tld });

	// Return an object containing all the constructed contracts.
	return {
		Accumulator: new Contract(
			BitCANNArtifacts.Accumulator,
			[],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		Auction: new Contract(
			BitCANNArtifacts.Auction,
			[],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		ConflictResolver: new Contract(
			BitCANNArtifacts.ConflictResolver,
			[],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		NameEnforcer: new Contract(
			BitCANNArtifacts.NameEnforcer,
			[],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		Bid: new Contract(
			BitCANNArtifacts.Bid,
			[],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		Factory: new Contract(
			BitCANNArtifacts.Factory,
			[ namePartialBytecode, convertAddressToPkh(params.creatorIncentiveAddress) ],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		OwnershipGuard: new Contract(
			BitCANNArtifacts.OwnershipGuard,
			[ namePartialBytecode ],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
		Registry: new Contract(
			BitCANNArtifacts.Registry,
			[ reversedCategory ],
			{ provider: params.provider, addressType: ADDRESS_TYPE },
		),
	};
};
