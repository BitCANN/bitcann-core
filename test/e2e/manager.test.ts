import { cashAddressToLockingBytecode, binToHex } from '@bitauth/libauth';
import { describe, it, expect } from '@jest/globals';
import { MockNetworkProvider } from 'cashscript';
import { BitcannManager } from '../../lib/manager.js';
import * as config	from '../config.js';

describe('manager', () =>
{
	const networkProvider = new MockNetworkProvider();
	config.mockOptions.networkProvider = networkProvider;

	const manager = new BitcannManager(config.mockOptions);

	describe('constructor should set parameters correctly', () =>
	{
		it('should create a manager instance with correct configuration', () =>
		{
			expect(manager).toBeInstanceOf(BitcannManager);
			expect(manager.category).toBe(config.mockOptions.category);
			expect(manager.minStartingBid).toBe(config.mockOptions.minStartingBid);
			expect(manager.minBidIncreasePercentage).toBe(config.mockOptions.minBidIncreasePercentage);
			expect(manager.inactivityExpiryTime).toBe(config.mockOptions.inactivityExpiryTime);
			expect(manager.minWaitTime).toBe(config.mockOptions.minWaitTime);
			expect(manager.maxPlatformFeePercentage).toBe(config.mockOptions.maxPlatformFeePercentage);
		});

		it('should create default network provider if none provided', () =>
		{
			expect(manager.networkProvider).toBeDefined();
		});

		it('should construct the correct contracts, addresses, and locking bytecodes', async () =>
		{
			expect(manager.contracts).toBeDefined();
			expect(manager.contracts.Accumulator).toBeDefined();
			expect(manager.contracts.Auction).toBeDefined();
			expect(manager.contracts.AuctionConflictResolver).toBeDefined();
			expect(manager.contracts.AuctionNameEnforcer).toBeDefined();
			expect(manager.contracts.Bid).toBeDefined();
			expect(manager.contracts.DomainFactory).toBeDefined();
			expect(manager.contracts.DomainOwnershipGuard).toBeDefined();
			expect(manager.contracts.Registry).toBeDefined();

			// Verify contract addresses from config
			expect(manager.contracts.Registry.address).toBe(config.registryContractAddress);
			expect(manager.contracts.Auction.address).toBe(config.auctionContractAddress);
			expect(manager.contracts.Bid.address).toBe(config.bidContractAddress);
			expect(manager.contracts.DomainFactory.address).toBe(config.domainFactoryContractAddress);
			expect(manager.contracts.DomainOwnershipGuard.address).toBe(config.domainOwnershipGuardContractAddress);
			expect(manager.contracts.AuctionConflictResolver.address).toBe(config.auctionConflictResolverContractAddress);
			expect(manager.contracts.AuctionNameEnforcer.address).toBe(config.auctionNameEnforcerContractAddress);
			expect(manager.contracts.Accumulator.address).toBe(config.accumulatorContractAddress);

			const registryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Registry.address);
			// @ts-ignore
			const derivedRegistryLockingBytecodeHex = binToHex(registryLockingBytecode.bytecode);
			expect(derivedRegistryLockingBytecodeHex).toBe(config.registryLockingBytecodeHex);

			const domainFactoryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.DomainFactory.address);
			// @ts-ignore
			const derivedDomainFactoryLockingBytecodeHex = binToHex(domainFactoryLockingBytecode.bytecode);
			expect(derivedDomainFactoryLockingBytecodeHex).toBe(config.domainFactoryLockingBytecodeHex);

			const domainOwnershipGuardLockingBytecode = cashAddressToLockingBytecode(manager.contracts.DomainOwnershipGuard.address);
			// @ts-ignore
			const derivedDomainOwnershipGuardLockingBytecodeHex = binToHex(domainOwnershipGuardLockingBytecode.bytecode);
			expect(derivedDomainOwnershipGuardLockingBytecodeHex).toBe(config.domainOwnershipGuardLockingBytecodeHex);

			const auctionConflictResolverLockingBytecode = cashAddressToLockingBytecode(manager.contracts.AuctionConflictResolver.address);
			// @ts-ignore
			const derivedAuctionConflictResolverLockingBytecodeHex = binToHex(auctionConflictResolverLockingBytecode.bytecode);
			expect(derivedAuctionConflictResolverLockingBytecodeHex).toBe(config.auctionConflictResolverLockingBytecodeHex);

			const auctionNameEnforcerLockingBytecode = cashAddressToLockingBytecode(manager.contracts.AuctionNameEnforcer.address);
			// @ts-ignore
			const derivedAuctionNameEnforcerLockingBytecodeHex = binToHex(auctionNameEnforcerLockingBytecode.bytecode);
			expect(derivedAuctionNameEnforcerLockingBytecodeHex).toBe(config.auctionNameEnforcerLockingBytecodeHex);

			const bidLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Bid.address);
			// @ts-ignore
			const derivedBidLockingBytecodeHex = binToHex(bidLockingBytecode.bytecode);
			expect(derivedBidLockingBytecodeHex).toBe(config.bidLockingBytecodeHex);

			const accumulatorLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Accumulator.address);
			// @ts-ignore
			const derivedAccumulatorLockingBytecodeHex = binToHex(accumulatorLockingBytecode.bytecode);
			expect(derivedAccumulatorLockingBytecodeHex).toBe(config.accumulatorLockingBytecodeHex);

			const auctionLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Auction.address);
			// @ts-ignore
			const derivedAuctionLockingBytecodeHex = binToHex(auctionLockingBytecode.bytecode);
			expect(derivedAuctionLockingBytecodeHex).toBe(config.auctionLockingBytecodeHex);
		});
	});
});