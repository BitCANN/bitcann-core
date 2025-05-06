import { TransactionBuilder } from 'cashscript';
import { constructDomainContract, getRunningAuctionUtxo, getThreadUtxo, getAuthorizedContractUtxo } from '../util/index.js';
import { ExternalAuthNFTUTXONotFoundError } from '../errors.js';
import { FetchIllegalAuctionGuardUtxosParams, FetchIllegalAuctionGuardUtxosReturn, PenaliseIllegalAuctionParams } from '../interfaces/index.js';

/**
 * Fetches UTXOs required for penalizing an illegal auction.
 *
 * @param {FetchIllegalAuctionGuardUtxosParams} params - The parameters required to fetch UTXOs.
 * @returns {Promise<FetchIllegalAuctionGuardUtxosReturn>} A promise that resolves to the required UTXOs.
 * @throws {ExternalAuthNFTUTXONotFoundError} If the external authorization NFT UTXO is not found.
 */
export const fetchIllegalAuctionGuardUtxos = async ({
	name,
	category,
	networkProvider,
	contracts,
	inactivityExpiryTime,
	options,
}: FetchIllegalAuctionGuardUtxosParams): Promise<FetchIllegalAuctionGuardUtxosReturn> =>
{
	const domainContract = constructDomainContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	const [ registryUtxos, guardUtxos, domainUtxos ] = await Promise.all([
		networkProvider.getUtxos(contracts.Registry.address),
		networkProvider.getUtxos(contracts.DomainOwnershipGuard.address),
		networkProvider.getUtxos(domainContract.address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category,
		threadContractAddress: contracts.DomainOwnershipGuard.address,
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
	const externalAuthUTXO = domainUtxos.find(utxo =>
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
 * @param {PenaliseIllegalAuctionParams} params - The parameters required to penalize an illegal auction.
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
}: PenaliseIllegalAuctionParams): Promise<TransactionBuilder> =>
{
	const domainContract = constructDomainContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO, externalAuthUTXO } = utxos;

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.DomainOwnershipGuard.unlock.call())
		.addInput(externalAuthUTXO, domainContract.unlock.useAuth(BigInt(0)))
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
			to: contracts.DomainOwnershipGuard.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: domainContract.tokenAddress,
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