import type { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { Contract, NetworkProvider, Utxo } from 'cashscript';

export interface CreateRecordsParams
{
	address: string;
	domainContract: Contract;
	networkProvider: NetworkProvider;
	records: string[];
	utxos: FetchRecordsUtxosReturnType;
}

export interface FetchRecordsParams
{
	category: string;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
	inactivityExpiryTime: number;
	keepDuplicates?: boolean;
	name: string;
	options: any;
}

export interface FetchRecordsUtxosParams
{
	address: string;
	category: string;
	domainContract: Contract;
	name: string;
	networkProvider: NetworkProvider;
}

export type FetchRecordsUtxosReturnType = {
	fundingUTXO: Utxo;
	internalAuthNFTUTXO: Utxo;
	ownershipNFTUTXO: Utxo;
};