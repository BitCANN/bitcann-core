import type { NetworkProvider, Contract, AddressType, Utxo } from 'cashscript';


export type DomainStatusType = 
	| 'NOT_REGISTERED'
	| 'UNDER_AUCTION'
	| 'CLAIMED';

export interface DomainRecord 
{
	domain: string;
	owner: string;
	records: Record<string, string>;
}

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

export interface CreateRecordsParams 
{
	name: string;
	records: string[];
	address: string;
}

export interface CreateClaimDomainParams 
{
	name: string;
}

export interface DomainInfo 
{
	address: string;
	contract: Contract;
	utxos: Utxo[];
	status: DomainStatusType;
}