import { AddressType, Contract, NetworkProvider } from 'cashscript';
import { hexToBin, binToHex } from '@bitauth/libauth';

import Accumulator from '../contracts/Accumulator.json';
import Auction from '../contracts/Auction.json';
import AuctionConflictResolver from '../contracts/AuctionConflictResolver.json';
import AuctionNameEnforcer from '../contracts/AuctionNameEnforcer.json';
import Bid from '../contracts/Bid.json';
import Domain from '../contracts/Domain.json';
import DomainFactory from '../contracts/DomainFactory.json';
import DomainOwnershipGuard from '../contracts/DomainOwnershipGuard.json';
import Registry from '../contracts/Registry.json';

/**
 * Constructs a set of contracts for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the contracts.
 * @param {Object} params.options - The options for constructing the contracts.
 * @param {NetworkProvider} params.options.provider - The network provider for BCH operations.
 * @param {AddressType} params.options.addressType - The address type for the contracts.
 * @param {string} params.category - The category identifier for the contracts.
 * @param {number} params.minStartingBid - The minimum starting bid for auctions.
 * @param {number} params.minBidIncreasePercentage - The minimum bid increase percentage.
 * @param {number} params.minWaitTime - The minimum wait time for auction finalization.
 * @param {number} params.maxPlatformFeePercentage - The maximum platform fee percentage.
 * @returns {Object} An object containing the constructed contracts.
 */
export const constructContracts = (params: {
	options: { provider: NetworkProvider; addressType: AddressType };
	category: string;
	minStartingBid: number;
	minBidIncreasePercentage: number;
	minWaitTime: number;
	maxPlatformFeePercentage: number;
}): { [key: string]: Contract } =>
{
	// Reverse the category bytes for use in contract parameters.
	const reversedCategory = binToHex(hexToBin(params.category).reverse());

	// Dummy name used for constructing a partial domain contract bytecode.
	const dummyName = 'test';
	const dummyNameHex = Buffer.from(dummyName).toString('hex');

	// Construct a dummy domain contract to extract partial bytecode.
	const DummyDomainContract = new Contract(Domain, [ BigInt(1), dummyNameHex, reversedCategory ], params.options);
	const sliceIndex = 2 + 64 + 2 + dummyName.length * 2;
	const domainPartialBytecode = DummyDomainContract.bytecode.slice(sliceIndex, DummyDomainContract.bytecode.length);

	// Return an object containing all the constructed contracts.
	return {
		Accumulator: new Contract(Accumulator, [], params.options),
		Auction: new Contract(Auction, [ BigInt(params.minStartingBid) ], params.options),
		AuctionConflictResolver: new Contract(AuctionConflictResolver, [], params.options),
		AuctionNameEnforcer: new Contract(AuctionNameEnforcer, [], params.options),
		Bid: new Contract(Bid, [ BigInt(params.minBidIncreasePercentage) ], params.options),
		DomainFactory: new Contract(DomainFactory, [ domainPartialBytecode, BigInt(params.minWaitTime), BigInt(params.maxPlatformFeePercentage) ], params.options),
		DomainOwnershipGuard: new Contract(DomainOwnershipGuard, [ domainPartialBytecode ], params.options),
		Registry: new Contract(Registry, [ reversedCategory ], params.options),
	};
};

/**
 * Constructs a Domain contract for the BitCANN system.
 *
 * @param {Object} params - The parameters for constructing the Domain contract.
 * @param {string} params.name - The name of the domain.
 * @param {string} params.category - The category identifier for the domain.
 * @param {number} params.inactivityExpiryTime - The time period after which the domain is considered inactive.
 * @param {Object} params.options - The options for constructing the contracts.
 * @param {NetworkProvider} params.options.provider - The network provider for BCH operations.
 * @param {AddressType} params.options.addressType - The address type for the contracts.
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
		Domain,
		[ BigInt(params.inactivityExpiryTime), nameHex, reversedCategory ],
		params.options,
	);
};
