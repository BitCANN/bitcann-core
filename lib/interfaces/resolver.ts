/**
 * Interface for the request parameters of the lookupAddressCore function.
 */
export interface LookupAddressCoreParams
{
	address: string;
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
	useElectrum?: boolean;
	useChaingraph?: boolean;
}

/**
 * Interface for the request parameters of the resolveNameByElectrum function.
 */
export interface ResolveNameByElectrumParams
{
	baseHeight: number;
	token: any;
	ownerLockingBytecode: any;
}

/**
 * Interface for the request parameters of the resolveNameByChainGraph function.
 */
export interface ResolveNameByChainGraphParams
{
	token: any;
}