import { binToHex } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import { UserUTXONotFoundError } from '../errors.js';
import { adjustLastOutputForFee } from '../util/transaction.js';
import { convertAddressToPkh } from '../util/address.js';
import { convertNameToBinaryAndHex, validateName } from '../util/name.js';
import { createPlaceholderUnlocker, getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo, padVmNumber } from '../util/index.js';
import type { CreateAuctionCoreParams, FetchAuctionUtxosParams, FetchAuctionUtxosResponse } from '../interfaces/index.js';

/**
 * Fetches the necessary UTXOs for creating an auction.
 *
 * @param {FetchAuctionUtxosParams} params - The parameters required to fetch UTXOs.
 * @param {number} params.amount - The amount for the auction.
 * @param {string} params.address - The address of the user initiating the auction.
 * @param {NetworkProvider} params.networkProvider - The network provider to fetch UTXOs.
 * @param {Record<string, Contract>} params.contracts - The contracts involved in the auction.
 * @param {string} params.category - The category of the auction.
 * @returns {Promise<FetchAuctionUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the auction.
 */
export const fetchAuctionUtxos = async ({ amount, address, networkProvider, contracts, category }: FetchAuctionUtxosParams): Promise<FetchAuctionUtxosResponse> =>
{
	const [ registryUtxos, auctionUtxos, userUtxos ] = await Promise.all([
		networkProvider.getUtxos(contracts.Registry.address),
		networkProvider.getUtxos(contracts.Auction.address),
		networkProvider.getUtxos(address),
	]);

	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category: category,
		threadContractAddress: contracts.Auction.address,
	});

	const registrationCounterUTXO = getRegistrationUtxo({
		utxos: registryUtxos,
		category: category,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: auctionUtxos,
	});

	const userUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + 5000));
	if(!userUTXO)
	{
		throw new UserUTXONotFoundError();
	}

	return { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, userUTXO };
};

/**
/**
 * Constructs a transaction to initiate an auction.
 *
 * This function creates a transaction to start an auction using various UTXOs and contracts.
 *
 * @param {CreateAuctionCoreParams} params - The parameters for constructing the auction transaction.
 * @param {string} params.name - The name to be auctioned.
 * @param {number} params.amount - The initial bid amount for the auction.
 * @param {string} params.address - The address of the auction creator.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain operations.
 * @param {Record<string, Contract>} params.contracts - The contracts associated with the auction.
 * @param {FetchAuctionUtxosResponse} params.utxos - The UTXOs necessary for the transaction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the auction transaction.
 * @throws {InvalidNameError} If the provided auction name is invalid.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found to fund the auction.
 */
export const createAuctionTransactionCore = async ({
	name,
	amount,
	address,
	networkProvider,
	contracts,
	utxos,
}: CreateAuctionCoreParams): Promise<TransactionBuilder> =>
{
	// Validate the auction name
	validateName(name);

	// Convert the auction name to binary and hexadecimal formats
	const { nameBin } = convertNameToBinaryAndHex(name);

	// Destructure the necessary UTXOs from the provided utxos object
	const { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, userUTXO }: FetchAuctionUtxosResponse = utxos;

	// Calculate the new registration ID and its commitment
	const currentRegistrationId = parseInt(registrationCounterUTXO.token!.nft!.commitment, 16);
	const nextRegistrationIdCommitment = padVmNumber(BigInt(currentRegistrationId + 1), 8);

	// Convert the user's address to a public key hash
	const userPkh = convertAddressToPkh(address);

	// Create a placeholder unlocker for the user's UTXO
	const placeholderUnlocker = createPlaceholderUnlocker(address);

	// Construct the transaction using the TransactionBuilder
	const transaction = new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, contracts.Registry.unlock.call())
		.addInput(authorizedContractUTXO, contracts.Auction.unlock.call(nameBin))
		.addInput(registrationCounterUTXO, contracts.Registry.unlock.call())
		.addInput(userUTXO, placeholderUnlocker)
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
			to: contracts.Auction.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: registrationCounterUTXO.satoshis,
			token: {
				category: registrationCounterUTXO.token!.category,
				amount: registrationCounterUTXO.token!.amount - BigInt(currentRegistrationId),
				nft: {
					capability: registrationCounterUTXO.token!.nft!.capability,
					commitment: nextRegistrationIdCommitment,
				},
			},
		})
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: BigInt(amount),
			token: {
				category: registrationCounterUTXO.token!.category,
				amount: BigInt(currentRegistrationId),
				nft: {
					capability: 'mutable',
					commitment: userPkh + binToHex(nameBin),
				},
			},
		})
		.addOutput({
			to: address,
			amount: userUTXO.satoshis,
		});

	// Adjust the last output for transaction fees
	return adjustLastOutputForFee(transaction, userUTXO, BigInt(amount));
};