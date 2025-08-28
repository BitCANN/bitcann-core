import type {
	AddressType,
	NetworkProvider,
} from 'cashscript';
import {
	Contract,
	ElectrumNetworkProvider,
	TransactionBuilder,
} from 'cashscript';
import {
	accumulate,
	createAuctionTransactionCore,
	createBidTransactionCore,
	createClaimNameTransactionCore,
	createRecordsTransaction,
	fetchAccumulationUtxos,
	fetchAuctionUtxos,
	fetchBidUtxos,
	fetchClaimNameUtxos,
	fetchDuplicateAuctionGuardUtxos,
	fetchIllegalAuctionGuardUtxos,
	fetchInvalidNameGuardUtxos,
	fetchRecords,
	fetchRecordsUtxos,
	getAuctions,
	getName,
	getPastAuctions,
	lookupAddressCore,
	penalizeDuplicateAuction,
	penalizeIllegalAuction,
	penalizeInvalidAuctionName,
} from './functions/index.js';
import {
	constructContracts,
	constructNameContract,
} from './util/index.js';
import type {
	AccumulateParams,
	CreateAuctionParams,
	CreateBidParams,
	CreateClaimNameCoreParams,
	CreateRecordsParams,
	NameInfo,
	GetAuctionsResponse,
	GetRecordsParams,
	LookupAddressParams,
	ManagerConfig,
	PastAuctionResponse,
	PenaliseDuplicateAuctionParams,
	PenaliseIllegalAuctionParams,
	PenalizeInvalidNameParams,
	ResolveNameParams,
} from './interfaces/index.js';
import { LookupAddressCoreResponse } from './interfaces/resolver.js';
import { resolveNameCore } from './functions/resolver.js';
import { chaingraphURL } from './config.js';
import type { ParsedRecordsInterface } from './util/parser.js';


