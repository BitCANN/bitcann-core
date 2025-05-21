import { Contract, type NetworkProvider, type Utxo } from 'cashscript';

/**
 * Parameters required to fetch UTXOs for accumulation.
 */
export interface FetchAccumulationUtxosParams
{
	/** Network provider for BCH network operations. */
	networkProvider: NetworkProvider;
	/** Contracts involved in the accumulation process. */
	contracts: Record<string, Contract>;
	/** The token category. */
	category: string;
	/** The address associated with the accumulation. */
	address: string;
}

/**
 * Core parameters required for the accumulation process.
 */
export interface AccumulateCoreParams
{
	/** Network provider for BCH network operations. */
	networkProvider: NetworkProvider;
	/** The registry contract used in the accumulation. */
	registryContract: Contract;
	/** The accumulator contract used in the accumulation. */
	accumulatorContract: Contract;
	/** UTXOs required for the accumulation process. */
	utxos: FetchAccumulationUtxosResponse;
	/** The address associated with the accumulation. */
	address: string;
}

/**
 * Parameters required for the accumulation process.
 */
export interface AccumulateParams
{
	/** The address associated with the accumulation. */
	address: string;
	/** UTXOs required for the accumulation process. */
	utxos?: FetchAccumulationUtxosResponse;
}

/**
 * Response structure for fetched UTXOs used in accumulation.
 */
export interface FetchAccumulationUtxosResponse
{
	/** UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
	/** UTXO for the registration counter. */
	registrationCounterUTXO: Utxo;
	/** UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** UTXO for the thread with token. */
	threadWithTokenUTXO: Utxo;
	/** UTXO for the user. */
	userUTXO: Utxo;
}
