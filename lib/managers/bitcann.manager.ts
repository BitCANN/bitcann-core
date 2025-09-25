import type {
	NetworkProvider,
} from 'cashscript';
import {
	Contract,
	ElectrumNetworkProvider,
	TransactionBuilder,
} from 'cashscript';
import { chaingraphURL } from '../config.js';
import type {
	AccumulateParams,
	ActiveAuctionsResponse,
	CreateAuctionParams,
	CreateBidParams,
	CreateClaimNameParams,
	CreateRecordsParams,
	GetNameParams,
	GetRecordsParams,
	LookupAddressParams,
	LookupAddressResponse,
	ManagerConfig,
	NameInfo,
	PastAuctionResponse,
	PenaliseDuplicateAuctionParams,
	PenaliseIllegalAuctionParams,
	PenalizeInvalidNameParams,
	ResolveNameParams,
} from '../interfaces/index.js';
import { NameService } from '../services/name.service.js';
import { RegistryService } from '../services/registry.service.js';
import { AccumulationTransactionBuilder } from '../transactions/accumulation.builder.js';
import { AuctionTransactionBuilder } from '../transactions/auction.builder.js';
import { BidTransactionBuilder } from '../transactions/bid.builder.js';
import { ClaimNameTransactionBuilder } from '../transactions/claim.builder.js';
import { NameTransactionBuilder } from '../transactions/name.builder.js';
import { PenalisationTransactionBuilder } from '../transactions/penalisation.builder.js';
import { constructContracts } from '../util/contract.js';
import type { ParsedRecords } from '../util/parser.js';
import { UtxoManager } from './utxo.manager.js';


export class BitcannManager
{
	/**
	 * The category of the name.
	 */
	private category: string;
	/**
	 * The TLD of the name.
	 */
	private tld: string;
	/**
	 * The genesis creator incentive address for the protocol.
	 */
	private genesisIncentiveAddress: string;
	/**
	 * The Chaingraph URL to use for lookups.
	 */
	private chaingraphUrl: string;
	/**
	 * The minimum starting bid for the auction.
	 */
	private minStartingBid: number;
	/**
	 * The minimum bid increase percentage for the auction.
	 */
	private minBidIncreasePercentage: number;
	/**
	 * The inactivity expiry time before the name can be considered expired.
	 */
	private inactivityExpiryTime: number;
	/**
	 * The minimum wait time for the auction.
	 */
	private minWaitTime: number;
	/**
	 * The network provider to use for BCH network operations.
	 */
	private networkProvider: NetworkProvider;
	/**
	 * The contracts in the BitCANN system.
	 */
	public contracts: Record<string, Contract>;
	/**
	 * The UTXO manager for builders and
	 */
	private utxoManager: UtxoManager;
	/**
	 * The builder for accumulation transactions.
	 */
	private accumulationTransactionBuilder: AccumulationTransactionBuilder;
	/**
	 * The builder for auction transactions.
	 */
	private auctionTransactionBuilder: AuctionTransactionBuilder;
	/**
	 * The builder for bid transactions.
	 */
	private bidTransactionBuilder: BidTransactionBuilder;
	/**
	 * The builder for claim name transactions.
	 */
	private claimNameTransactionBuilder: ClaimNameTransactionBuilder;
	/**
	 * The builder for records transactions.
	 */
	private nameTransactionBuilder: NameTransactionBuilder;
	/**
	 * The builder for penalisation transactions.
	 */
	private penalisationTransactionBuilder: PenalisationTransactionBuilder;
	/**
	 * The service for name operations.
	 */
	private nameService: NameService;
	/**
	 * The service for registry operations.
	 */
	private registryService: RegistryService;

