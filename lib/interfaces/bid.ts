import type { Utxo } from 'cashscript';

/**
 * Parameters required to create a bid transaction.
 */
export interface CreateBidParams
{
	/**
	 * The name on which the bid is being placed.
	 */
	name: string;
	/**
	 * The amount of the bid.
	 */
	amount: number;
	/**
	 * The address of the bidder.
	 */
	address: string;
	/**
	 * Optional UTXOs for the transaction; if not provided, they will be fetched.
	 */
	utxos?: FetchBidUtxosResponse;
}

/**
 * Parameters for creating a bid transaction that is not part of the manager.
 */
export interface CreateBidCoreParams
{
	/**
	 * The name on which the bid is being placed.
	 */
	name: string;
	/**
	 * The amount of the bid.
	 */
	amount: number;
	/**
	 * The address of the bidder.
	 */
	address: string;
	/**
	 * UTXOs required for the bid transaction.
	 */
	utxos?: FetchBidUtxosResponse;
}

/**
 * Parameters for fetching UTXOs for a bid.
 */
export interface FetchBidUtxosParams
{
	/**
	 * The name on which the bid is being placed.
	 */
	name: string;
	/**
	 * The token category.
	 */
	category: string;
	/**
	 * The address of the bidder.
	 */
	address: string;
	/**
	 * The amount of the bid.
	 */
	amount: number;
}

/**
 * Response type for fetching UTXOs for a bid.
 */
export interface FetchBidUtxosResponse
{
	/**
	 * UTXO for the thread NFT.
	 */
	threadNFTUTXO: Utxo;
	/**
	 * UTXO for the authorized contract.
	 */
	authorizedContractUTXO: Utxo;
	/**
	 * UTXO for the running auction.
	 */
	runningAuctionUTXO: Utxo;
	/**
	 * UTXO for funding the bid.
	 */
	fundingUTXO: Utxo;
}
