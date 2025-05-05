import { Contract } from 'cashscript';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { ElectrumClient } from '@electrum-cash/network';

export interface GetValidCandidateTransactionsParams
{
	category: string;
	domainContract: Contract;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
	history: any[];
}