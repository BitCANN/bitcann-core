import { NonFungibleTokenCapability } from '@bitauth/libauth';

/**
 * Interface for the response of the lookupAddress function.
 */
export interface LookupAddressResponse
{
	names: string[];
}

/**
 * Interface for the request parameters of the resolveName function.
 */
export interface ResolveNameParams
{
	name: string;
	useElectrum?: boolean;
	useChaingraph?: boolean;
}

/**
 * Interface for the request parameters of the lookupAddress function.
 */
export interface LookupAddressParams
{
	address: string;
}

interface Token
{
	amount: bigint;
	category: Uint8Array;
	nft?: {
		capability: `${NonFungibleTokenCapability}`;
		commitment: Uint8Array;
	};
}

/**
 * Interface for the request parameters of the resolveNameByElectrum function.
 */
export interface ResolveNameByElectrumParams
{
	baseHeight: number;
	token: Token;
	ownerLockingBytecode: Uint8Array;
}

/**
 * Interface for the request parameters of the resolveNameByChainGraph function.
 */
export interface ResolveNameByChainGraphParams
{
	token: Token;
}
