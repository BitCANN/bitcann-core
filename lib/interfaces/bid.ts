import type { NetworkProvider, Contract } from 'cashscript';

export interface BidConfig
{
	category: string;
	contracts: Record<string, Contract>;
	minBidIncreasePercentage: number;
	networkProvider: NetworkProvider;
}

export interface BidParams
{
	address: string;
	amount: number;
	name: string;
}