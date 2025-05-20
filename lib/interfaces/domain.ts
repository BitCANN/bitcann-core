import type { AddressType, Contract, NetworkProvider, Utxo } from 'cashscript';

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
	domainFactoryContract: Contract;
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
}

/**
 * Parameters required to fetch UTXOs for claiming a domain.
 */
export interface FetchClaimDomainUtxosParams
{
	/** The category of the domain. */
	category: string;
	/** The contract instance for the domain factory. */
	domainFactoryContract: Contract;
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
}

/**
 * Response containing UTXOs required for claiming a domain.
 */
export interface FetchClaimDomainUtxosResponse
{
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The UTXO for domain minting. */
	domainMintingUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
}