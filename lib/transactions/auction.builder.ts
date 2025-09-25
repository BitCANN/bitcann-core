import { binToHex, NonFungibleTokenCapability } from '@bitauth/libauth';
import { Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { InvalidAuctionAmountError } from '../errors.js';
import type { CreateAuctionParams, FetchAuctionUtxosResponse } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import { convertAddressToPkh } from '../util/address.js';
import { createPlaceholderUnlocker, getAuctionPrice, padVmNumber } from '../util/index.js';
import { convertNameToBinaryAndHex, validateName } from '../util/name.js';
import { adjustLastOutputForFee } from '../util/transaction.js';


/**
 * Builder class for auction transactions.
 */
export class AuctionTransactionBuilder
{
	/**
	 * The network provider.
	 */
	networkProvider: NetworkProvider;

	/**
	 * The set of contracts involved in the auction process.
	 */
	contracts: Record<string, Contract>;

	/**
	 * The minimum starting bid.
	 */
	minStartingBid: number;

	/**
	 * The UTXO manager.
	 */
	utxoManager: UtxoManager;


	/**
	 * Constructs a new AuctionTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {Record<string, Contract>} contracts - The contracts used in the transaction.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 * @param {number} minStartingBid - The minimum starting bid.
	 */
	constructor(networkProvider: NetworkProvider, contracts: Record<string, Contract>, utxoManager: UtxoManager, minStartingBid: number)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.utxoManager = utxoManager;
		this.minStartingBid = minStartingBid;
	}

	/**
	 * @description Constructs a transaction to initiate an auction.
	 *
	 * @param {CreateAuctionParams} params - The parameters for constructing the auction transaction.
	 * @param {string} params.name - The name to be auctioned.
	 * @param {number} params.amount - The initial bid amount for the auction.
	 * @param {string} params.address - The address of the auction creator.
	 * @param {FetchAuctionUtxosResponse} params.utxos - The UTXOs necessary for the transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the auction transaction.
	 * @throws {InvalidNameError} If the provided auction name is invalid.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found to fund the auction.
	 */
	build = async ({ name, amount, address, utxos }: CreateAuctionParams): Promise<TransactionBuilder> =>
	{
		// Validate the auction name
		validateName(name);

		// Convert the auction name to binary and hexadecimal formats
		const { nameBin } = convertNameToBinaryAndHex(name);

		if(!utxos)
		{
			utxos = await this.utxoManager.fetchAuctionUtxos({ amount, address });
		}

		// Destructure the necessary UTXOs from the provided utxos object
		const { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, userUTXO }: FetchAuctionUtxosResponse = utxos as FetchAuctionUtxosResponse;

		const currentRegistrationId = parseInt(registrationCounterUTXO.token!.nft!.commitment, 16);

		// Check if the amount is greater than the minimum to start an auction
		const auctionPrice = getAuctionPrice(BigInt(currentRegistrationId), BigInt(this.minStartingBid));
		if(amount < auctionPrice)
		{
			throw new InvalidAuctionAmountError();
		}

		// Calculate the new registration ID and its commitment
		const nextRegistrationIdCommitment = padVmNumber(BigInt(currentRegistrationId + 1), 8);

		// Convert the user's address to a public key hash
		const userPkh = convertAddressToPkh(address);

		// Create a placeholder unlocker for the user's UTXO
		const placeholderUnlocker = createPlaceholderUnlocker(address);

		// Construct the transaction using the TransactionBuilder
		const transaction = new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.Auction.unlock.call(nameBin))
			.addInput(registrationCounterUTXO, this.contracts.Registry.unlock.call())
			.addInput(userUTXO, placeholderUnlocker)
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: threadNFTUTXO.satoshis,
				token: {
					category: threadNFTUTXO.token!.category,
					amount: threadNFTUTXO.token!.amount,
					nft: {
						capability: threadNFTUTXO.token!.nft!.capability,
						commitment: threadNFTUTXO.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Auction.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: registrationCounterUTXO.satoshis,
				token: {
					category: registrationCounterUTXO.token!.category,
					amount: registrationCounterUTXO.token!.amount - BigInt(currentRegistrationId),
					nft: {
						capability: registrationCounterUTXO.token!.nft!.capability,
						commitment: nextRegistrationIdCommitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: BigInt(amount),
				token: {
					category: registrationCounterUTXO.token!.category,
					amount: BigInt(currentRegistrationId),
					nft: {
						capability: NonFungibleTokenCapability.mutable,
						commitment: userPkh + binToHex(nameBin),
					},
				},
			})
			.addOutput({
				to: address,
				amount: userUTXO.satoshis,
			});

		// Adjust the last output for transaction fees
		return adjustLastOutputForFee(transaction, userUTXO, BigInt(amount));
	};
}
