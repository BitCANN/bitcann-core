import { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import type { Contract, NetworkProvider, Utxo } from 'cashscript';

/**
 * Parameters required to create an auction.
 */
export interface CreateAuctionParams
{
	/**
   * The domain name to be auctioned.
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
 * Parameters for creating an auction transaction that is not part of the manager.
 */
export interface CreateAuctionCoreParams
{
	/**
   * The address of the user creating the auction.
   */
	address: string;
	/**
   * The initial amount for the auction.
   */
	amount: number;
	/**
   * The token category.
   */
	category: string;
	/**
   * Contracts involved in the auction.
   */
	contracts: Record<string, Contract>;
	/**
   * The name to be auctioned.
   */
	name: string;
	/**
   * Network provider for BCH network operations.
   */
	networkProvider: NetworkProvider;
	/**
   * UTXOs required for the auction transaction.
   */
	utxos: FetchAuctionUtxosResponse;
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
	/**
   * The token category.
   */
	category: string;
	/**
   * Contracts involved in the auction.
   */
	contracts: Record<string, Contract>;
	/**
   * Network provider for BCH network operations.
   */
	networkProvider: NetworkProvider;
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
 * Parameters for retrieving all active auctions.
 */
export interface GetAuctionsParams
{
	/**
   * The category of the auctions.
   */
	category: string;
	/**
   * Contracts involved in the auctions.
   */
	contracts: Record<string, Contract>;
	/**
   * Network provider for BCH network operations.
   */
	networkProvider: NetworkProvider;
	/**
   * Electrum client for protocol events.
   */
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}

/**
 * Response type for retrieving all active auctions.
 */
export interface GetAuctionsResponse
{
	/**
   * The domain name of the auction.
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
 * Parameters for retrieving past auctions.
 */
export interface GetPastAuctionsParams
{
	/**
   * The category of the past auctions.
   */
	category: string;
	/**
   * Contract for the domain.
   */
	domainFactory: Contract;
	/**
   * Electrum client for protocol events.
   */
	electrumClient: ElectrumClient<ElectrumProtocolEvents>;
}

/**
 * Response type for past auctions.
 */
export interface PastAuctionResponse
{
	/**
   * The domain name of the past auction.
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
