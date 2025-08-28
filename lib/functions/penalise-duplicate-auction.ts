import { getAuthorizedContractUtxo, getThreadUtxo, getAllRunningAuctionUtxos } from '../util/index.js';
import { TransactionBuilder } from 'cashscript';
import { FetchDuplicateAuctionGuardUtxosParams, FetchDuplicateAuctionGuardUtxosResponse, PenaliseDuplicateAuctionCoreParams } from '../interfaces/index.js';
import { DuplicateAuctionsDoNotExistError } from '../errors.js';

/**
 * Fetches UTXOs required for penalizing a duplicate auction.
 *
 * @param {FetchDuplicateAuctionGuardUtxosParams} params - The parameters required to fetch UTXOs.
 * @returns {Promise<FetchDuplicateAuctionGuardUtxosResponse>} A promise that resolves to the required UTXOs.
 * @throws {DuplicateAuctionsDoNotExistError} If less than two duplicate auctions exist.
 */
export const fetchDuplicateAuctionGuardUtxos = async ({
	name,
	category,
	contracts,
	options,
}: FetchDuplicateAuctionGuardUtxosParams): Promise<FetchDuplicateAuctionGuardUtxosResponse> =>
{
	const [ registryUtxos, guardUtxos ] = await Promise.all([
		options.provider.getUtxos(contracts.Registry.address),
		options.provider.getUtxos(contracts.ConflictResolver.address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category,
		threadContractAddress: contracts.ConflictResolver.address,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: guardUtxos,
	});

	const auctionUTXOs = getAllRunningAuctionUtxos({
		name,
		utxos: registryUtxos,
		category,
	});

	if(auctionUTXOs.length < 2)
	{
		throw new DuplicateAuctionsDoNotExistError();
	}

	return {
		threadNFTUTXO,
		authorizedContractUTXO,
		runningValidAuctionUTXO: auctionUTXOs[0],
		runningInValidAuctionUTXO: auctionUTXOs[1],
	};
};

/**
 * Constructs a transaction to penalize a duplicate auction.
 *
 * @param {PenaliseDuplicateAuctionCoreParams} params - The parameters required to penalize a duplicate auction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
 */
export const penalizeDuplicateAuction = async ({
	rewardTo,
	networkProvider,
	contracts,
	utxos,
}: PenaliseDuplicateAuctionCoreParams): Promise<TransactionBuilder> =>
{
	const { threadNFTUTXO, authorizedContractUTXO, runningValidAuctionUTXO, runningInValidAuctionUTXO } = utxos;

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.ConflictResolver.unlock.call())
		.addInput(runningValidAuctionUTXO, contracts.Registry.unlock.call())
		.addInput(runningInValidAuctionUTXO, contracts.Registry.unlock.call())
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: threadNFTUTXO.satoshis,
			token: {
				category: threadNFTUTXO.token!.category,
				amount: threadNFTUTXO.token!.amount + runningInValidAuctionUTXO.token!.amount,
				nft: {
					capability: threadNFTUTXO.token!.nft!.capability,
					commitment: threadNFTUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: contracts.ConflictResolver.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: runningValidAuctionUTXO.satoshis,
			token: {
				category: runningValidAuctionUTXO.token!.category,
				amount: runningValidAuctionUTXO.token!.amount,
				nft: {
					capability: runningValidAuctionUTXO.token!.nft!.capability,
					commitment: runningValidAuctionUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: rewardTo,
			amount: runningInValidAuctionUTXO.satoshis,
		});

	const transactionSize = transaction.build().length;
	transaction.outputs[transaction.outputs.length - 1].amount = runningInValidAuctionUTXO.satoshis - (BigInt(transactionSize * 2));

	return transaction;
};