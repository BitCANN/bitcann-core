import type { AddressType, NetworkProvider } from 'cashscript';

export interface GuardConfig 
{
	category: string;
	networkProvider: NetworkProvider;
	contracts: Record<string, any>;
	inactivityExpiryTime: number;
	options: {
		provider: NetworkProvider;
		addressType: AddressType;
	};
}

export interface GuardParams 
{
	name: string;
	amount: number;
	address: string;
}
