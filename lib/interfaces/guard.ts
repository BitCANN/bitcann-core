import type { AddressType, NetworkProvider } from 'cashscript';

export interface GuardConfig
{
	category: string;
	contracts: Record<string, any>;
	inactivityExpiryTime: number;
	networkProvider: NetworkProvider;
	options: {
		addressType: AddressType;
		provider: NetworkProvider;
	};
}

export interface GuardParams
{
	address: string;
	amount: number;
	name: string;
}
