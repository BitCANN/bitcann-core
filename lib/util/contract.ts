import { binToHex, hexToBin } from '@bitauth/libauth';
import type { AddressType, NetworkProvider } from 'cashscript';
import { Contract } from 'cashscript';
import { BitCANNArtifacts } from '@bitcann/contracts';


/**
 * Constructs a Name contract for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the Name contract.
 * @param {string} params.name - The name.
 * @param {string} params.category - The category identifier for the name.
 * @param {number} params.inactivityExpiryTime - The time period after which the domain is considered inactive.
 * @returns {Contract} The constructed Name contract.
 */
export const constructNameContract = (params: {
	name: string;
	category: string;
	inactivityExpiryTime: number;
	options: { provider: NetworkProvider; addressType: AddressType };
}): Contract =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	// Convert the domain name to a hex string.
	const nameHex = Buffer.from(params.name).toString('hex');

	// Construct the Domain contract with the provided parameters.
	return new Contract(
		BitCANNArtifacts.Name,
		[ BigInt(params.inactivityExpiryTime), nameHex, reversedCategory ],
		params.options,
	);
};

/**
 * Retrieves the partial bytecode of the Name contract.
 *
 * @param {string} category - The category identifier for the name.
 * @param {Object} options - The options for constructing the Name contract.
 * @param {NetworkProvider} options.provider - The network provider.
 * @param {AddressType} options.addressType - The address type.
 * @returns {string} The partial bytecode of the Name contract.
 */
export const getNamePartialBytecode = (category: string, options: { provider: NetworkProvider; addressType: AddressType }): string =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(category).reverse());

	// Placeholder name used for constructing a partial domain contract bytecode.
	const placeholderName = 'test';
	const placeholderNameHex = Array.from(placeholderName).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	const placeTLD = '.bch';
	const placeTLDHex = Array.from(placeTLD).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	// Construct a placeholder name contract to extract partial bytecode.
	const PlaceholderNameContract = new Contract(BitCANNArtifacts.Name, [ placeholderNameHex, placeTLDHex, reversedCategory ], options);
	const sliceIndex = 2 + 64 + 2 + placeholderName.length * 2 + 2 + placeTLD.length * 2;
	const namePartialBytecode = PlaceholderNameContract.bytecode.slice(sliceIndex, PlaceholderNameContract.bytecode.length);

	return namePartialBytecode;
};

/**
 * Constructs a set of contracts for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the contracts.
 * @param {number} params.minStartingBid - The minimum starting bid for auctions.
 * @param {number} params.minBidIncreasePercentage - The minimum bid increase percentage.
 * @param {number} params.minWaitTime - The minimum wait time for auction finalization.
 * @param {number} params.maxPlatformFeePercentage - The maximum platform fee percentage.
 * @returns {Object} An object containing the constructed contracts.
 */
export const constructContracts = (params: {
	minStartingBid: number;
	minBidIncreasePercentage: number;
	minWaitTime: number;
	maxPlatformFeePercentage: number;
	category: string;
	options: { provider: NetworkProvider; addressType: AddressType };
}): { [key: string]: Contract } =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	const namePartialBytecode = getNamePartialBytecode(params.category, params.options);

	// Return an object containing all the constructed contracts.
	return {
		Accumulator: new Contract(BitCANNArtifacts.Accumulator, [], params.options),
		Auction: new Contract(BitCANNArtifacts.Auction, [], params.options),
		ConflictResolver: new Contract(BitCANNArtifacts.ConflictResolver, [], params.options),
		NameEnforcer: new Contract(BitCANNArtifacts.NameEnforcer, [], params.options),
		Bid: new Contract(BitCANNArtifacts.Bid, [], params.options),
		Factory: new Contract(BitCANNArtifacts.Factory, [ namePartialBytecode, BigInt(params.minWaitTime), BigInt(params.maxPlatformFeePercentage) ], params.options),
		OwnershipGuard: new Contract(BitCANNArtifacts.OwnershipGuard, [ namePartialBytecode ], params.options),
		Registry: new Contract(BitCANNArtifacts.Registry, [ reversedCategory ], params.options),
	};
};