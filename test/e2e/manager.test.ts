import { cashAddressToLockingBytecode, binToHex } from '@bitauth/libauth';
import { describe, it, expect } from '@jest/globals';
import { MockNetworkProvider } from 'cashscript';
import { BitcannManager } from '../../lib/managers/bitcann.manager.js';
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
			expect(manager.creatorIncentiveAddress).toBe(config.mockOptions.creatorIncentiveAddress);
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
			expect(manager.contracts.ConflictResolver).toBeDefined();
			expect(manager.contracts.NameEnforcer).toBeDefined();
			expect(manager.contracts.Bid).toBeDefined();
			expect(manager.contracts.Factory).toBeDefined();
			expect(manager.contracts.OwnershipGuard).toBeDefined();
			expect(manager.contracts.Registry).toBeDefined();

			// Verify contract addresses from config
			expect(manager.contracts.Registry.address).toBe(config.registryContractAddress);
			expect(manager.contracts.Auction.address).toBe(config.auctionContractAddress);
			expect(manager.contracts.Bid.address).toBe(config.bidContractAddress);
			expect(manager.contracts.Factory.address).toBe(config.FactoryContractAddress);
			expect(manager.contracts.OwnershipGuard.address).toBe(config.OwnershipGuardContractAddress);
			expect(manager.contracts.ConflictResolver.address).toBe(config.ConflictResolverContractAddress);
			expect(manager.contracts.NameEnforcer.address).toBe(config.NameEnforcerContractAddress);
			expect(manager.contracts.Accumulator.address).toBe(config.accumulatorContractAddress);

			const registryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Registry.address);
			// @ts-ignore
			const derivedRegistryLockingBytecodeHex = binToHex(registryLockingBytecode.bytecode);
			expect(derivedRegistryLockingBytecodeHex).toBe(config.registryLockingBytecodeHex);

			const FactoryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Factory.address);
			// @ts-ignore
			const derivedFactoryLockingBytecodeHex = binToHex(FactoryLockingBytecode.bytecode);
			expect(derivedFactoryLockingBytecodeHex).toBe(config.FactoryLockingBytecodeHex);

			const OwnershipGuardLockingBytecode = cashAddressToLockingBytecode(manager.contracts.OwnershipGuard.address);
			// @ts-ignore
			const derivedOwnershipGuardLockingBytecodeHex = binToHex(OwnershipGuardLockingBytecode.bytecode);
			expect(derivedOwnershipGuardLockingBytecodeHex).toBe(config.OwnershipGuardLockingBytecodeHex);

			const ConflictResolverLockingBytecode = cashAddressToLockingBytecode(manager.contracts.ConflictResolver.address);
			// @ts-ignore
			const derivedConflictResolverLockingBytecodeHex = binToHex(ConflictResolverLockingBytecode.bytecode);
			expect(derivedConflictResolverLockingBytecodeHex).toBe(config.ConflictResolverLockingBytecodeHex);

			const NameEnforcerLockingBytecode = cashAddressToLockingBytecode(manager.contracts.NameEnforcer.address);
			// @ts-ignore
			const derivedNameEnforcerLockingBytecodeHex = binToHex(NameEnforcerLockingBytecode.bytecode);
			expect(derivedNameEnforcerLockingBytecodeHex).toBe(config.NameEnforcerLockingBytecodeHex);

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