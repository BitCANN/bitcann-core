import { Contract } from 'cashscript';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { ElectrumClient } from '@electrum-cash/network';

export interface GetValidCandidateTransactionsParams
{
	history: any[];
	domainContract: Contract;
	category: string;
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}