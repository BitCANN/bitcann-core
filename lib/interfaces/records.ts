import type { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { AddressType, Contract, NetworkProvider, Utxo } from 'cashscript';

/**
 * Parameters required to retrieve domain records.
 */
export interface GetRecordsParams
{
	/** The domain name for which to retrieve records. */
	name: string;
	/** Optional flag to indicate if duplicate records should be retained. */
	keepDuplicates?: boolean;
}

/**
 * Response structure for retrieved domain records.
 */
export interface GetRecordsResponse
{
	/** An array of domain records. */
	records: string[];
}

/**
 * Parameters required to create records.
 */
export interface CreateRecordsParams
{
	/** The name associated with the records. */
	name: string;
	/** The address associated with the records. */
	address: string;
	/** List of records to be created. */
	records: string[];
	/** UTXOs required for the records creation process. */
	utxos?: FetchRecordsUtxosResponse;
}

/**
 * Core parameters required to create records.
 */
export interface CreateRecordsCoreParams
{
	/** The address associated with the records. */
	address: string;
	/** The contract related to the domain. */
	domainContract: Contract;
	/** Network provider for BCH network operations. */
	networkProvider: NetworkProvider;
	/** List of records to be created. */
	records: string[];
	/** UTXOs required for the records creation process. */
	utxos: FetchRecordsUtxosResponse;
}

/**
 * Parameters required to fetch records.
 */
export interface FetchRecordsParams
{
	/** The category of the records. */
	category: string;
	/** Electrum client for network operations. */
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
	/** Time after which inactivity leads to expiry. */
	inactivityExpiryTime: number;
	/** Flag to determine if duplicates should be kept. */
	keepDuplicates?: boolean;
	/** The name associated with the records. */
	name: string;
	options: {
		/** The type of address used. */
		addressType: AddressType;
		/** The network provider for blockchain interactions. */
		provider: NetworkProvider;
	};
}

/**
 * Parameters required to fetch UTXOs for records.
 */
export interface FetchRecordsUtxosParams
{
	/** The address associated with the records. */
	address: string;
	/** The category of the records. */
	category: string;
	/** The contract related to the domain. */
	domainContract: Contract;
	/** The name associated with the records. */
	name: string;
	/** Network provider for BCH network operations. */
	networkProvider: NetworkProvider;
}

/**
 * Result structure for fetched UTXOs used in records.
 */
export interface FetchRecordsUtxosResponse
{
	/** UTXO for funding purposes. */
	fundingUTXO: Utxo;
	/** UTXO for internal authorization NFT. */
	internalAuthNFTUTXO: Utxo;
	/** UTXO for ownership NFT. */
	ownershipNFTUTXO: Utxo;
}