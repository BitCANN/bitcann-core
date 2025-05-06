import type { NetworkProvider, AddressType, Utxo } from 'cashscript';
import { Contract, ElectrumNetworkProvider, TransactionBuilder } from 'cashscript';

import type { ManagerConfig, DomainInfo, PastAuctionResult } from './interfaces/index.js';
import { constructContracts, constructDomainContract } from './util/index.js';
import { createClaimDomainTransaction } from './functions/claim-domain.js';
import { fetchRecords } from './functions/fetch-records.js';
import { getDomain } from './functions/get-domain.js';
import { createRecordsTransaction, fetchRecordsUtxos } from './functions/create-records.js';
import { getPastAuctions } from './functions/get-past-auctions.js';
import { getAuctions } from './functions/get-auctions.js';
import { createAuctionTransaction, fetchCreateAuctionUtxos } from './functions/create-auction.js';
import { createBidTransaction, fetchBidUtxos } from './functions/place-bid.js';
import { fetchInvalidNameGuardUtxos, penalizeInvalidAuctionName } from './functions/penalise-invalid-name.js';
import { fetchDuplicateAuctionGuardUtxos, penalizeDuplicateAuction } from './functions/penalise-duplicate-auction.js';
import { fetchIllegalAuctionGuardUtxos, penalizeIllegalAuction } from './functions/penalise-illegal-auction.js';


export class BitCANNManager
{
	// Config to build the contracts in the BitCANN system.
	public category: string;
	public minStartingBid: number;
	public minBidIncreasePercentage: number;
	public inactivityExpiryTime: number;
	public minWaitTime: number;
	public maxPlatformFeePercentage: number;
	public platformFeeAddress: string | undefined;
	public options: { provider: NetworkProvider; addressType: AddressType };

	// Network provider to use for BCH network operations.
	public networkProvider: NetworkProvider;

	// Contracts in the BitCANN system.
	public contracts: Record<string, Contract>;

	constructor(config: ManagerConfig)
	{
		this.category = config.category;
		this.minStartingBid = config.minStartingBid;
		this.minBidIncreasePercentage = config.minBidIncreasePercentage;
		this.inactivityExpiryTime = config.inactivityExpiryTime;
		this.minWaitTime = config.minWaitTime;
		this.maxPlatformFeePercentage = config.maxPlatformFeePercentage;
		this.platformFeeAddress = config.platformFeeAddress;
		if(config.networkProvider)
		{
			// Use the provided network provider for BCH network operations if one is provided.
			this.networkProvider = config.networkProvider;
		}
		else
		{
			// Create a new ElectrumNetworkProvider for BCH network operations.
			this.networkProvider = new ElectrumNetworkProvider('mainnet');
		}

		// Options for contract construction, specifying the network provider and address type.
		this.options = { provider: this.networkProvider, addressType: 'p2sh32' as AddressType };

		this.contracts = constructContracts({
			minStartingBid: this.minStartingBid,
			minBidIncreasePercentage: this.minBidIncreasePercentage,
			minWaitTime: this.minWaitTime,
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
			category: this.category,
			options: this.options,
		});
	}

	// Read Methods

	/**
	 * Retrieves the records associated with a specified domain.
	 *
	 * @param {string} name - The domain name for which to retrieve records.
	 * @param {boolean} keepDuplicates - Whether to keep duplicate records.
	 * @returns {Promise<string[]>} A promise that resolves to an array of domain records.
	 */
	public async getRecords({ name, keepDuplicates = true }: { name: string; keepDuplicates?: boolean }): Promise<string[]>
	{
		return fetchRecords({
			name,
			keepDuplicates,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
		});
	}

	/**
	 * Fetches all active auctions.
	 *
	 * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
	 */
	public async getAuctions(): Promise<Utxo[]>
	{
		return getAuctions({
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
		});
	}

	/**
	 * Retrieves the transaction history.
	 *
	 * @returns {Promise<PastAuctionResult[]>} A promise that resolves to an array of transaction history objects,
	 * each containing a transaction hex and a domain name.
	 */
	public async getHistory(): Promise<PastAuctionResult[]>
	{
		return getPastAuctions({
			category: this.category,
			domainContract: this.contracts.DomainFactory,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
		});
	}

	/**
	 * Retrieves detailed information about a specific domain.
	 *
	 * @param {string} name - The domain name to retrieve information for.
	 * @returns {Promise<DomainInfo>} A promise that resolves to an object containing the domain's address and contract.
	 */
	public async getDomain(name: string): Promise<DomainInfo>
	{
		return getDomain({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});
	}

