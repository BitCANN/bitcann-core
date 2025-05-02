import type { NetworkProvider, AddressType, Utxo } from 'cashscript';
import { Contract, ElectrumNetworkProvider, TransactionBuilder } from 'cashscript';

import type { ManagerConfig } from './interfaces/common.js';
import { DomainStatusType } from './interfaces/domain.js';
import { AuctionManager } from './auction.js';
import { BidManager } from './bid.js';
import { constructContracts } from './util/contract.js';
import { DomainManager } from './domain.js';
import { GuardManager } from './guard.js';


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

	// Managers for handling specific operations
	private auctionManager: AuctionManager;
	private bidManager: BidManager;
	private domainManager: DomainManager;
	private guardManager: GuardManager;

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

		// Initialize the managers
		this.auctionManager = new AuctionManager({
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
		});

		this.bidManager = new BidManager({
			category: this.category,
			minBidIncreasePercentage: this.minBidIncreasePercentage,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
		});

		this.domainManager = new DomainManager({
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			inactivityExpiryTime: this.inactivityExpiryTime,
			platformFeeAddress: this.platformFeeAddress || '',
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
			minWaitTime: this.minWaitTime,
			options: this.options,
		});

		this.guardManager = new GuardManager({
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			options: {
				platformFeeAddress: this.platformFeeAddress || '',
				maxPlatformFeePercentage: this.maxPlatformFeePercentage,
			},
		});
	}

	// Read Methods

	/**
	 * Retrieves the records associated with a specified domain.
	 * 
	 * @param {string} name - The domain name for which to retrieve records.
	 * @returns {Promise<string[]>} A promise that resolves to an array of domain records.
	 */
	public async getRecords(name: string): Promise<string[]> 
	{
		return this.domainManager.getRecords(name);
	}

	/**
	 * Fetches all active auctions.
	 * 
	 * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
	 */
	public async getAuctions(): Promise<Utxo[]>
	{
		return this.auctionManager.getAuctions();
	}

	/**
	 * Retrieves the transaction history.
	 * 
	 * @returns {Promise<{ transactionHex: string; name: string }[]>} A promise that resolves to an array of transaction history objects, each containing a transaction hex and a domain name.
	 */
	public async getHistory(): Promise<{ transactionHex: string; name: string }[]>
	{
		return this.auctionManager.getHistory();
	}

	/**
	 * Retrieves detailed information about a specific domain.
	 * 
	 * @param {string} fullName - The full domain name to retrieve information for.
	 * @returns {Promise<{ address: string; contract: Contract; utxos: Utxo[]; status: DomainStatusType }>} 
	 * A promise that resolves to an object containing the domain's address, contract, UTXOs, and status.
	 */
	public async getDomain(fullName: string): Promise<{ address: string; contract: Contract; utxos: Utxo[]; status: DomainStatusType }>
	{
		return this.domainManager.getDomain(fullName);
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
		return this.auctionManager.createAuctionTransaction({ name, amount, address });
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
		return this.bidManager.createBidTransaction({ name, amount, address });
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
		return this.domainManager.createClaimDomainTransaction({ name });
	}

	/**
	 * Proves that an auction name is invalid. Currently logs the name.
	 * 
	 * @param {string} name - The auction name to validate.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeInvalidAuctionName(name: string): Promise<void>
	{
		return this.guardManager.penalizeInvalidAuctionName(name);
	}

	/**
	 * Proves that an auction is a duplicate. Currently logs the name.
	 * 
	 * @param {string} name - The auction name to check for duplication.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeDuplicateAuction(name: string): Promise<void>
	{
		return this.guardManager.penalizeDuplicateAuction(name);
	}

	/**
	 * Proves that an auction is illegal. Currently logs the name.
	 * 
	 * @param {string} name - The auction name to check for legality.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeIllegalAuction(name: string): Promise<void>
	{
		return this.guardManager.penalizeIllegalAuction(name);
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
	public async createRecordTransaction({ name, record, address }: { name: string; record: string; address: string }): Promise<TransactionBuilder>
	{
		return this.domainManager.createRecordTransaction({ name, record, address });
	}
}