	/**
	 * Constructs a new BitcannManager.
	 *
	 * @param {ManagerConfig} config - The configuration for the manager.
	 */
	constructor(config: ManagerConfig)
	{
		this.category = config.category;
		this.minStartingBid = config.minStartingBid;
		this.minBidIncreasePercentage = config.minBidIncreasePercentage;
		this.inactivityExpiryTime = config.inactivityExpiryTime;
		this.minWaitTime = config.minWaitTime;
		this.tld = config.tld;
		this.genesisIncentiveAddress = config.genesisIncentiveAddress;
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

		this.contracts = constructContracts({ genesisIncentiveAddress: this.genesisIncentiveAddress, category: this.category, provider: this.networkProvider, tld: this.tld });

		this.utxoManager = new UtxoManager(this.networkProvider, this.contracts, this.category, this.tld);

		this.accumulationTransactionBuilder = new AccumulationTransactionBuilder(this.networkProvider, this.contracts, this.category, this.utxoManager);
		this.claimNameTransactionBuilder = new ClaimNameTransactionBuilder(this.networkProvider, this.utxoManager, this.contracts, this.category, this.tld, this.minWaitTime, this.genesisIncentiveAddress);
		this.auctionTransactionBuilder = new AuctionTransactionBuilder(this.networkProvider, this.contracts, this.utxoManager, this.minStartingBid);
		this.bidTransactionBuilder = new BidTransactionBuilder(this.networkProvider, this.contracts, this.utxoManager, this.minBidIncreasePercentage, this.category);
		this.nameTransactionBuilder = new NameTransactionBuilder(this.networkProvider, this.utxoManager, this.category, this.tld, this.inactivityExpiryTime);
		this.penalisationTransactionBuilder = new PenalisationTransactionBuilder(this.networkProvider, this.contracts, this.category, this.tld, this.minWaitTime, this.utxoManager);
		this.nameService = new NameService(this.networkProvider, this.contracts, this.category, this.tld, this.chaingraphUrl);
		this.registryService = new RegistryService(this.networkProvider, this.contracts, this.category);
	}

	/**
	 * @description Fetches the records for a given name.
	 * @param {GetRecordsParams} params - The parameters for fetching name records.
	 * @param {string} params.name - The name for which records are to be fetched.
	 * @returns {Promise<ParsedRecords>} A promise that resolves to an object containing an array of name records.
	 */
	public async getRecords(params: GetRecordsParams): Promise<ParsedRecords>
	{
		return this.nameService.getRecords(params);
	}

	/**
	 * @description Fetches all active auctions.
	 * @returns {Promise<ActiveAuctionsResponse[]>} A promise that resolves to an array of UTXOs representing active auctions.
	 */
	public async getActiveAuctions(): Promise<ActiveAuctionsResponse[]>
	{
		return this.registryService.getActiveAuctions();
	}

	/**
	 * @description Retrieves the past auctions.
	 * @returns {Promise<PastAuctionResponse[]>} A promise that resolves to an array of transaction history objects,
	 * each containing a transaction hex and a name.
	 */
	public async getPastAuctions(): Promise<PastAuctionResponse[]>
	{
		return this.registryService.getPastAuctions();
	}

	/**
	 * @description Retrieves detailed information about a specific name.
	 * @param {GetNameParams} params - The parameters for retrieving name information.
	 * @param {string} params.name - The name to retrieve information for.
	 * @returns {Promise<NameInfo>} A promise that resolves to an object containing the name's address and contract.
	 */
	public async getName(params: GetNameParams): Promise<NameInfo>
	{
		return this.nameService.getName(params);
	}

	/**
	 * @description Resolves a name to its associated address. This function uses either the Electrum or Chaingraph method to resolve the name based on the provided parameters.
	 * @param {ResolveNameParams} params - The parameters for resolving the name.
	 * @param {string} params.name - The name to resolve.
	 * @param {boolean} [params.useElectrum] - Whether to use the Electrum method for resolution.
	 * @param {boolean} [params.useChaingraph] - Whether to use the Chaingraph method for resolution.
	 * @returns {Promise<string>} A promise that resolves to the address associated with the name.
	 */
	public async resolveName(params: ResolveNameParams): Promise<string>
	{
		return this.nameService.resolveNameCore(params);
	}

	/**
	 * @description Looks up all names associated with a given address. This function queries the blockchain to find all UTXOs linked to the specified address
	 * and filters them to extract the names owned by the address.
	 * @param {LookupAddressParams} params - The parameters for the lookup operation.
	 * @param {string} params.address - The address to look up names for.
	 * @returns {Promise<LookupAddressResponse>} A promise that resolves to an object containing an array of names owned by the address.
	 */
	public async lookupAddress(params: LookupAddressParams): Promise<LookupAddressResponse>
	{
		return this.nameService.lookupAddress(params);
	}

	/**
	 * @description Initiates the creation of an auction transaction for a specified name.
	 * @param {CreateAuctionParams} params - The parameters required for the auction transaction.
	 * @param {string} params.name - The name to be auctioned.
	 * @param {number} params.amount - The initial amount for the auction.
	 * @param {string} params.address - The p2pkh address interested in the auction.
	 * @param {FetchAuctionUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object representing the auction transaction.
	 */
	public async buildAuctionTransaction(params: CreateAuctionParams): Promise<TransactionBuilder>
	{
		return this.auctionTransactionBuilder.build(params);
	}

