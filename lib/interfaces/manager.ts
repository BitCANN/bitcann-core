import type { NetworkProvider } from 'cashscript';

export type ManagerConfig =
{
	/** category of the name. */
	category: string;

	/** chaingraph url. */
	chaingraphUrl?: string;

	/** creator incentive address for the name. */
	genesisIncentiveAddress: string;

	/** inactivity expiry time before the name can be considered expired. */
	inactivityExpiryTime: number;

	/** minimum bid increase percentage for the name. */
	minBidIncreasePercentage: number;

	/** minimum starting bid for the name. */
	minStartingBid: number;

	/** minimum wait time for the name. */
	minWaitTime: number;

	/** network provider to use for BCH network operations. */
	networkProvider?: NetworkProvider;

	/** tld for the names. */
	tld: string;
};
