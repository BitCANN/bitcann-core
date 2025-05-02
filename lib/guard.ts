import type { NetworkProvider } from 'cashscript';
import type { GuardConfig } from './interfaces/guard.js';

/**
 * The GuardManager class is responsible for managing guard-related operations,
 * including creating guard transactions and retrieving guard data.
 */
export class GuardManager 
{
	private category: string;
	private networkProvider: NetworkProvider;
	private contracts: Record<string, any>;

	/**
	 * Constructs a new GuardManager instance with the specified configuration parameters.
	 * 
	 * @param {GuardConfig} params - The configuration parameters for the guard manager.
	 */
	constructor(params: GuardConfig) 
	{
		this.category = params.category;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
	}


	/**
	 * Proves that an auction name is invalid. Currently logs the name.
	 * 
	 * @param {string} name - The auction name to validate.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeInvalidAuctionName(name: string): Promise<void>
	{
		console.log(name);
	
		return;
	}

	public async penalizeDuplicateAuction(name: string): Promise<void>
	{
		console.log(name);
	
		return;
	}
		
	public async penalizeIllegalAuction(name: string): Promise<void>
	{
		console.log(name);
	
		return;
	}
		
}