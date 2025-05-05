import type { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { NetworkProvider } from 'cashscript';

export interface FetchRecordsParams
{
	name: string;
	keepDuplicates?: boolean;
	category: string;
	inactivityExpiryTime: number;
	options: any;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}

export interface CreateRecordsParams
{
	name: string;
	records: string[];
	address: string;
	category: string;
	inactivityExpiryTime: number;
	options: any;
	networkProvider: NetworkProvider;
	utxos?: any;
}
