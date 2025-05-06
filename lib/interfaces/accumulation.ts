import { Contract, type NetworkProvider, type Utxo } from 'cashscript';

export interface FetchAccumulationUtxosParams
{
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
	category: string;
	address: string;
}

export interface AccumulateParams
{
	networkProvider: NetworkProvider;
	registryContract: Contract;
	accumulatorContract: Contract;
	utxos: FetchAccumulationUtxosResponse;
	address: string;
}

export interface FetchAccumulationUtxosResponse
{
	threadNFTUTXO: Utxo;
	registrationCounterUTXO: Utxo;
	authorizedContractUTXO: Utxo;
	threadWithTokenUTXO: Utxo;
	userUTXO: Utxo;
}
