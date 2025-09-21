import { binToHex } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';

import { InvalidBidAmountError } from '../errors.js';
import { adjustLastOutputForFee, convertNameToBinaryAndHex, convertPkhToLockingBytecode, createPlaceholderUnlocker, validateName } from '../util/index.js';
import type { CreateBidCoreParams } from '../interfaces/index.js';
import { convertAddressToPkh, toCashaddr } from '../util/address.js';
import { getMinimumBidAmount } from '../util/price.js';


/**
 * Creates a transaction for placing a bid in an auction.
 *
 * @param {CreateBidCoreParams} params - The parameters for the bid transaction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the bid transaction.
 * @throws {InvalidNameError} If the auction name is invalid.
 * @throws {InvalidBidAmountError} If the bid amount is less than the minimum required increase.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
 */
export const createBidTransactionCore = async ({
	name,
	amount,
	address,
	networkProvider,
	contracts,
	minBidIncreasePercentage,
	utxos,
}: CreateBidCoreParams): Promise<TransactionBuilder> =>
{
	validateName(name);

	const { nameBin } = convertNameToBinaryAndHex(name);
	const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO, fundingUTXO } = utxos;

	if(BigInt(amount) < getMinimumBidAmount(BigInt(runningAuctionUTXO.satoshis), BigInt(minBidIncreasePercentage)))
	{
		throw new InvalidBidAmountError();
	}

	const prevBidderPKH = runningAuctionUTXO.token!.nft!.commitment.slice(0, 40);
	const prevBidderLockingBytecode = convertPkhToLockingBytecode(prevBidderPKH);
	const prevBidderAddress = toCashaddr(prevBidderLockingBytecode);
	const pkh = convertAddressToPkh(address);

	const placeholderUnlocker = createPlaceholderUnlocker(address);

	const transaction = new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.Bid.unlock.call())
		.addInput(runningAuctionUTXO, contracts.Registry.unlock.call())
		.addInput(fundingUTXO, placeholderUnlocker)
		.addOutput({
			to: contracts.Registry.tokenAddress,
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
			to: contracts.Bid.address,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: contracts.Registry.tokenAddress,
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