	/**
	 * @description Initiates the creation of a bid transaction for a specified name auction.
	 * @param {CreateBidParams} params - The parameters required for the bid transaction.
	 * @param {string} params.name - The name on which the bid is being placed.
	 * @param {number} params.amount - The amount of the bid.
	 * @param {string} params.address - The address of the bidder.
	 * @param {FetchBidUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object representing the bid transaction.
	 */
	public async buildBidTransaction(params: CreateBidParams): Promise<TransactionBuilder>
	{
		return this.bidTransactionBuilder.build(params);
	}

	/**
	 * @description Creates a transaction to claim a name.
	 * @param {CreateClaimNameParams} params - The parameters for claiming the name.
	 * @param {string} params.name - The name to claim.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for claiming the name.
	 */
	public async buildClaimNameTransaction(params: CreateClaimNameParams): Promise<TransactionBuilder>
	{
		return this.claimNameTransactionBuilder.build(params);
	}

	/**
	 * @description Initiates a transaction to penalize an auction with an invalid name.
	 * @param {PenalizeInvalidNameParams} params - The parameters required to penalize an invalid auction name.
	 * @param {string} params.name - The auction name to validate.
	 * @param {string} params.rewardTo - The address to reward for identifying the invalid name.
	 * @param {FetchInvalidNameGuardUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	public async buildPenalizeInvalidAuctionNameTransaction(params: PenalizeInvalidNameParams): Promise<TransactionBuilder>
	{
		return this.penalisationTransactionBuilder.buildPenaliseInvalidAuctionNameTransaction(params);
	}

	/**
	 * @description Initiates a transaction to penalize a duplicate auction.
	 * @param {PenaliseDuplicateAuctionParams} params - The parameters required to penalize a duplicate auction.
	 * @param {string} params.name - The auction name to check for duplication.
	 * @param {string} params.rewardTo - The address to reward for identifying the duplicate auction.
	 * @param {FetchDuplicateAuctionGuardUtxosResponse} [params.utxos] - Optional UTXOs for the transaction; if not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	public async buildPenalizeDuplicateAuctionTransaction(params: PenaliseDuplicateAuctionParams): Promise<TransactionBuilder>
	{
		return this.penalisationTransactionBuilder.buildPenaliseDuplicateAuctionTransaction(params);
	}

	/**
	 * @description Proves that an auction is illegal. Currently logs the name.
	 * @param {PenaliseIllegalAuctionParams} params - The parameters required to penalize an illegal auction.
	 * @param {string} name - The auction name to check for legality.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async buildPenalizeIllegalAuctionTransaction(params: PenaliseIllegalAuctionParams): Promise<TransactionBuilder>
	{
		return this.penalisationTransactionBuilder.buildPenaliseIllegalAuctionTransaction(params);
	}

	/**
	 * @description Initiates the creation of a transaction to add records to a specified name.
	 * @param {CreateRecordsParams} params - The parameters required for the record transaction.
	 * @param {string} params.name - The name of the name where the records will be added.
	 * @param {string[]} params.records - An array of record data to be added to the name.
	 * @param {string} params.address - The blockchain address associated with the records.
	 * @param {FetchRecordsUtxosResponse} [params.utxos] - Optional UTXOs required for the transaction. If not provided, they will be fetched.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder instance for the record transaction.
	 */
	public async buildRecordsTransaction(params: CreateRecordsParams): Promise<TransactionBuilder>
	{
		return this.nameTransactionBuilder.build(params);
	}

	/**
	 * @description Initiates the accumulation of tokens from a thread to the minting UTXO.
	 * This method facilitates the transfer of tokens from a specified thread to a minting UTXO
	 * by constructing a transaction using the provided or fetched UTXOs. If the UTXOs are not
	 * provided, they will be fetched using the network provider and contracts associated with
	 * the current instance.
	 *
	 * @param {AccumulateParams} params - The parameters required for the accumulation process.
	 * @param {string} params.address - The blockchain address associated with the accumulation.
	 * @param {AccumulationUtxos} [params.utxos] - Optional UTXOs required for the transaction.
	 * If not provided, they will be fetched automatically.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object
	 * representing the constructed transaction for the accumulation process.
	 */
	public async buildAccumulateTokensTransaction(params: AccumulateParams): Promise<TransactionBuilder>
	{
		return this.accumulationTransactionBuilder.build(params);
	}
}
