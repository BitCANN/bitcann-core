import { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { Contract, NetworkProvider, Utxo } from 'cashscript';

export type FetchCreateAuctionUtxosResponse = {
	authorizedContractUTXO: Utxo;
	registrationCounterUTXO: Utxo;
	threadNFTUTXO: Utxo;
	userUTXO: Utxo;
};

export interface AuctionConfig
{
	category: string;
	contracts: Record<string, Contract>;
	networkProvider: NetworkProvider;
}

export interface CreateAuctionParams
{
	address: string;
	amount: number;
	category: string;
	contracts: Record<string, Contract>;
	name: string;
	networkProvider: NetworkProvider;
	utxos: FetchCreateAuctionUtxosResponse;
}

export interface FetchCreateAuctionUtxosParams
{
	address: string;
	amount: number;
	category: string;
	contracts: Record<string, Contract>;
	networkProvider: NetworkProvider;
}

export interface GetAuctionsParams
{
	category: string;
	contracts: Record<string, Contract>;
	networkProvider: NetworkProvider;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}

export interface GetAuctionsReturnType
{
	name: string;
	createdAtTxHash: string;
	createdAtHeight: number;
	initialAmount: number;
	amount: number;
	hex: string;
	utxo: Utxo;
}

export interface GetPastAuctionsParams
{
	category: string;
	domainContract: Contract;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}

export interface PastAuctionResult
{
	name: string;
	transactionHex: string;
	finalAmount: number;
	height: number;
	txid: string;
}

export interface CreateAuctionTransactionParams
{
	name: string;
	amount: number;
	address: string;
	utxos?: FetchCreateAuctionUtxosResponse;
}