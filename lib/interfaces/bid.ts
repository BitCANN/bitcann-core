import type { Contract, NetworkProvider, Utxo } from 'cashscript';

export interface FetchBidUtxosParams
{
	name: string;
	category: string;
	address: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
	amount: number;
}

export interface FetchBidUtxosReturnType
{
	threadNFTUTXO: Utxo;
	authorizedContractUTXO: Utxo;
	runningAuctionUTXO: Utxo;
	fundingUTXO: Utxo;
}

export interface BidParams
{
	name: string;
	amount: number;
	address: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	minBidIncreasePercentage: number;
	utxos: FetchBidUtxosReturnType;
}