import { DomainStatusType } from './interfaces/domain';
import { ManagerConfig } from './interfaces/common';
import {
	NetworkProvider,
	ElectrumNetworkProvider,
	Contract,
	AddressType,
} from 'cashscript';
import { constructContracts } from './util/contracts-util';

export class BitCANNManager 
{
	// Config to build the contracts in the BitCANN system.
	public category: string;
	public minStartingBid: number;
	public minBidIncreasePercentage: number;
	public inactivityExpiryTime: number;
	public minWaitTime: number;
	public maxPlatformFeePercentage: number;

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
		const options = { provider: this.networkProvider, addressType: 'p2sh32' as AddressType };

		this.contracts = constructContracts({
			options,
			category: this.category,
			minStartingBid: this.minStartingBid,
			minBidIncreasePercentage: this.minBidIncreasePercentage,
			minWaitTime: this.minWaitTime,
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
		});
	}

	// Read Methods

	/**
	 * Retrieves the records for a given domain.
	 * 
	 * @param {string} domain - The domain name to retrieve records for.
	 * @returns {Promise<any>} A promise that resolves to the domain records.
	 */
	public async getRecords(domain: string): Promise<any> 
	{
		console.log(domain);

		// Construct the domain contract
		// Fetch the utxos
		return {};
	}

	public async getDomains({ status }: { status: DomainStatusType }): Promise<void>
	{
		console.log(status);

		return;
	}

	public async getDomain(name: string): Promise<void>
	{
		console.log(name);
		
		return;
	}

	// Write Methods

	public async accumulateInternalTokens(): Promise<void>
	{
		return;
	}

	public async createAuction(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async createBid(name: string, amount: number): Promise<void>
	{
		console.log(name, amount);

		return;
	}

	public async claimDomain(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveInvalidAuctionName(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveDuplicateAuction(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveIllegalAuction(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

}

export const createManager = function(config: ManagerConfig): BitCANNManager 
{
	return new BitCANNManager(config);
};