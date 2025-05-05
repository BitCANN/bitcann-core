import { binToHex } from '@bitauth/libauth';
import type { NetworkProvider } from 'cashscript';
import { TransactionBuilder } from 'cashscript';

import { EXPECTED_MAX_TRANSACTION_FEE } from './constants.js';
import { InvalidBidAmountError, InvalidNameError, UserUTXONotFoundError } from './errors.js';
import { convertNameToBinary, createPlaceholderUnlocker, getAuthorizedContractUtxo, getRunningAuctionUtxo, getThreadUtxo, isValidName } from './util/index.js';
import type { BidConfig, BidParams } from './interfaces/bid.js';

/**
 * The BidManager class is responsible for managing bid-related operations,
 * including creating bid transactions for auctions.
 */
export class BidManager
{
	private category: string;
	private minBidIncreasePercentage: number;
	private networkProvider: NetworkProvider;
	private contracts: Record<string, any>;

	/**
     * Constructs a new BidManager instance with the specified configuration parameters.
     *
     * @param {BidConfig} params - The configuration parameters for the bid manager.
     */
	constructor(params: BidConfig)
	{
		this.category = params.category;
		this.minBidIncreasePercentage = params.minBidIncreasePercentage;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
	}

	/**
     * Creates a transaction for placing a bid in an auction.
     *
     * @param {BidParams} params - The parameters for the bid transaction.
     * @param {string} params.name - The name of the auction.
     * @param {number} params.amount - The bid amount.
     * @param {string} params.address - The address of the bidder.
     * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the bid transaction.
     * @throws {InvalidNameError} If the auction name is invalid.
     * @throws {InvalidBidAmountError} If the bid amount is less than the minimum required increase.
     * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
     */
	public async createBidTransaction({ name, amount, address }: BidParams): Promise<TransactionBuilder>
	{
		if(!isValidName(name))
		{
			throw new InvalidNameError();
		}

		const { nameBin } = convertNameToBinary(name);
		const [ registryUtxos, bidUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Bid.address),
			this.networkProvider.getUtxos(address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.Bid.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: bidUtxos,
		});

		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		if(BigInt(amount) < BigInt(Math.ceil(Number(runningAuctionUTXO.satoshis) * (1 + this.minBidIncreasePercentage / 100))))
		{
			throw new InvalidBidAmountError();
		}

		const fundingUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + EXPECTED_MAX_TRANSACTION_FEE) && !utxo.token);
		if(!fundingUTXO)
		{
			throw new UserUTXONotFoundError();
		}

		const prevBidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
		const prevBidderAddress = binToHex(convertNameToBinary(prevBidderPKH).nameBin);

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		const transaction = new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.Bid.unlock.call())
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addInput(fundingUTXO, placeholderUnlocker)
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: threadNFTUTXO.satoshis,
				token: {
					category: threadNFTUTXO.token.category,
					amount: threadNFTUTXO.token.amount,
					nft: {
						capability: threadNFTUTXO.token.nft.capability,
						commitment: threadNFTUTXO.token.nft.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Bid.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: BigInt(amount),
				token: {
					category: runningAuctionUTXO.token.category,
					amount: runningAuctionUTXO.token.amount,
					nft: {
						capability: 'mutable',
						commitment: binToHex(convertNameToBinary(address).nameBin) + binToHex(nameBin),
					},
				},
			})
			.addOutput({
				to: prevBidderAddress,
				amount: runningAuctionUTXO.satoshis,
			})
			.addOutput({
				to: address,
				amount: fundingUTXO.satoshis - (BigInt(amount) + BigInt(EXPECTED_MAX_TRANSACTION_FEE)),
			});

		const transactionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = fundingUTXO.satoshis - (BigInt(amount) + BigInt(transactionSize));

		return transaction;
	}
}