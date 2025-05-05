import type { NetworkProvider } from 'cashscript';

export type ManagerConfig =
{
	/** category of the auction. */
	category: string;

	/** inactivity expiry time for the auction. */
	inactivityExpiryTime: number;

	/** maximum platform fee percentage for the auction. */
	maxPlatformFeePercentage: number;

	/** minimum bid increase percentage for the auction. */
	minBidIncreasePercentage: number;

	/** minimum starting bid for the auction. */
	minStartingBid: number;

	/** minimum wait time for the auction. */
	minWaitTime: number;

	/** network provider to use for BCH network operations. */
	networkProvider?: NetworkProvider;

	/** platform fee address for the auction. */
	platformFeeAddress?: string;
};