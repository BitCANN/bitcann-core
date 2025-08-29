import type { AddressType, Contract, NetworkProvider, Utxo } from 'cashscript';

/**
 * Enum representing the various statuses a name can have.
 */
// eslint-disable-next-line no-shadow
export enum NameStatus
	{
	/** The name is currently registered. */
	REGISTERED = 'REGISTERED',
	/** The name is available for auction. */
	AUCTIONING = 'AUCTIONING',
	/** The name is available for registration. */
	AVAILABLE = 'AVAILABLE',
	/** The name status is invalid or unrecognized. */
	INVALID = 'INVALID',
}

/**
 * Parameters required to create a claim name transaction.
 */
export interface CreateClaimNameCoreParams
{
	/** The name. */
	name: string;
	/** The UTXOs to be used in the transaction, if already available. */
	utxos?: any;
}

/**
 * Parameters required to create a claim name transaction.
 */
export interface CreateClaimNameParams
{
	/** The token category. */
	category: string;
	/** The contract instance for the name factory. */
	FactoryContract: Contract;
	/** The inactivity expiry time for the name. */
	inactivityExpiryTime: number;
	/** The minimum wait time for the transaction. */
	minWaitTime: number;
	/** The name of the name. */
	name: string;
	/** Additional options for the name contract. */
	options: {
		/** The type of address used. */
		addressType: AddressType;
		/** The network provider for blockchain interactions. */
		provider: NetworkProvider;
	};
	/** The address to receive the creator incentive. */
	creatorIncentiveAddress: string;
	/** The contract instance for the registry. */
	registryContract: Contract;
	/** The UTXOs to be used in the transaction, if already available. */
	utxos: fetchClaimNameUtxosResponse;
}

/**
 * Information about a name.
 */
export interface NameInfo
{
	/** The address of the name. */
	address: string;
	/** The contract associated with the name. */
	contract: Contract;
	/** The status of the name. */
	status: NameStatus;
	/** The UTXOs associated with the name. */
	utxos?: Utxo[];
}

/**
 * Parameters required to fetch UTXOs for claiming a name.
 */
export interface fetchClaimNameUtxosParams
{
	/** The category of the name. */
	category: string;
	/** The contract instance for the name factory. */
	FactoryContract: Contract;
	/** The name of the name. */
	name: string;
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contract instance for the registry. */
	registryContract: Contract;
}

/**
 * Parameters required to get name details.
 */
export interface getNameParams
{
	/** The category of the name. */
	category: string;
	/** The inactivity expiry time for the name. */
	inactivityExpiryTime: number;
	/** The name of the name. */
	name: string;
	/** Additional options for the name contract. */
	options: {
		/** The type of address used. */
		addressType: AddressType;
		/** The network provider for blockchain interactions. */
		provider: NetworkProvider;
	};
	/** The contract instance for the registry. */
	registryContract: Contract;
}

/**
 * Response containing UTXOs required for claiming a name.
 */
export interface fetchClaimNameUtxosResponse
{
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The pure UTXO from the bidder. */
	biddingReadUTXO: Utxo;
	/** The UTXO for name minting. */
	nameMintingUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
}