import type { NetworkProvider } from 'cashscript';

export type ManagerConfig =
{
	/** category of the name. */
	category: string;

	/** inactivity expiry time before the name can be considered expired. */
	inactivityExpiryTime: number;

	/** minimum starting bid for the name. */
	minStartingBid: number;

	/** minimum bid increase percentage for the name. */
	minBidIncreasePercentage: number;

	/** minimum wait time for the name. */
	minWaitTime: number;

	/** tld for the names. */
	tld: string;

	/** creator incentive address for the name. */
	creatorIncentiveAddress: string;

	/** network provider to use for BCH network operations. */
	networkProvider?: NetworkProvider;

	/** chaingraph url. */
	chaingraphUrl?: string;
};