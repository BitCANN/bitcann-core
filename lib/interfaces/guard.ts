import type { AddressType, NetworkProvider, Utxo } from 'cashscript';

// Segregated and sorted interfaces for fetching UTXOs
export interface FetchDuplicateAuctionGuardUtxosParams
{
	name: string;
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	options: { provider: NetworkProvider; addressType: AddressType };
}

export interface FetchDuplicateAuctionGuardUtxosReturn
{
	threadNFTUTXO: Utxo;
	authorizedContractUTXO: Utxo;
	runningValidAuctionUTXO: Utxo;
	runningInValidAuctionUTXO: Utxo;
}

export interface FetchIllegalAuctionGuardUtxosParams
{
	name: string;
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	inactivityExpiryTime: number;
	options: { provider: NetworkProvider; addressType: AddressType };
}

export interface FetchIllegalAuctionGuardUtxosReturn
{
	threadNFTUTXO: Utxo;
	authorizedContractUTXO: Utxo;
	runningAuctionUTXO: Utxo;
	externalAuthUTXO: Utxo;
}

export interface FetchInvalidNameGuardUtxosParams
{
	name: string;
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
}

export interface FetchInvalidNameGuardUtxosReturn
{
	threadNFTUTXO: Utxo;
	authorizedContractUTXO: Utxo;
	runningAuctionUTXO: Utxo;
}

// Segregated and sorted interfaces for penalizing actions
export interface PenaliseDuplicateAuctionParams
{
	rewardTo: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	utxos: FetchDuplicateAuctionGuardUtxosReturn;
}

export interface PenaliseIllegalAuctionParams
{
	name: string;
	rewardTo: string;
	category: string;
	inactivityExpiryTime: number;
	options: { provider: NetworkProvider; addressType: AddressType };
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	utxos: FetchIllegalAuctionGuardUtxosReturn;
}

export interface PenalizeInvalidNameParams
{
	name: string;
	rewardTo: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	utxos: FetchInvalidNameGuardUtxosReturn;
}