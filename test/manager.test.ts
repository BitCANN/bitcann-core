import { describe, it, expect } from '@jest/globals';
import { createManager, BitCANNManager } from '../lib/manager';
import { NetworkProvider } from 'cashscript';
import { DomainStatusType } from '../lib/interfaces/domain';
import
{
	accumulatorContractAddress,
	accumulatorLockingBytecodeHex,
	auctionConflictResolverContractAddress,
	auctionConflictResolverLockingBytecodeHex,
	auctionContractAddress,
	auctionLockingBytecodeHex,
	auctionNameEnforcerContractAddress,
	auctionNameEnforcerLockingBytecodeHex,
	bidContractAddress,
	bidLockingBytecodeHex,
	domainFactoryContractAddress,
	domainFactoryLockingBytecodeHex,
	domainOwnershipGuardContractAddress,
	domainOwnershipGuardLockingBytecodeHex,
	mockOptions,
	registryContractAddress,
	registryLockingBytecodeHex,
} from './config';
import { cashAddressToLockingBytecode } from '@bitauth/libauth';
import { binToHex } from '@bitauth/libauth';

describe('BitCANNManager', () => 
{
	describe('constructor', () => 
	{
		it('should create a manager instance with correct configuration', () => 
		{
			const manager = createManager(mockOptions);
			expect(manager).toBeInstanceOf(BitCANNManager);
			expect(manager.category).toBe(mockOptions.category);
			expect(manager.minStartingBid).toBe(mockOptions.minStartingBid);
			expect(manager.minBidIncreasePercentage).toBe(mockOptions.minBidIncreasePercentage);
			expect(manager.inactivityExpiryTime).toBe(mockOptions.inactivityExpiryTime);
			expect(manager.minWaitTime).toBe(mockOptions.minWaitTime);
			expect(manager.maxPlatformFeePercentage).toBe(mockOptions.maxPlatformFeePercentage);
		});

		it('should use provided network provider if specified', () => 
		{
			const mockNetworkProvider = {} as NetworkProvider;
			const manager = createManager({ ...mockOptions, networkProvider: mockNetworkProvider });
			expect(manager.networkProvider).toBe(mockNetworkProvider);
		});

		it('should create default network provider if none provided', () => 
		{
			const manager = createManager(mockOptions);
			expect(manager.networkProvider).toBeDefined();
		});

		it('should construct the correct contracts, addresses, and locking bytecodes', () => 
		{
			const manager = createManager(mockOptions);
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
			expect(manager.contracts.Registry.address).toBe(registryContractAddress);
			expect(manager.contracts.Auction.address).toBe(auctionContractAddress);
			expect(manager.contracts.Bid.address).toBe(bidContractAddress);
			expect(manager.contracts.DomainFactory.address).toBe(domainFactoryContractAddress);
			expect(manager.contracts.DomainOwnershipGuard.address).toBe(domainOwnershipGuardContractAddress);
			expect(manager.contracts.AuctionConflictResolver.address).toBe(auctionConflictResolverContractAddress);
			expect(manager.contracts.AuctionNameEnforcer.address).toBe(auctionNameEnforcerContractAddress);
			expect(manager.contracts.Accumulator.address).toBe(accumulatorContractAddress);

			const registryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Registry.address);
			// @ts-ignore
			const derivedRegistryLockingBytecodeHex = binToHex(registryLockingBytecode.bytecode);
			expect(derivedRegistryLockingBytecodeHex).toBe(registryLockingBytecodeHex);

			const domainFactoryLockingBytecode = cashAddressToLockingBytecode(manager.contracts.DomainFactory.address);
			// @ts-ignore
			const derivedDomainFactoryLockingBytecodeHex = binToHex(domainFactoryLockingBytecode.bytecode);
			expect(derivedDomainFactoryLockingBytecodeHex).toBe(domainFactoryLockingBytecodeHex);

			const domainOwnershipGuardLockingBytecode = cashAddressToLockingBytecode(manager.contracts.DomainOwnershipGuard.address);
			// @ts-ignore
			const derivedDomainOwnershipGuardLockingBytecodeHex = binToHex(domainOwnershipGuardLockingBytecode.bytecode);
			expect(derivedDomainOwnershipGuardLockingBytecodeHex).toBe(domainOwnershipGuardLockingBytecodeHex);

			const auctionConflictResolverLockingBytecode = cashAddressToLockingBytecode(manager.contracts.AuctionConflictResolver.address);
			// @ts-ignore
			const derivedAuctionConflictResolverLockingBytecodeHex = binToHex(auctionConflictResolverLockingBytecode.bytecode);
			expect(derivedAuctionConflictResolverLockingBytecodeHex).toBe(auctionConflictResolverLockingBytecodeHex);

			const auctionNameEnforcerLockingBytecode = cashAddressToLockingBytecode(manager.contracts.AuctionNameEnforcer.address);
			// @ts-ignore
			const derivedAuctionNameEnforcerLockingBytecodeHex = binToHex(auctionNameEnforcerLockingBytecode.bytecode);
			expect(derivedAuctionNameEnforcerLockingBytecodeHex).toBe(auctionNameEnforcerLockingBytecodeHex);

			const bidLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Bid.address);
			// @ts-ignore
			const derivedBidLockingBytecodeHex = binToHex(bidLockingBytecode.bytecode);
			expect(derivedBidLockingBytecodeHex).toBe(bidLockingBytecodeHex);

			const accumulatorLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Accumulator.address);
			// @ts-ignore
			const derivedAccumulatorLockingBytecodeHex = binToHex(accumulatorLockingBytecode.bytecode);
			expect(derivedAccumulatorLockingBytecodeHex).toBe(accumulatorLockingBytecodeHex);
			
			const auctionLockingBytecode = cashAddressToLockingBytecode(manager.contracts.Auction.address);
			// @ts-ignore
			const derivedAuctionLockingBytecodeHex = binToHex(auctionLockingBytecode.bytecode);
			expect(derivedAuctionLockingBytecodeHex).toBe(auctionLockingBytecodeHex);
		});
	});

	describe('getRecords', () => 
	{
		it('should return empty object for a domain', async () => 
		{
			const manager = createManager(mockOptions);
			const domain = 'test.bch';
			const records = await manager.getRecords(domain);
			expect(records).toBeDefined();
			expect(records).toStrictEqual({});
		});
	});

	describe('getDomains', () => 
	{
		it('should return void for domain status', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.getDomains({ status: DomainStatusType.UNDER_AUCTION });
			expect(result).toBeUndefined();
		});
	});

	describe('getDomain', () => 
	{
		it('should return void for domain name', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.getDomain('test.bch');
			expect(result).toBeUndefined();
		});
	});

	describe('write methods', () => 
	{
		it('should return void for accumulateInternalTokens', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.accumulateInternalTokens();
			expect(result).toBeUndefined();
		});

		it('should return void for createAuction', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.createAuction('test.bch');
			expect(result).toBeUndefined();
		});

		it('should return void for createBid', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.createBid('test.bch', 100000000);
			expect(result).toBeUndefined();
		});

		it('should return void for claimDomain', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.claimDomain('test.bch');
			expect(result).toBeUndefined();
		});

		it('should return void for proveInvalidAuctionName', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.proveInvalidAuctionName('test.bch');
			expect(result).toBeUndefined();
		});

		it('should return void for proveDuplicateAuction', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.proveDuplicateAuction('test.bch');
			expect(result).toBeUndefined();
		});

		it('should return void for proveIllegalAuction', async () => 
		{
			const manager = createManager(mockOptions);
			const result = await manager.proveIllegalAuction('test.bch');
			expect(result).toBeUndefined();
		});
	});
}); 