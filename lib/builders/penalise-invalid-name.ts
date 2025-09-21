import { TransactionBuilder } from 'cashscript';
import { findFirstInvalidCharacterIndex, adjustLastOutputForFee } from '../util/index.js';
import { PenalizeInvalidNameCoreParams } from '../interfaces/index.js';
import { AuctionNameDoesNotContainInvalidCharacterError } from '../errors.js';

/**
 * Constructs a transaction to penalize an invalid auction name.
 *
 * @param {PenalizeInvalidNameCoreParams} params - The parameters required to penalize an invalid auction name.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
 * @throws {AuctionNameDoesNotContainInvalidCharacterError} If the auction name does not contain an invalid character.
 */
export const penalizeInvalidAuctionName = async ({
	name,
	rewardTo,
	networkProvider,
	contracts,
	utxos,
}: PenalizeInvalidNameCoreParams): Promise<TransactionBuilder> =>
{
	const invalidCharacterIndex = findFirstInvalidCharacterIndex(name);

	if(invalidCharacterIndex === -1)
	{
		throw new AuctionNameDoesNotContainInvalidCharacterError();
	}

	const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO } = utxos;

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.NameEnforcer.unlock.call(BigInt(invalidCharacterIndex)))
		.addInput(runningAuctionUTXO, contracts.Registry.unlock.call())
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: threadNFTUTXO.satoshis,
			token: {
				category: threadNFTUTXO!.token!.category,
				amount: threadNFTUTXO!.token!.amount + runningAuctionUTXO!.token!.amount,
				nft: {
					capability: threadNFTUTXO!.token!.nft!.capability,
					commitment: threadNFTUTXO!.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: contracts.NameEnforcer.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: rewardTo,
			amount: runningAuctionUTXO.satoshis,
		});

	return adjustLastOutputForFee(transaction, runningAuctionUTXO);
};