import type { AddressType, Contract, NetworkProvider, Utxo } from 'cashscript';

/**
 * Enum representing the various statuses a domain can have.
 */
// eslint-disable-next-line no-shadow
export enum DomainStatus
	{
	/** The domain is currently registered. */
	REGISTERED = 'REGISTERED',
	/** The domain is available for auction. */
	AUCTIONING = 'AUCTIONING',
	/** The domain is available for registration. */
	AVAILABLE = 'AVAILABLE',
	/** The domain status is invalid or unrecognized. */
	INVALID = 'INVALID',
}

/**
 * Parameters required to create a claim domain transaction.
 */
export interface CreateClaimDomainCoreParams
{
	/** The name of the domain. */
	name: string;
	/** The UTXOs to be used in the transaction, if already available. */
	utxos?: any;
}

/**
 * Parameters required to create a claim domain transaction.
 */
export interface CreateClaimDomainParams
{
	/** The token category. */
	category: string;
	/** The contract instance for the domain factory. */
	FactoryContract: Contract;
	/** The inactivity expiry time for the domain. */
	inactivityExpiryTime: number;
	/** The maximum platform fee percentage allowed. */
	maxPlatformFeePercentage: number;
	/** The minimum wait time for the transaction. */
	minWaitTime: number;
	/** The name of the domain. */
	name: string;
	/** Additional options for the domain contract. */
	options: {
		/** The type of address used. */
		addressType: AddressType;
		/** The network provider for blockchain interactions. */
		provider: NetworkProvider;
	};
	/** The address to receive the platform fee, if specified. */
	platformFeeAddress?: string;
	/** The contract instance for the registry. */
	registryContract: Contract;
	/** The UTXOs to be used in the transaction, if already available. */
	utxos: FetchClaimDomainUtxosResponse;
}

/**
 * Information about a domain.
 */
export interface DomainInfo
{
	/** The address of the domain. */
	address: string;
	/** The contract associated with the domain. */
	contract: Contract;
	/** The status of the domain. */
	status: DomainStatus;
	/** The UTXOs associated with the domain. */
	utxos?: Utxo[];
}

/**
 * Parameters required to fetch UTXOs for claiming a domain.
 */
export interface FetchClaimDomainUtxosParams
{
	/** The category of the domain. */
	category: string;
	/** The contract instance for the domain factory. */
	FactoryContract: Contract;
	/** The name of the domain. */
	name: string;
	/** The network provider for blockchain interactions. */
	networkProvider: NetworkProvider;
	/** The contract instance for the registry. */
	registryContract: Contract;
}

/**
 * Parameters required to get domain details.
 */
export interface GetDomainParams
{
	/** The category of the domain. */
	category: string;
	/** The inactivity expiry time for the domain. */
	inactivityExpiryTime: number;
	/** The name of the domain. */
	name: string;
	/** Additional options for the domain contract. */
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
 * Response containing UTXOs required for claiming a domain.
 */
export interface FetchClaimDomainUtxosResponse
{
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The pure UTXO from the bidder. */
	biddingReadUTXO: Utxo;
	/** The UTXO for domain minting. */
	domainMintingUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
}