import type { NetworkProvider, Contract } from 'cashscript';

export interface AuctionConfig
{
	category: string;
	contracts: Record<string, Contract>;
	networkProvider: NetworkProvider;
}

export interface AuctionParams
{
	address: string;
	amount: number;
	name: string;
}