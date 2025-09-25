import type { Utxo } from 'cashscript';

/**
 * Parameters required to create an auction.
 */
export interface CreateAuctionParams
{
	/**
   * The name to be auctioned.
   */
	name: string;
	/**
   * The initial amount for the auction.
   */
	amount: number;
	/**
   * The address of the user creating the auction.
   */
	address: string;
	/**
   * Optional UTXOs for the transaction; if not provided, they will be fetched.
   */
	utxos?: FetchAuctionUtxosResponse;
}

/**
 * Parameters for fetching UTXOs for an auction.
 */
export interface FetchAuctionUtxosParams
{
	/**
   * The address of the user creating the auction.
   */
	address: string;
	/**
   * The initial amount for the auction.
   */
	amount: number;
}

/**
 * Response type for fetching UTXOs for an auction.
 */
export interface FetchAuctionUtxosResponse
{
	/**
   * UTXO for the authorized contract.
   */
	authorizedContractUTXO: Utxo;
	/**
   * UTXO for the registration counter.
   */
	registrationCounterUTXO: Utxo;
	/**
   * UTXO for the thread NFT.
   */
	threadNFTUTXO: Utxo;
	/**
   * UTXO for the user.
   */
	userUTXO: Utxo;
}

/**
 * Response type for retrieving all active auctions.
 */
export interface ActiveAuctionsResponse
{
	/**
   * The name of the auction.
   */
	name: string;
	/**
   * Transaction hash when the auction/bid was last made.
   */
	previousTxHash: string;
	/**
   * Block height when the auction/bid was last made.
   */
	previousHeight: number;
	/**
   * Initial amount for the auction.
   */
	initialAmount: number;
	/**
   * Current amount of the auction.
   */
	currentAmount: number;
	/**
   * Previous bidder address.
   */
	previousBidder: string;
	/**
   * UTXO representing the auction.
   */
	utxo: Utxo;
}

/**
 * Response type for past auctions.
 */
export interface PastAuctionResponse
{
	/**
   * The name of the past auction.
   */
	name: string;
	/**
   * Hexadecimal representation of the transaction.
   */
	transactionHex: string;
	/**
   * Final amount of the auction.
   */
	finalAmount: number;
	/**
   * Block height of the transaction.
   */
	height: number;
	/**
   * Transaction ID.
   */
	txid: string;
}
