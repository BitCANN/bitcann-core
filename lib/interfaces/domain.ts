import type { NetworkProvider, Contract, AddressType } from 'cashscript';

export interface CreateClaimDomainTransactionParams
{
	category: string;
	domainFactoryContract: Contract;
	inactivityExpiryTime: number;
	maxPlatformFeePercentage: number;
	minWaitTime: number;
	name: string;
	networkProvider: NetworkProvider;
	options: any;
	platformFeeAddress?: string;
	registryContract: Contract;
	utxos?: any;
}

export interface DomainConfig
{
	category: string;
	contracts: Record<string, Contract>;
	inactivityExpiryTime: number;
	maxPlatformFeePercentage: number;
	minWaitTime: number;
	networkProvider: NetworkProvider;
	options: {
		provider: NetworkProvider;
		addressType: AddressType;
	};
	platformFeeAddress: string;
}

export interface DomainInfo
{
	address: string;
	contract: Contract;
}

export interface FetchClaimDomainUtxosParams
{
	category: string;
	domainFactoryContract: Contract;
	name: string;
	networkProvider: NetworkProvider;
	registryContract: Contract;
}

export interface GetDomainParams
{
	category: string;
	inactivityExpiryTime: number;
	name: string;
	options: any;
}
