import type { NetworkProvider, Contract } from 'cashscript';

export interface BidConfig 
{
	category: string;
	minBidIncreasePercentage: number;
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
}

export interface BidParams 
{
	name: string;
	amount: number;
	address: string;
} 