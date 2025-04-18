import type { NetworkProvider } from 'cashscript';

export type ManagerConfig = 
{
	/** network provider to use for BCH network operations. */
	networkProvider?: NetworkProvider;

	/** category of the auction. */
	category: string;

	/** minimum starting bid for the auction. */
	minStartingBid: number;

	/** minimum bid increase percentage for the auction. */
	minBidIncreasePercentage: number;

	/** inactivity expiry time for the auction. */
	inactivityExpiryTime: number;

	/** minimum wait time for the auction. */
	minWaitTime: number;

	/** maximum platform fee percentage for the auction. */
	maxPlatformFeePercentage: number;
};