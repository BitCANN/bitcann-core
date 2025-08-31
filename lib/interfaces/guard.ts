import type { AddressType, NetworkProvider, Utxo } from 'cashscript';

/**
 * Parameters for fetching UTXOs related to duplicate auction guards.
 */
export interface FetchDuplicateAuctionGuardUtxosParams
{
	/** The name of the auction. */
	name: string;
	/** The category of the auction. */
	category: string;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
	/** Additional options including provider and address type. */
	options: { provider: NetworkProvider; addressType: AddressType };
}

/**
 * Response structure for UTXOs related to duplicate auction guards.
 */
export interface FetchDuplicateAuctionGuardUtxosResponse
{
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The UTXO for a valid running auction. */
	runningValidAuctionUTXO: Utxo;
	/** The UTXO for an invalid running auction. */
	runningInValidAuctionUTXO: Utxo;
}

/**
 * Parameters for fetching UTXOs related to illegal auction guards.
 */
export interface FetchIllegalAuctionGuardUtxosParams
{
	/** The name of the auction. */
	name: string;
	/** The category of the auction. */
	category: string;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
	/** The TLD of the auction. */
	tld: string;
	/** Additional options including provider and address type. */
	options: { provider: NetworkProvider; addressType: AddressType };
}

/**
 * Response structure for UTXOs related to illegal auction guards.
 */
export interface FetchIllegalAuctionGuardUtxosResponse
{
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
	/** The UTXO for external authorization. */
	externalAuthUTXO: Utxo;
}

/**
 * Parameters for fetching UTXOs related to invalid name auction guards.
 */
export interface FetchInvalidNameGuardUtxosParams
{
	/** The name of the auction. */
	name: string;
	/** The category of the auction. */
	category: string;
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
}

/**
 * Response structure for UTXOs related to invalid name auction guards.
 */
export interface FetchInvalidNameGuardUtxosResponse
{
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
}

/**
 * Parameters for penalizing a duplicate auction.
 */
export interface PenaliseDuplicateAuctionParams
{
	/** The name of the auction. */
	name: string;
	/** The address to reward for identifying the duplicate auction. */
	rewardTo: string;
	/** The UTXOs required for the transaction. */
	utxos?: FetchDuplicateAuctionGuardUtxosResponse;
}

/**
 * Core parameters for penalizing a duplicate auction.
 */
export interface PenaliseDuplicateAuctionCoreParams
{
	/** The address to reward for identifying the duplicate auction. */
	rewardTo: string;
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
	/** The UTXOs required for the transaction. */
	utxos: FetchDuplicateAuctionGuardUtxosResponse;
}

/**
 * Parameters for penalizing an illegal auction.
 */
export interface PenaliseIllegalAuctionParams
{
	/** The name of the auction. */
	name: string;
	/** The address to reward for identifying the illegal auction. */
	rewardTo: string;
	/** The UTXOs required for the transaction. */
	utxos?: FetchIllegalAuctionGuardUtxosResponse;
}

/**
 * Core parameters for penalizing an illegal auction.
 */
export interface PenaliseIllegalAuctionCoreParams
{
	/** The name of the auction. */
	name: string;
	/** The address to reward for identifying the illegal auction. */
	rewardTo: string;
	/** The category of the auction. */
	category: string;
	/** The TLD of the auction. */
	tld: string;
	/** Additional options including provider and address type. */
	options: { provider: NetworkProvider; addressType: AddressType };
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
	/** The UTXOs required for the transaction. */
	utxos: FetchIllegalAuctionGuardUtxosResponse;
}

/**
 * Parameters for penalizing an auction with an invalid name.
 */
export interface PenalizeInvalidNameParams
{
	/** The name of the auction. */
	name: string;
	/** The address to reward for identifying the invalid name. */
	rewardTo: string;
	/** Optional UTXOs for the transaction; if not provided, they will be fetched. */
	utxos?: FetchInvalidNameGuardUtxosResponse;
}

/**
 * Core parameters for penalizing an auction with an invalid name.
 */
export interface PenalizeInvalidNameCoreParams
{
	/** The name of the auction. */
	name: string;
	/** The address to reward for identifying the invalid name. */
	rewardTo: string;
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contracts involved in the auction. */
	contracts: Record<string, any>;
	/** The UTXOs required for the transaction. */
	utxos: FetchInvalidNameGuardUtxosResponse;
}