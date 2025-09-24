import type { Contract, Utxo } from 'cashscript';

/**
 * Enum representing the various statuses a name can have.
 */
// eslint-disable-next-line no-shadow
export enum NameStatus
	{
	/** The name is currently registered. */
	REGISTERED = 'REGISTERED',
	/** The name is available for auction. */
	AUCTIONING = 'AUCTIONING',
	/** The name is available for registration. */
	AVAILABLE = 'AVAILABLE',
	/** The name status is invalid or unrecognized. */
	INVALID = 'INVALID',
}

/**
 * Parameters required to create a claim name transaction.
 */
export interface CreateClaimNameParams
{
	/** The name. */
	name: string;
	/** The UTXOs to be used in the transaction, if already available. */
	utxos?: FetchClaimNameUtxosResponse;
}

/**
 * Information about a name.
 */
export interface NameInfo
{
	/** The address of the name. */
	address: string;
	/** The contract associated with the name. */
	contract: Contract;
	/** The status of the name. */
	status: NameStatus;
	/** The UTXOs associated with the name. */
	utxos?: Utxo[];
}

/**
 * Parameters required to fetch UTXOs for claiming a name.
 */
export interface FetchClaimNameUtxosParams
{
	/** The name of the name. */
	name: string;
}

/**
 * Parameters required to get name details.
 */
export interface GetNameParams
{
	/** The name of the name. */
	name: string;
}

/**
 * Response containing UTXOs required for claiming a name.
 */
export interface FetchClaimNameUtxosResponse
{
	/** The UTXO for the authorized contract. */
	authorizedContractUTXO: Utxo;
	/** The UTXO for name minting. */
	nameMintingUTXO: Utxo;
	/** The UTXO for the running auction. */
	runningAuctionUTXO: Utxo;
	/** The UTXO for the thread NFT. */
	threadNFTUTXO: Utxo;
}