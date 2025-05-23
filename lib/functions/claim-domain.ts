import { binToHex, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import {
	adjustLastOutputForFee,
	constructDomainContract,
	convertCashAddressToTokenAddress,
	convertNameToBinaryAndHex,
	convertPkhToLockingBytecode,
	createPlaceholderUnlocker,
	createRegistrationId,
	getAuthorizedContractUtxo,
	getDomainMintingUtxo,
	getRunningAuctionUtxo,
	getThreadUtxo,
	validateName,
} from '../util/index.js';
import type { FetchClaimDomainUtxosParams, CreateClaimDomainParams, FetchClaimDomainUtxosResponse } from '../interfaces/index.js';
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
 * Fetches UTXOs required for claiming a domain.
 *
 * @param {FetchClaimDomainUtxosParams} params - The parameters for fetching UTXOs.
 * @param {string} params.category - The category of the domain.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.domainFactoryContract - The domain factory contract instance.
 * @param {string} params.name - The name of the domain.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain interactions.
 * @returns {Promise<FetchClaimDomainUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
 */
export const fetchClaimDomainUtxos = async ({
	category,
	registryContract,
	domainFactoryContract,
	name,
	networkProvider,
}: FetchClaimDomainUtxosParams): Promise<FetchClaimDomainUtxosResponse> =>
{
	const [ registryUtxos, domainFactoryUtxos ] = await Promise.all([
		networkProvider.getUtxos(registryContract.address),
		networkProvider.getUtxos(domainFactoryContract.address),
	]);


	const threadNFTUTXO = getThreadUtxo({
		utxos: registryUtxos,
		category: category,
		threadContractAddress: domainFactoryContract.address,
	});

	const authorizedContractUTXO = getAuthorizedContractUtxo({
		utxos: domainFactoryUtxos,
	});

	const domainMintingUTXO = getDomainMintingUtxo({
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
		domainMintingUTXO,
		runningAuctionUTXO,
		threadNFTUTXO,
	};
};

/**
 * Creates a transaction for claiming a domain.
 *
 * This function constructs a transaction to claim a domain by utilizing various UTXOs
 * and contracts. It ensures the domain name is valid, fetches necessary UTXOs if not provided,
 * and builds a transaction with multiple inputs and outputs to facilitate the domain claim process.
 *
 * @param {CreateClaimDomainParams} params - The parameters required to create the claim domain transaction.
 * @param {string} params.category - The category of the domain.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.domainFactoryContract - The domain factory contract instance.
 * @param {number} params.inactivityExpiryTime - The inactivity expiry time for the domain.
 * @param {number} params.maxPlatformFeePercentage - The maximum platform fee percentage.
 * @param {number} params.minWaitTime - The minimum wait time for the transaction.
 * @param {string} params.name - The name of the domain.
 * @param {object} params.options - Additional options for the domain contract.
 * @param {string} [params.platformFeeAddress] - The address to receive the platform fee, if specified.
 * @param {FetchClaimDomainUtxosResponse} [params.utxos] - The UTXOs to be used in the transaction, if already available.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
 * @throws {InvalidNameError} If the domain name is invalid.
 * @throws {InvalidPrevBidderAddressError} If the previous bidder address is invalid.
 */
export const createClaimDomainTransactionCore = async ({
	category,
	registryContract,
	domainFactoryContract,
	inactivityExpiryTime,
	maxPlatformFeePercentage,
	minWaitTime,
	name,
	options,
	platformFeeAddress,
	utxos,
}: CreateClaimDomainParams): Promise<TransactionBuilder> =>
{
	validateName(name);
	const { nameBin } = convertNameToBinaryAndHex(name);

	const { threadNFTUTXO, authorizedContractUTXO, domainMintingUTXO, runningAuctionUTXO, biddingReadUTXO } = utxos;

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

	const domainContract = constructDomainContract({
		name: name,
		category,
		inactivityExpiryTime,
		options,
	});

	const registrationId = createRegistrationId(runningAuctionUTXO);
	const placeholderUnlocker = createPlaceholderUnlocker(bidderAddress);

	const transaction = await new TransactionBuilder({ provider: options.provider })
		.addInput(threadNFTUTXO, registryContract.unlock.call())
		.addInput(authorizedContractUTXO, domainFactoryContract.unlock.call())
		.addInput(domainMintingUTXO, registryContract.unlock.call())
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
			to: domainFactoryContract.tokenAddress,
			amount: authorizedContractUTXO.satoshis,
		})
		.addOutput({
			to: registryContract.tokenAddress,
			amount: domainMintingUTXO.satoshis,
			token: {
				category: domainMintingUTXO.token!.category,
				amount: domainMintingUTXO.token!.amount,
				nft: {
					capability: domainMintingUTXO.token!.nft!.capability,
					commitment: domainMintingUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: domainContract.tokenAddress,
			amount: BigInt(1000),
			token: {
				category: domainMintingUTXO.token!.category,
				amount: BigInt(0),
				nft: {
					capability: 'none',
					commitment: '',
				},
			},
		})
		.addOutput({
			to: domainContract.tokenAddress,
			amount: BigInt(1000),
			token: {
				category: domainMintingUTXO.token!.category,
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
				category: domainMintingUTXO.token!.category,
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

	const feeRecipient = platformFeeAddress ? platformFeeAddress : bidderAddress;
	const platformFee = runningAuctionUTXO.satoshis * BigInt(maxPlatformFeePercentage) / BigInt(100);

	transaction.addOutput({
		to: feeRecipient,
		amount: platformFee,
	});

	return adjustLastOutputForFee(transaction, runningAuctionUTXO);
};