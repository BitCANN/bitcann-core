import type { NetworkProvider } from 'cashscript';

export interface GuardConfig 
{
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	options: {
		platformFeeAddress: string;
		maxPlatformFeePercentage: number;
	};
}

export interface GuardParams 
{
	name: string;
	amount: number;
	address: string;
}