export class BitcannManager
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
	public chaingraphUrl: string;

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
		this.chaingraphUrl = config.chaingraphUrl || chaingraphURL;
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

	// *********************************************************************************
	// Read Methods
	// *********************************************************************************

	/**
	 * Fetches the name records for a given name.
	 *
	 * This method interacts with the blockchain to retrieve records associated with the specified name.
	 * It allows the option to retain duplicate records if desired.
	 *
	 * @param {GetRecordsParams} params - The parameters for fetching name records.
	 * @param {string} params.name - The name for which records are to be fetched.
	 * @returns {Promise<GetRecordsResponse>} A promise that resolves to an object containing an array of name records.
	 */
	public async getRecords({ name }: GetRecordsParams): Promise<ParsedRecordsInterface>
	{
		return fetchRecords({
			name,
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
	public async getAuctions(): Promise<GetAuctionsResponse[]>
	{
		return getAuctions({
			category: this.category,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
		});
	}

	/**
	 * Retrieves the transaction history.
	 *
	 * @returns {Promise<PastAuctionResponse[]>} A promise that resolves to an array of transaction history objects,
	 * each containing a transaction hex and a name.
	 */
	public async getHistory(): Promise<PastAuctionResponse[]>
	{
		return getPastAuctions({
			category: this.category,
			Factory: this.contracts.Factory,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
		});
	}

	/**
	 * Retrieves detailed information about a specific name.
	 *
	 * @param {string} name - The name to retrieve information for.
	 * @returns {Promise<NameInfo>} A promise that resolves to an object containing the name's address and contract.
	 */
	public async getName(name: string): Promise<NameInfo>
	{
		return getName({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
			registryContract: this.contracts.Registry,
		});
	}

	/**
	 * Resolves a name to its associated address.
	 *
	 * This function uses either the Electrum or Chaingraph method to resolve the name
	 * based on the provided parameters.
	 *
	 * @param {ResolveNameParams} params - The parameters for resolving the name.
	 * @param {string} params.name - The name to resolve.
	 * @param {boolean} [params.useElectrum] - Whether to use the Electrum method for resolution.
	 * @param {boolean} [params.useChaingraph] - Whether to use the Chaingraph method for resolution.
	 * @returns {Promise<string>} A promise that resolves to the address associated with the name.
	 */
	public async resolveName({ name, useElectrum, useChaingraph }: ResolveNameParams): Promise<string>
	{
		return resolveNameCore({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
			useElectrum,
			useChaingraph,
		});
	}

	/**
	 * Looks up all names associated with a given address.
	 *
	 * This function queries the blockchain to find all UTXOs linked to the specified address
	 * and filters them to extract the names owned by the address. 
	 *
	 * @param {LookupAddressParams} params - The parameters for the lookup operation.
	 * @param {string} params.address - The address to look up names for.
	 * @returns {Promise<LookupAddressCoreResponse>} A promise that resolves to an object containing an array of names owned by the address.
	 */
	public async lookupAddress({ address }: LookupAddressParams): Promise<LookupAddressCoreResponse>
	{
		return lookupAddressCore({
			address,
			category: this.category,
			networkProvider: this.networkProvider,
		});
	}

	// *********************************************************************************
	// Write Methods
	// *********************************************************************************

	/**
	 * Initiates the creation of an auction transaction for a specified name.
	 *
	 * @param {CreateAuctionParams} params - The parameters required for the auction transaction.
	 * @param {string} params.name - The name to be auctioned.
	 * @param {number} params.amount - The initial amount for the auction.
	 * @param {string} params.address - The address associated with the auction.
	 * @param {FetchAuctionUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object representing the auction transaction.
	 * @throws {InvalidNameError} If the provided name is invalid.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for the transaction.
	 */
	public async createAuctionTransaction({
		name,
		amount,
		address,
		utxos,
	}: CreateAuctionParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchAuctionUtxos({
				amount,
				address,
				networkProvider: this.networkProvider,
				contracts: this.contracts,
				category: this.category,
			});
		}

		return createAuctionTransactionCore({ name, amount, address, networkProvider: this.networkProvider, contracts: this.contracts, category: this.category, utxos });
	}

	/**
	 * Initiates the creation of a bid transaction for a specified name auction.
	 *
	 * @param {CreateBidParams} params - The parameters required for the bid transaction.
	 * @param {string} params.name - The name on which the bid is being placed.
	 * @param {number} params.amount - The amount of the bid.
	 * @param {string} params.address - The address of the bidder.
	 * @param {FetchBidUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object representing the bid transaction.
	 * @throws {InvalidBidAmountError} If the bid amount is less than the minimum required increase.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
	 */
	public async createBidTransaction({ name, amount, address, utxos }: CreateBidParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchBidUtxos({
				name,
				category: this.category,
				address,
				networkProvider: this.networkProvider,
				contracts: this.contracts,
				amount,
			});
		}

		return createBidTransactionCore({
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
	 * Creates a transaction to claim a name.
	 *
	 * @param {CreateClaimNameCoreParams} params - The parameters for claiming the name.
	 * @param {string} params.name - The name to claim.
	 * @param {fetchClaimNameUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for claiming the name.
	 * @throws {NameMintingUTXONotFoundError} If no suitable UTXO is found for minting the name.
	 * @throws {ThreadWithTokenUTXONotFoundError} If no suitable UTXO is found for the thread with token.
	 */
	public async createClaimNameTransaction({ name, utxos }: CreateClaimNameCoreParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchClaimNameUtxos({
				category: this.category,
				registryContract: this.contracts.Registry,
				FactoryContract: this.contracts.Factory,
				name,
				networkProvider: this.networkProvider,
			});
		}

		return createClaimNameTransactionCore({
			category: this.category,
			registryContract: this.contracts.Registry,
			FactoryContract: this.contracts.Factory,
			inactivityExpiryTime: this.inactivityExpiryTime,
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
			minWaitTime: this.minWaitTime,
			name,
			options: this.options,
			platformFeeAddress: this.platformFeeAddress,
			utxos,
		});
	}

	/**
	 * Initiates a transaction to penalize an auction with an invalid name.
	 *
	 * @param {PenalizeInvalidNameParams} params - The parameters required to penalize an invalid auction name.
	 * @param {string} params.name - The auction name to validate.
	 * @param {string} params.rewardTo - The address to reward for identifying the invalid name.
	 * @param {FetchInvalidNameGuardUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	public async penalizeInvalidAuctionName({ name, rewardTo, utxos }: PenalizeInvalidNameParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchInvalidNameGuardUtxos({
				name,
				category: this.category,
				networkProvider: this.networkProvider,
				contracts: this.contracts,
			});
		}

		return penalizeInvalidAuctionName({
			name,
			rewardTo,
			networkProvider: this.networkProvider,
			contracts: this.contracts,
			utxos,
		});
	}

	/**
	 * Initiates a transaction to penalize a duplicate auction.
	 *
	 * @param {PenaliseDuplicateAuctionParams} params - The parameters required to penalize a duplicate auction.
	 * @param {string} params.name - The auction name to check for duplication.
	 * @param {string} params.rewardTo - The address to reward for identifying the duplicate auction.
	 * @param {FetchDuplicateAuctionGuardUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	public async penalizeDuplicateAuction({ name, rewardTo, utxos }: PenaliseDuplicateAuctionParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchDuplicateAuctionGuardUtxos({
				name,
				category: this.category,
				contracts: this.contracts,
				options: this.options,
			});
		}

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
	public async penalizeIllegalAuction({ name, rewardTo, utxos }: PenaliseIllegalAuctionParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchIllegalAuctionGuardUtxos({
				name,
				category: this.category,
				contracts: this.contracts,
				inactivityExpiryTime: this.inactivityExpiryTime,
				options: this.options,
			});
		}

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
	 * Initiates the creation of a transaction to add records to a specified name.
	 *
	 * @param {CreateRecordsParams} params - The parameters required for the record transaction.
	 * @param {string} params.name - The name of the name where the records will be added.
	 * @param {string[]} params.records - An array of record data to be added to the name.
	 * @param {string} params.address - The blockchain address associated with the records.
	 * @param {FetchRecordsUtxosResponse} [params.utxos] - Optional UTXOs required for the transaction. If not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder instance for the record transaction.
	 */
	public async createRecordsTransaction({ name, records, address, utxos }: CreateRecordsParams): Promise<TransactionBuilder>
	{
		const nameContract = constructNameContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		if(!utxos)
		{
			utxos = await fetchRecordsUtxos({
				name,
				category: this.category,
				nameContract,
				address,
				networkProvider: this.networkProvider,
			});
		}

		return createRecordsTransaction({
			records,
			address,
			nameContract,
			networkProvider: this.networkProvider,
			utxos,
		});
	}

	/**
	 * Initiates the accumulation of tokens from a thread to the minting UTXO.
	 *
	 * This method facilitates the transfer of tokens from a specified thread to a minting UTXO
	 * by constructing a transaction using the provided or fetched UTXOs. If the UTXOs are not
	 * provided, they will be fetched using the network provider and contracts associated with
	 * the current instance.
	 *
	 * @param {AccumulateParams} params - The parameters required for the accumulation process.
	 * @param {string} params.address - The blockchain address associated with the accumulation.
	 * @param {FetchAccumulationUtxosResponse} [params.utxos] - Optional UTXOs required for the transaction.
	 * If not provided, they will be fetched automatically.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object
	 * representing the constructed transaction for the accumulation process.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for the transaction.
	 */
	public async accumulateTokens({ address, utxos }: AccumulateParams): Promise<TransactionBuilder>
	{
		if(!utxos)
		{
			utxos = await fetchAccumulationUtxos({
				networkProvider: this.networkProvider,
				contracts: this.contracts,
				category: this.category,
				address,
			});
		}

		return accumulate({
			networkProvider: this.networkProvider,
			registryContract: this.contracts.Registry,
			accumulatorContract: this.contracts.Accumulator,
			utxos,
			address,
		});
	}
}
