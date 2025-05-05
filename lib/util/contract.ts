import { binToHex, hexToBin } from '@bitauth/libauth';
import type { AddressType, NetworkProvider } from 'cashscript';
import { Contract } from 'cashscript';
import { BitCANNArtifacts } from '@bitcann/contracts';


/**
 * Constructs a Domain contract for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the Domain contract.
 * @param {string} params.name - The name of the domain.
 * @param {string} params.category - The category identifier for the domain.
 * @param {number} params.inactivityExpiryTime - The time period after which the domain is considered inactive.
 * @returns {Contract} The constructed Domain contract.
 */
export const constructDomainContract = (params: {
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
		BitCANNArtifacts.Domain,
		[ BigInt(params.inactivityExpiryTime), nameHex, reversedCategory ],
		params.options,
	);
};

/**
 * Retrieves the partial bytecode of the Domain contract.
 *
 * @param {string} category - The category identifier for the domain.
 * @param {Object} options - The options for constructing the Domain contract.
 * @param {NetworkProvider} options.provider - The network provider.
 * @param {AddressType} options.addressType - The address type.
 * @returns {string} The partial bytecode of the Domain contract.
 */
export const getDomainPartialBytecode = (category: string, options: { provider: NetworkProvider; addressType: AddressType }): string =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(category).reverse());

	// Placeholder name used for constructing a partial domain contract bytecode.
	const placeholderName = 'test';
	const placeholderNameHex = Array.from(placeholderName).map(char => char.charCodeAt(0).toString(16)
		.padStart(2, '0'))
		.join('');

	// Construct a placeholder domain contract to extract partial bytecode.
	const PlaceholderDomainContract = new Contract(BitCANNArtifacts.Domain, [ BigInt(1), placeholderNameHex, reversedCategory ], options);
	const sliceIndex = 2 + 64 + 2 + placeholderName.length * 2;
	const domainPartialBytecode = PlaceholderDomainContract.bytecode.slice(sliceIndex, PlaceholderDomainContract.bytecode.length);

	return domainPartialBytecode;
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

	const domainPartialBytecode = getDomainPartialBytecode(params.category, params.options);

	// Return an object containing all the constructed contracts.
	return {
		Accumulator: new Contract(BitCANNArtifacts.Accumulator, [], params.options),
		Auction: new Contract(BitCANNArtifacts.Auction, [ BigInt(params.minStartingBid) ], params.options),
		AuctionConflictResolver: new Contract(BitCANNArtifacts.AuctionConflictResolver, [], params.options),
		AuctionNameEnforcer: new Contract(BitCANNArtifacts.AuctionNameEnforcer, [], params.options),
		Bid: new Contract(BitCANNArtifacts.Bid, [ BigInt(params.minBidIncreasePercentage) ], params.options),
		DomainFactory: new Contract(BitCANNArtifacts.DomainFactory, [ domainPartialBytecode, BigInt(params.minWaitTime), BigInt(params.maxPlatformFeePercentage) ], params.options),
		DomainOwnershipGuard: new Contract(BitCANNArtifacts.DomainOwnershipGuard, [ domainPartialBytecode ], params.options),
		Registry: new Contract(BitCANNArtifacts.Registry, [ reversedCategory ], params.options),
	};
};