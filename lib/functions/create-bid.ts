import { binToHex } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';

import { InvalidBidAmountError, UserUTXONotFoundError } from '../errors.js';
import { adjustLastOutputForFee, convertNameToBinaryAndHex, convertPkhToLockingBytecode, createPlaceholderUnlocker, getAuthorizedContractUtxo, getRunningAuctionUtxo, getThreadUtxo, validateName } from '../util/index.js';
import type { CreateBidCoreParams, FetchBidUtxosParams, FetchBidUtxosResponse } from '../interfaces/index.js';
import { convertAddressToPkh, toCashaddr } from '../util/address.js';

/**
 * Fetches the necessary UTXOs for placing a bid in an auction.
 *
 * @param {FetchBidUtxosParams} params - The parameters required to fetch UTXOs.
 * @returns {Promise<FetchBidUtxosResponse>} A promise that resolves to the required UTXOs.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
 */
export const fetchBidUtxos = async ({
	name,
	category,
	address,
	networkProvider,
	contracts,
	amount,
}: FetchBidUtxosParams): Promise<FetchBidUtxosResponse> =>
{
	const [ registryUtxos, bidUtxos, userUtxos ] = await Promise.all([
		networkProvider.getUtxos(contracts.Registry.address),
		networkProvider.getUtxos(contracts.Bid.address),
		networkProvider.getUtxos(address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category,
		threadContractAddress: contracts.Bid.address,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: bidUtxos,
	});

	const runningAuctionUTXO = getRunningAuctionUtxo({
		name,
		utxos: registryUtxos,
		category,
	});

	const fundingUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + 2000) && !utxo.token);
	if(!fundingUTXO)
	{
		throw new UserUTXONotFoundError();
	}

	return {
		threadNFTUTXO,
		authorizedContractUTXO,
		runningAuctionUTXO,
		fundingUTXO,
	};
};

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

	if(BigInt(amount) < BigInt(Math.ceil(Number(runningAuctionUTXO.satoshis) * (1 + minBidIncreasePercentage / 100))))
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
			to: contracts.Bid.tokenAddress,
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