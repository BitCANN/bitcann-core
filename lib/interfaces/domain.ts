import type { NetworkProvider, Contract, AddressType } from 'cashscript';

export interface DomainConfig
{
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
	inactivityExpiryTime: number;
	platformFeeAddress: string;
	maxPlatformFeePercentage: number;
	minWaitTime: number;
	options: {
		provider: NetworkProvider;
		addressType: AddressType;
	};
}

export interface DomainInfo
{
	address: string;
	contract: Contract;
}

export interface GetDomainParams
{
	name: string;
	category: string;
	inactivityExpiryTime: number;
	options: any;
}

export interface FetchClaimDomainUtxosParams
{
	category: string;
	registryContract: Contract;
	domainFactoryContract: Contract;
	name: string;
	networkProvider: NetworkProvider;
}

export interface CreateClaimDomainTransactionParams
{
	category: string;
	registryContract: Contract;
	domainFactoryContract: Contract;
	inactivityExpiryTime: number;
	maxPlatformFeePercentage: number;
	minWaitTime: number;
	name: string;
	networkProvider: NetworkProvider;
	options: any;
	platformFeeAddress?: string;
	utxos?: any;
}
