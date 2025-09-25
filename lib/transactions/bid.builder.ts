import { binToHex } from '@bitauth/libauth';
import { Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { InvalidBidAmountError } from '../errors.js';
import type { CreateBidCoreParams } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import { convertAddressToPkh, toCashaddr } from '../util/address.js';
import { adjustLastOutputForFee, convertNameToBinaryAndHex, convertPkhToLockingBytecode, createPlaceholderUnlocker, validateName } from '../util/index.js';
import { getMinimumBidAmount } from '../util/price.js';


/**
 * Builder class for bid transactions.
 */
export class BidTransactionBuilder
{
	/**
	 * The network provider.
	 */
	networkProvider: NetworkProvider;

	/**
	 * The set of contracts involved in the bid process.
	 */
	contracts: Record<string, Contract>;

	/**
	 * The UTXO manager.
	 */
	utxoManager: UtxoManager;

	/**
	 * The minimum bid increase percentage.
	 */
	minBidIncreasePercentage: number;

	/**
	 * The category.
	 */
	category: string;

	/**
	 * Constructs a new BidTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {Record<string, Contract>} contracts - The contracts used in the transaction.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 * @param {number} minBidIncreasePercentage - The minimum bid increase percentage.
	 * @param {string} category - The category.
	 */
	constructor(networkProvider: NetworkProvider, contracts: Record<string, Contract>, utxoManager: UtxoManager, minBidIncreasePercentage: number, category: string)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.utxoManager = utxoManager;
		this.minBidIncreasePercentage = minBidIncreasePercentage;
		this.category = category;
	}

	/**
	 * Creates a transaction for placing a bid in an auction.
	 *
	 * @param {CreateBidCoreParams} params - The parameters for the bid transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the bid transaction.
	 * @throws {InvalidNameError} If the auction name is invalid.
	 * @throws {InvalidBidAmountError} If the bid amount is less than the minimum required increase.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
	 */
	build = async ({
		name,
		amount,
		address,
		utxos,
	}: CreateBidCoreParams): Promise<TransactionBuilder> =>
	{
		validateName(name);
		const { nameBin } = convertNameToBinaryAndHex(name);

		if(!utxos)
		{
			utxos = await this.utxoManager.fetchBidUtxos({
				name,
				category: this.category,
				address,
				amount,
			});
		}

		const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO, fundingUTXO } = utxos;

		if(BigInt(amount) < getMinimumBidAmount(BigInt(runningAuctionUTXO.satoshis), BigInt(this.minBidIncreasePercentage)))
		{
			throw new InvalidBidAmountError();
		}

		const prevBidderPKH = runningAuctionUTXO.token!.nft!.commitment.slice(0, 40);
		const prevBidderLockingBytecode = convertPkhToLockingBytecode(prevBidderPKH);
		const prevBidderAddress = toCashaddr(prevBidderLockingBytecode);
		const pkh = convertAddressToPkh(address);

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
					category: threadNFTUTXO.token!.category,
					amount: threadNFTUTXO.token!.amount,
					nft: {
						capability: threadNFTUTXO.token!.nft!.capability,
						commitment: threadNFTUTXO.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Bid.address,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: BigInt(amount),
				token: {
					category: runningAuctionUTXO.token!.category,
					amount: runningAuctionUTXO.token!.amount,
					nft: {
						capability: 'mutable',
						commitment: pkh + binToHex(nameBin),
					},
				},
			})
			.addOutput({
				to: prevBidderAddress,
				amount: runningAuctionUTXO.satoshis,
			})
			.addOutput({
				to: address,
				amount: fundingUTXO.satoshis,
			});

		return adjustLastOutputForFee(transaction, fundingUTXO, BigInt(amount));
	};
}