	// Write Methods

	/**
	 * Accumulates internal tokens. Currently a placeholder method.
	 *
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async accumulateInternalTokens(): Promise<void>
	{
		return;
	}

	/**
	 * Initiates the creation of an auction transaction for a specified domain.
	 *
	 * @param {Object} params - The parameters required for the auction transaction.
	 * @param {string} params.name - The domain name to be auctioned.
	 * @param {number} params.amount - The bid amount for the auction.
	 * @param {string} params.address - The address associated with the auction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the auction.
	 * @throws {InvalidNameError} If the provided domain name is invalid.
	 * @throws {UserUTXONotFoundError} If no user UTXO is found for the transaction.
	 */
	public async createAuctionTransaction({
		name,
		amount,
		address,
	}: {
		name: string;
		amount: number;
		address: string;
	}): Promise<TransactionBuilder>
	{
		const utxos = await fetchCreateAuctionUtxos({
			amount,
			address,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			category: this.category,
		});

		return createAuctionTransaction({ name, amount, address, networkProvider: this.networkProvider, contracts: this.contracts, category: this.category, utxos });
	}

	/**
	 * Creates a bid transaction for a specified domain auction.
	 *
	 * @param {Object} params - The parameters for the bid transaction.
	 * @param {string} params.name - The domain name being bid on.
	 * @param {number} params.amount - The bid amount.
	 * @param {string} params.address - The address placing the bid.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the bid.
	 */
	public async createBidTransaction({ name, amount, address }: { name: string; amount: number; address: string }): Promise<TransactionBuilder>
	{
		const utxos = await fetchBidUtxos({
			name,
			category: this.category,
			address,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			amount,
		});

		return createBidTransaction({
			name,
			amount,
			address,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			minBidIncreasePercentage: this.minBidIncreasePercentage,
			utxos,
		});
	}

	/**
	 * Creates a transaction to claim a domain.
	 *
	 * @param {Object} params - The parameters for claiming the domain.
	 * @param {string} params.name - The domain name to claim.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for claiming the domain.
	 */
	public async createClaimDomainTransaction({ name }: { name: string }): Promise<TransactionBuilder>
	{
		return createClaimDomainTransaction({
			category: this.category,
			registryContract: this.contracts.Registry,
			domainFactoryContract: this.contracts.DomainFactory,
			inactivityExpiryTime: this.inactivityExpiryTime,
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
			minWaitTime: this.minWaitTime,
			name,
			networkProvider: this.networkProvider,
			options: this.options,
			platformFeeAddress: this.platformFeeAddress,
		});
	}

	/**
	 * Proves that an auction name is invalid. Currently logs the name.
	 *
	 * @param {string} name - The auction name to validate.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeInvalidAuctionName({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{
		const utxos = await fetchInvalidNameGuardUtxos({
			name,
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
		});

		return penalizeInvalidAuctionName({
			name,
			rewardTo,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			utxos,
		});
	}

	/**
	 * Proves that an auction is a duplicate. Currently logs the name.
	 *
	 * @param {string} name - The auction name to check for duplication.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeDuplicateAuction({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{
		const utxos = await fetchDuplicateAuctionGuardUtxos({
			name,
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			options: this.options,
		});

		return penalizeDuplicateAuction({
			rewardTo,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			utxos,
		});
	}

	/**
	 * Proves that an auction is illegal. Currently logs the name.
	 *
	 * @param {string} name - The auction name to check for legality.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeIllegalAuction({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{
		const utxos = await fetchIllegalAuctionGuardUtxos({
			name,
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		return penalizeIllegalAuction({
			name,
			rewardTo,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			utxos,
		});
	}

	/**
	 * Creates a transaction to add a record to a domain.
	 *
	 * @param {Object} params - The parameters for the record transaction.
	 * @param {string} params.name - The domain name to which the record will be added.
	 * @param {string} params.record - The record data to add.
	 * @param {string} params.address - The address associated with the record.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the record transaction.
	 */
	public async createRecordsTransaction({ name, records, address }: { name: string; records: string[]; address: string }): Promise<TransactionBuilder>
	{
		const domainContract = constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		const utxos = await fetchRecordsUtxos({
			name,
			category: this.category,
			domainContract,
			address,
			networkProvider: this.networkProvider,
		});

		return createRecordsTransaction({
			records,
			address,
			domainContract,
			networkProvider: this.networkProvider,
			utxos,
		});
	}
}
