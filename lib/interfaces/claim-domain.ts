import type { NetworkProvider, Contract } from 'cashscript';

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