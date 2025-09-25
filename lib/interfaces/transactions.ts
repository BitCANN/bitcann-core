import type { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import { Contract } from 'cashscript';

/**
 * Parameters for fetching valid candidate transactions.
 */
export interface GetValidCandidateTransactionsParams
{
	/** The token category. */
	category: string;

	/** The contract associated with the name. */
	nameContract: Contract;

	/** The Electrum client for blockchain interactions. */
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;

	/** The transaction history to be evaluated. */
	history: any[];
}
