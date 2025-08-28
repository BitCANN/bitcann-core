import { TransactionBuilder } from 'cashscript';
import { constructNameContract, getRunningAuctionUtxo, getThreadUtxo, getAuthorizedContractUtxo } from '../util/index.js';
import { ExternalAuthNFTUTXONotFoundError } from '../errors.js';
import { FetchIllegalAuctionGuardUtxosParams, FetchIllegalAuctionGuardUtxosResponse, PenaliseIllegalAuctionCoreParams } from '../interfaces/index.js';

/**
 * Fetches UTXOs required for penalizing an illegal auction.
 *
 * @param {FetchIllegalAuctionGuardUtxosParams} params - The parameters required to fetch UTXOs.
 * @returns {Promise<FetchIllegalAuctionGuardUtxosResponse>} A promise that resolves to the required UTXOs.
 * @throws {ExternalAuthNFTUTXONotFoundError} If the external authorization NFT UTXO is not found.
 */
export const fetchIllegalAuctionGuardUtxos = async ({
	name,
	category,
	contracts,
	inactivityExpiryTime,
	options,
}: FetchIllegalAuctionGuardUtxosParams): Promise<FetchIllegalAuctionGuardUtxosResponse> =>
{
	const nameContract = constructNameContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	const [ registryUtxos, guardUtxos, nameUtxos ] = await Promise.all([
		options.provider.getUtxos(contracts.Registry.address),
		options.provider.getUtxos(contracts.OwnershipGuard.address),
		options.provider.getUtxos(nameContract.address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category,
		threadContractAddress: contracts.OwnershipGuard.address,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: guardUtxos,
	});

	const runningAuctionUTXO = getRunningAuctionUtxo({
		name,
		utxos: registryUtxos,
		category,
	});

	// Find the internal authorization NFT UTXO.
	const externalAuthUTXO = nameUtxos.find(utxo =>
		utxo.token?.nft?.capability === 'none'
    && utxo.token?.category === category
    && utxo.token?.nft?.commitment.length === 0,
	) || null;

	if(!externalAuthUTXO)
	{
		throw new ExternalAuthNFTUTXONotFoundError();
	}

	return {
		threadNFTUTXO,
		authorizedContractUTXO,
		runningAuctionUTXO,
		externalAuthUTXO,
	};
};

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
	inactivityExpiryTime,
	options,
	networkProvider,
	contracts,
	utxos,
}: PenaliseIllegalAuctionCoreParams): Promise<TransactionBuilder> =>
{
	const nameContract = constructNameContract({
		name,
		category,
		inactivityExpiryTime,
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