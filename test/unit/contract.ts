
// import { describe, it, expect } from '@jest/globals';
// import { constructDomainContract, getDomainPartialBytecode, constructContracts } from '../../lib/util/contract';
// import type { NetworkProvider, AddressType } from 'cashscript';
// import { Contract } from 'cashscript';
// import {
// 	domainTokenCategory,
// 	minStartingBid,
// 	minBidIncreasePercentage,
// 	inactivityExpiryTime,
// 	minWaitTime,
// 	maxPlatformFeePercentage,
// 	registryLockingBytecodeHex,
// 	auctionLockingBytecodeHex,
// 	bidLockingBytecodeHex,
// 	domainFactoryLockingBytecodeHex,
// 	domainOwnershipGuardLockingBytecodeHex,
// 	auctionConflictResolverLockingBytecodeHex,
// 	auctionNameEnforcerLockingBytecodeHex,
// 	accumulatorLockingBytecodeHex,
// } from '../config.js';

// describe('Contract Utilities', () =>
// {
// 	const mockProvider = {} as NetworkProvider;
// 	const mockAddressType = 'p2sh32' as AddressType;
// 	const mockOptions = {
// 		provider: mockProvider,
// 		addressType: mockAddressType,
// 	};

// 	describe('constructDomainContract', () =>
// 	{
// 		it('should construct a domain contract with correct parameters', () =>
// 		{
// 			const params = {
// 				name: 'test',
// 				category: domainTokenCategory,
// 				inactivityExpiryTime,
// 				options: mockOptions,
// 			};

// 			const contract = constructDomainContract(params);

// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ BigInt(inactivityExpiryTime), '74657374', domainTokenCategory.slice(2) ],
// 				mockOptions,
// 			);
// 		});
// 	});

// 	describe('getDomainPartialBytecode', () =>
// 	{
// 		it('should return partial bytecode for a given category', () =>
// 		{
// 			const bytecode = getDomainPartialBytecode(domainTokenCategory, mockOptions);

// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ BigInt(1), '74657374', domainTokenCategory.slice(2) ],
// 				mockOptions,
// 			);
// 			expect(bytecode).toBe(domainOwnershipGuardLockingBytecodeHex);
// 		});
// 	});

// 	describe('constructContracts', () =>
// 	{
// 		it('should construct all contracts with correct parameters', () =>
// 		{
// 			const params = {
// 				minStartingBid,
// 				minBidIncreasePercentage,
// 				minWaitTime,
// 				maxPlatformFeePercentage,
// 				category: domainTokenCategory,
// 				options: mockOptions,
// 			};

// 			const contracts = constructContracts(params);

// 			// Verify all contracts are constructed
// 			expect(contracts).toHaveProperty('Accumulator');
// 			expect(contracts).toHaveProperty('Auction');
// 			expect(contracts).toHaveProperty('AuctionConflictResolver');
// 			expect(contracts).toHaveProperty('AuctionNameEnforcer');
// 			expect(contracts).toHaveProperty('Bid');
// 			expect(contracts).toHaveProperty('DomainFactory');
// 			expect(contracts).toHaveProperty('DomainOwnershipGuard');
// 			expect(contracts).toHaveProperty('Registry');

// 			// Verify contract construction calls
// 			// Accumulator
// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ ],
// 				mockOptions,
// 			);

// 			// Auction
// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ BigInt(minStartingBid) ],
// 				mockOptions,
// 			);

// 			// Bid
// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ BigInt(minBidIncreasePercentage) ],
// 				mockOptions,
// 			);

// 			// DomainFactory
// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ expect.any(String), BigInt(minWaitTime), BigInt(maxPlatformFeePercentage) ],
// 				mockOptions,
// 			);

// 			// Registry
// 			expect(Contract).toHaveBeenCalledWith(
// 				expect.any(Object),
// 				[ domainTokenCategory.slice(2) ],
// 				mockOptions,
// 			);

// 			// Verify contract bytecodes
// 			expect(contracts.Accumulator.bytecode).toBe(accumulatorLockingBytecodeHex);
// 			expect(contracts.Auction.bytecode).toBe(auctionLockingBytecodeHex);
// 			expect(contracts.Bid.bytecode).toBe(bidLockingBytecodeHex);
// 			expect(contracts.DomainFactory.bytecode).toBe(domainFactoryLockingBytecodeHex);
// 			expect(contracts.DomainOwnershipGuard.bytecode).toBe(domainOwnershipGuardLockingBytecodeHex);
// 			expect(contracts.AuctionConflictResolver.bytecode).toBe(auctionConflictResolverLockingBytecodeHex);
// 			expect(contracts.AuctionNameEnforcer.bytecode).toBe(auctionNameEnforcerLockingBytecodeHex);
// 			expect(contracts.Registry.bytecode).toBe(registryLockingBytecodeHex);
// 		});
// 	});
// });
