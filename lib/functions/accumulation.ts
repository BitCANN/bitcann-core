import { TransactionBuilder } from 'cashscript';
import { adjustLastOutputForFee, getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo } from '../util/index.js';
import { UserUTXONotFoundError } from '../errors.js';
import { createPlaceholderUnlocker, getThreadWithTokenUtxo } from '../util/utxo.js';
import { FetchAccumulationUtxosResponse, FetchAccumulationUtxosParams, AccumulateParams } from '../interfaces/index.js';


/**
 * Fetches UTXOs required for accumulation operations.
 *
 * @param {FetchAccumulationUtxosParams} params - The parameters for fetching UTXOs.
 * @param {object} params.networkProvider - The network provider to fetch UTXOs from.
 * @param {object} params.contracts - The contracts involved in the operation.
 * @param {string} params.category - The category to filter UTXOs.
 * @param {string} params.address - The user's address to fetch UTXOs for.
 * @returns {Promise<FetchAccumulationUtxosResponse>} A promise that resolves to the required UTXOs.
 * @throws {UserUTXONotFoundError} If no suitable user UTXO is found.
 */
export const fetchAccumulationUtxos = async ({ networkProvider, contracts, category, address }: FetchAccumulationUtxosParams): Promise<FetchAccumulationUtxosResponse> =>
{
	const [ registryUtxos, accumulationUtxos, userUtxos ] = await Promise.all([
		networkProvider.getUtxos(contracts.Registry.address),
		networkProvider.getUtxos(contracts.Accumulator.address),
		networkProvider.getUtxos(address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category: category,
		threadContractAddress: contracts.Accumulator.address,
	});

	const threadWithTokenUTXO = getThreadWithTokenUtxo({
		utxos: registryUtxos,
		category: category,
	});

	const registrationCounterUTXO = getRegistrationUtxo({
		utxos: registryUtxos,
		category: category,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: accumulationUtxos,
	});

	const userUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(2000));
	if(!userUTXO)
	{
		throw new UserUTXONotFoundError();
	}

	return {
		threadNFTUTXO,
		registrationCounterUTXO,
		authorizedContractUTXO,
		threadWithTokenUTXO,
		userUTXO,
	};
};


/**
 * Accumulates tokens from thread to the minting utxo.
 *
 * @param {AccumulateParams} params - The parameters for the accumulation process.
 * @param {NetworkProvider} params.networkProvider - The network provider to use for the transaction.
 * @param {Contract} params.registryContract - The registry contract involved in the transaction.
 * @param {Contract} params.accumulatorContract - The accumulator contract involved in the transaction.
 * @param {FetchAccumulationUtxosResponse} params.utxos - The UTXOs to be accumulated.
 * @param {string} params.address - The address to send the accumulated UTXOs to.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the constructed transaction.
 */
export const accumulate = async ({
	networkProvider,
	registryContract,
	accumulatorContract,
	utxos,
	address,
}: AccumulateParams): Promise<TransactionBuilder> =>
{
	const { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, threadWithTokenUTXO, userUTXO } = utxos;

	const placeholderUnlocker = createPlaceholderUnlocker(address);

	// Construct the transaction by adding inputs and outputs
	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, registryContract.unlock.call())
		.addInput(authorizedContractUTXO, accumulatorContract.unlock.call())
		.addInput(registrationCounterUTXO, registryContract.unlock.call())
		.addInput(threadWithTokenUTXO, registryContract.unlock.call())
		.addInput(userUTXO, placeholderUnlocker)
		.addOutput({
			to: registryContract.tokenAddress,
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
			to: accumulatorContract.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: registryContract.tokenAddress,
			amount: registrationCounterUTXO.satoshis,
			token: {
				category: registrationCounterUTXO.token!.category,
				amount: registrationCounterUTXO.token!.amount + threadWithTokenUTXO.token!.amount,
				nft: {
					capability: registrationCounterUTXO.token!.nft!.capability,
					commitment: registrationCounterUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: registryContract.tokenAddress,
			amount: threadWithTokenUTXO.satoshis,
			token: {
				category: threadWithTokenUTXO.token!.category,
				amount: BigInt(0),
				nft: {
					capability: threadWithTokenUTXO.token!.nft!.capability,
					commitment: threadWithTokenUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: address,
			amount: userUTXO.satoshis,
		});

	// Adjust the last output to account for transaction fees
	return adjustLastOutputForFee(transaction, userUTXO);
};