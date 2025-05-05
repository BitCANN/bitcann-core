import type { NetworkProvider, Contract } from 'cashscript';


export interface AuctionConfig
{
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
}

export interface AuctionParams
{
	name: string;
	amount: number;
	address: string;
}