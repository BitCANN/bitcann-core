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

/**
 * Interface for the request parameters of the resolveNameCore function.
 */
export interface ResolveNameParams
{
	name: string;
	useElectrum?: boolean;
	useChaingraph?: boolean;
}

/**
 * Interface for the request parameters of the lookupAddressCore function.
 */
export interface LookupAddressParams
{
	address: string;
}

/**
 * Interface for the request parameters of the resolveNameCore function.
 */
export interface ResolveNameCoreParams
{
	name: string;
	category: string;
	inactivityExpiryTime: number;
	options: any;
	electrumClient: any;
	useElectrum?: boolean;
	useChaingraph?: boolean;
	chaingraphUrl?: string;
}

/**
 * Interface for the request parameters of the resolveNameByElectrum function.
 */
export interface ResolveNameByElectrumParams
{
	baseHeight: number;
	token: any;
	ownerLockingBytecode: any;
	electrumClient: any;
}

/**
 * Interface for the request parameters of the resolveNameByChainGraph function.
 */
export interface ResolveNameByChainGraphParams
{
	token: any;
	chaingraphUrl: string;
	electrumClient: any;
}