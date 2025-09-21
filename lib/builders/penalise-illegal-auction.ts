import { TransactionBuilder } from 'cashscript';
import { constructNameContract } from '../util/index.js';
import { PenaliseIllegalAuctionCoreParams } from '../interfaces/index.js';


/**
 * Constructs a transaction to penalize an illegal auction.
 *
 * @param {PenaliseIllegalAuctionCoreParams} params - The parameters required to penalize an illegal auction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
 */
export const penalizeIllegalAuction = async ({
	name,
	rewardTo,
	category,
	tld,
	options,
	networkProvider,
	contracts,
	utxos,
}: PenaliseIllegalAuctionCoreParams): Promise<TransactionBuilder> =>
{
	const nameContract = constructNameContract({
		name,
		category,
		tld,
		options,
	});

	const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO, externalAuthUTXO } = utxos;

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.OwnershipGuard.unlock.call())
		.addInput(externalAuthUTXO, nameContract.unlock.useAuth(BigInt(0)))
		.addInput(runningAuctionUTXO, contracts.Registry.unlock.call())
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: threadNFTUTXO.satoshis,
			token: {
				category: threadNFTUTXO.token!.category,
				amount: threadNFTUTXO.token!.amount + runningAuctionUTXO.token!.amount,
				nft: {
					capability: threadNFTUTXO.token!.nft!.capability,
					commitment: threadNFTUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: contracts.OwnershipGuard.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: nameContract.tokenAddress,
			amount: externalAuthUTXO.satoshis,
			token: {
				category: externalAuthUTXO.token!.category,
				amount: externalAuthUTXO.token!.amount,
				nft: {
					capability: externalAuthUTXO.token!.nft!.capability,
					commitment: externalAuthUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: rewardTo,
			amount: runningAuctionUTXO.satoshis,
		});

	const transactionSize = transaction.build().length;
	transaction.outputs[transaction.outputs.length - 1].amount = runningAuctionUTXO.satoshis - (BigInt(transactionSize * 2));

	return transaction;
};