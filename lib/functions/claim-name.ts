import { binToHex, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import {
	adjustLastOutputForFee,
	constructNameContract,
	convertCashAddressToTokenAddress,
	convertNameToBinaryAndHex,
	convertPkhToLockingBytecode,
	createPlaceholderUnlocker,
	createRegistrationId,
	getAuthorizedContractUtxo,
	getCreatorIncentive,
	getNameMintingUtxo,
	getRunningAuctionUtxo,
	getThreadUtxo,
	validateName,
} from '../util/index.js';
import type { fetchClaimNameUtxosParams, CreateClaimNameParams, fetchClaimNameUtxosResponse } from '../interfaces/index.js';
import { InvalidPrevBidderAddressError, UserUTXONotFoundError } from '../errors.js';


/**
 * Derives a CashAddress from a public key hash (PKH) stored in a commitment.
 *
 * @param {string} commitment - The commitment string containing the PKH in the first 40 characters.
 * @returns {string} The derived CashAddress.
 * @throws {InvalidPrevBidderAddressError} If the PKH cannot be extracted or converted to a valid address.
 */
const deriveAddressFromPKHInCommitment = (commitment: string): string =>
{
	const pkh = commitment.slice(0, 40);
	if(!pkh)
	{
		throw new InvalidPrevBidderAddressError();
	}
	const pkhLockingBytecode = convertPkhToLockingBytecode(pkh);
	const pkhAddressResult = lockingBytecodeToCashAddress({ bytecode: pkhLockingBytecode });

	if(typeof pkhAddressResult !== 'object' || !pkhAddressResult.address)
	{
		throw new InvalidPrevBidderAddressError();
	}

	return pkhAddressResult.address;

};

/**
 * Fetches UTXOs required for claiming a name.
 *
 * @param {fetchClaimNameUtxosParams} params - The parameters for fetching UTXOs.
 * @param {string} params.category - The category of the name.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.FactoryContract - The name factory contract instance.
 * @param {string} params.name - The name of the name.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain interactions.
 * @returns {Promise<fetchClaimNameUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
 */
export const fetchClaimNameUtxos = async ({
	category,
	registryContract,
	FactoryContract,
	name,
	networkProvider,
}: fetchClaimNameUtxosParams): Promise<fetchClaimNameUtxosResponse> =>
{
	const [ registryUtxos, FactoryUtxos ] = await Promise.all([
		networkProvider.getUtxos(registryContract.address),
		networkProvider.getUtxos(FactoryContract.address),
	]);


	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category: category,
		threadContractAddress: FactoryContract.address,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: FactoryUtxos,
	});

	const nameMintingUTXO = getNameMintingUtxo({
		utxos: registryUtxos,
		category,
	});

	const runningAuctionUTXO = getRunningAuctionUtxo({
		name,
		utxos: registryUtxos,
		category,
	});

	const bidderAddress = deriveAddressFromPKHInCommitment(runningAuctionUTXO.token!.nft!.commitment);
	const userUtxos = await networkProvider.getUtxos(bidderAddress);

	const biddingReadUTXO = userUtxos.sort((a, b) => Number(a.satoshis - b.satoshis)).find((utxo) => !utxo.token);
	if(!biddingReadUTXO)
	{
		throw new UserUTXONotFoundError();
	}

	return {
		authorizedContractUTXO,
		biddingReadUTXO,
		nameMintingUTXO,
		runningAuctionUTXO,
		threadNFTUTXO,
	};
};

/**
 * Creates a transaction for claiming a name.
 *
 * This function constructs a transaction to claim a name by utilizing various UTXOs
 * and contracts. It ensures the name is valid, fetches necessary UTXOs if not provided,
 * and builds a transaction with multiple inputs and outputs to facilitate the name claim process.
 *
 * @param {CreateClaimNameParams} params - The parameters required to create the claim name transaction.
 * @param {string} params.category - The category of the name.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.FactoryContract - The name factory contract instance.
 * @param {string} params.tld - The TLD of the name.
 * @param {number} params.creatorIncentiveAddress - The creator incentive address.
 * @param {number} params.minWaitTime - The minimum wait time for the transaction.
 * @param {string} params.name - The name.
 * @param {object} params.options - Additional options for the name contract.
 * @param {fetchClaimNameUtxosResponse} [params.utxos] - The UTXOs to be used in the transaction, if already available.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
 * @throws {InvalidNameError} If the name is invalid.
 * @throws {InvalidPrevBidderAddressError} If the previous bidder address is invalid.
 */
