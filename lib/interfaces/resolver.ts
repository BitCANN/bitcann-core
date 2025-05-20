import type { NetworkProvider } from 'cashscript';

/**
 * Interface for the request parameters of the lookupAddressCore function.
 */
export interface LookupAddressCoreParams
{
	address: string;
	category: string;
	networkProvider: NetworkProvider;
}

/**
 * Interface for the response of the lookupAddressCore function.
 */
export interface LookupAddressCoreResponse
{
	names: string[];
}
