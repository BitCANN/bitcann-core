import { binToHex } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import { UserUTXONotFoundError } from '../errors.js';
import { adjustLastOutputForFee } from '../util/transaction.js';
import { convertAddressToPkh } from '../util/address.js';
import { convertNameToBinaryAndHex, validateName } from '../util/name.js';
import { createPlaceholderUnlocker, getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo } from '../util/index.js';
import type { CreateAuctionParams, FetchCreateAuctionUtxosParams, FetchCreateAuctionUtxosResponse } from '../interfaces/index.js';

/**
 * Fetches the necessary UTXOs for creating an auction.
 *
 * @param {FetchCreateAuctionUtxosParams} params - The parameters required to fetch UTXOs.
 * @param {number} params.amount - The amount for the auction.
 * @param {string} params.address - The address of the user initiating the auction.
 * @param {NetworkProvider} params.networkProvider - The network provider to fetch UTXOs.
 * @param {Record<string, Contract>} params.contracts - The contracts involved in the auction.
 * @param {string} params.category - The category of the auction.
 * @returns {Promise<FetchCreateAuctionUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the auction.
 */
export const fetchCreateAuctionUtxos = async ({ amount, address, networkProvider, contracts, category }: FetchCreateAuctionUtxosParams): Promise<FetchCreateAuctionUtxosResponse> =>
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

	const userUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + 2000));
	if(!userUTXO)
	{
		throw new UserUTXONotFoundError();
	}

	return { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, userUTXO };
};

/**
 * Creates a transaction for initiating an auction.
 *
 * This function constructs a transaction to start an auction by utilizing various UTXOs and contracts.
 *
 * @param {CreateAuctionParams} params - The parameters for the auction transaction.
 * @param {string} params.name - The name of the auction.
 * @param {number} params.amount - The amount for the auction.
 * @param {string} params.address - The address of the auction initiator.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain interactions.
 * @param {Record<string, Contract>} params.contracts - The contracts involved in the auction.
 * @param {Object} params.utxos - The UTXOs required for the transaction.
 * @param {Utxo} params.utxos.threadNFTUTXO - The UTXO representing the thread NFT.
 * @param {Utxo} params.utxos.registrationCounterUTXO - The UTXO for the registration counter.
 * @param {Utxo} params.utxos.authorizedContractUTXO - The UTXO for the authorized contract.
 * @param {Utxo} params.utxos.userUTXO - The UTXO from the user for funding the auction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the auction transaction.
 * @throws {InvalidNameError} If the auction name is invalid.
 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the auction.
 */
export const createAuctionTransaction = async ({
	name,
	amount,
	address,
	networkProvider,
	contracts,
	utxos,
}: CreateAuctionParams): Promise<TransactionBuilder> =>
{
	// Validate the auction name
	validateName(name);

	// Convert the auction name to binary and hexadecimal formats
	const { nameBin } = convertNameToBinaryAndHex(name);

	// Destructure the necessary UTXOs from the provided utxos object
	const { threadNFTUTXO, registrationCounterUTXO, authorizedContractUTXO, userUTXO } = utxos;

	// Calculate the new registration ID and its commitment
	const newRegistrationId = parseInt(registrationCounterUTXO.token!.nft!.commitment, 16) + 1;
	const newRegistrationIdCommitment = newRegistrationId.toString(16).padStart(16, '0');

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
				amount: registrationCounterUTXO.token!.amount - BigInt(newRegistrationId),
				nft: {
					capability: registrationCounterUTXO.token!.nft!.capability,
					commitment: newRegistrationIdCommitment,
				},
			},
		})
		.addOutput({
			to: contracts.Registry.tokenAddress,
			amount: BigInt(amount),
			token: {
				category: registrationCounterUTXO.token!.category,
				amount: BigInt(newRegistrationId),
				nft: {
					capability: 'mutable',
					commitment: userPkh + binToHex(nameBin),
				},
			},
		})
		.addOpReturnOutput([ name ])
		.addOutput({
			to: address,
			amount: userUTXO.satoshis,
		});

	// Adjust the last output for transaction fees
	return adjustLastOutputForFee(transaction, userUTXO, BigInt(amount));
};