export const createClaimNameTransactionCore = async ({
	category,
	registryContract,
	FactoryContract,
	tld,
	minWaitTime,
	name,
	options,
	creatorIncentiveAddress,
	utxos,
}: CreateClaimNameParams): Promise<TransactionBuilder> =>
{
	validateName(name);
	const { nameBin } = convertNameToBinaryAndHex(name);

	const { threadNFTUTXO, authorizedContractUTXO, nameMintingUTXO, runningAuctionUTXO, biddingReadUTXO } = utxos;

	const bidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
	if(!bidderPKH)
	{
		throw new InvalidPrevBidderAddressError();
	}
	const bidderLockingBytecode = convertPkhToLockingBytecode(bidderPKH);
	const bidderAddressResult = lockingBytecodeToCashAddress({ bytecode: bidderLockingBytecode });

	if(typeof bidderAddressResult !== 'object' || !bidderAddressResult.address)
	{
		throw new InvalidPrevBidderAddressError();
	}

	const bidderAddress = bidderAddressResult.address;

	const nameContract = constructNameContract({
		name,
		category,
		tld,
		options,
	});

	const registrationId = createRegistrationId(runningAuctionUTXO);
	const placeholderUnlocker = createPlaceholderUnlocker(bidderAddress);

	const transaction = await new TransactionBuilder({ provider: options.provider })
		.addInput(threadNFTUTXO, registryContract.unlock.call())
		.addInput(authorizedContractUTXO, FactoryContract.unlock.call())
		.addInput(nameMintingUTXO, registryContract.unlock.call())
		.addInput(runningAuctionUTXO, registryContract.unlock.call(), { sequence: minWaitTime })
		.addInput(biddingReadUTXO, placeholderUnlocker)
		.addOutput({
			to: registryContract.tokenAddress,
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
			to: FactoryContract.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: registryContract.tokenAddress,
			amount: nameMintingUTXO.satoshis,
			token: {
				category: nameMintingUTXO.token!.category,
				amount: nameMintingUTXO.token!.amount,
				nft: {
					capability: nameMintingUTXO.token!.nft!.capability,
					commitment: nameMintingUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: nameContract.tokenAddress,
			amount: BigInt(1000),
			token: {
				category: nameMintingUTXO.token!.category,
				amount: BigInt(0),
				nft: {
					capability: 'none',
					commitment: '',
				},
			},
		})
		.addOutput({
			to: nameContract.tokenAddress,
			amount: BigInt(1000),
			token: {
				category: nameMintingUTXO.token!.category,
				amount: BigInt(0),
				nft: {
					capability: 'none',
					commitment: registrationId,
				},
			},
		})
		.addOutput({
			to: convertCashAddressToTokenAddress(bidderAddress),
			amount: BigInt(1000),
			token: {
				category: nameMintingUTXO.token!.category,
				amount: BigInt(0),
				nft: {
					capability: 'none',
					commitment: registrationId + binToHex(nameBin),
				},
			},
		})
		.addOutput({
			to: bidderAddress,
			amount: biddingReadUTXO.satoshis,
		});
	
	const expectedCreatorIncentive = getCreatorIncentive(BigInt(runningAuctionUTXO.satoshis), BigInt(runningAuctionUTXO.token!.amount));

	if(expectedCreatorIncentive > 20_000n)
	{
		transaction.addOutput({
			to: creatorIncentiveAddress,
			amount: expectedCreatorIncentive,
		});
	}

	return adjustLastOutputForFee(transaction, runningAuctionUTXO);
};