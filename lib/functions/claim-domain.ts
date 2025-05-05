import { binToHex, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import {
	adjustLastOutputForFee,
	constructDomainContract,
	convertCashAddressToTokenAddress,
	convertNameToBinaryAndHex,
	convertPkhToLockingBytecode,
	createRegistrationId,
	getAuthorizedContractUtxo,
	getDomainMintingUtxo,
	getRunningAuctionUtxo,
	getThreadUtxo,
	validateName,
} from '../util/index.js';
import type { FetchClaimDomainUtxosParams, CreateClaimDomainTransactionParams } from '../interfaces/index.js';

/**
 * Fetches UTXOs required for claiming a domain.
 *
 * @param {FetchClaimDomainUtxosParams} params - The parameters for fetching UTXOs.
 * @param {string} params.category - The category of the domain.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.domainFactoryContract - The domain factory contract instance.
 * @param {string} params.name - The name of the domain.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain interactions.
 * @returns {Promise<Object>} A promise that resolves to an object containing the necessary UTXOs.
 */
export const fetchClaimDomainUtxos = async ({
	category,
	registryContract,
	domainFactoryContract,
	name,
	networkProvider,
}: FetchClaimDomainUtxosParams): Promise<any> =>
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

	return {
		threadNFTUTXO,
		authorizedContractUTXO,
		domainMintingUTXO,
		runningAuctionUTXO,
	};
};

/**
 * Creates a transaction for claiming a domain.
 *
 * This function constructs a transaction to claim a domain by utilizing various UTXOs
 * and contracts. It ensures the domain name is valid, fetches necessary UTXOs if not provided,
 * and builds a transaction with multiple inputs and outputs to facilitate the domain claim process.
 *
 * @param {CreateClaimDomainTransactionParams} params - The parameters required to create the claim domain transaction.
 * @param {string} params.category - The category of the domain.
 * @param {Contract} params.registryContract - The registry contract instance.
 * @param {Contract} params.domainFactoryContract - The domain factory contract instance.
 * @param {number} params.inactivityExpiryTime - The inactivity expiry time for the domain.
 * @param {number} params.maxPlatformFeePercentage - The maximum platform fee percentage.
 * @param {number} params.minWaitTime - The minimum wait time for the transaction.
 * @param {string} params.name - The name of the domain.
 * @param {NetworkProvider} params.networkProvider - The network provider for blockchain interactions.
 * @param {any} params.options - Additional options for the domain contract.
 * @param {string} [params.platformFeeAddress] - The address to receive the platform fee, if specified.
 * @param {any} [params.utxos] - The UTXOs to be used in the transaction, if already available.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
 * @throws {InvalidNameError} If the domain name is invalid.
 * @throws {Error} If the previous bidder address is invalid.
 */
export const createClaimDomainTransaction = async ({
	category,
	registryContract,
	domainFactoryContract,
	inactivityExpiryTime,
	maxPlatformFeePercentage,
	minWaitTime,
	name,
	networkProvider,
	options,
	platformFeeAddress,
	utxos,
}: CreateClaimDomainTransactionParams): Promise<TransactionBuilder> =>
{
	validateName(name);
	const { nameBin } = convertNameToBinaryAndHex(name);

	if(!utxos)
	{
		utxos = await fetchClaimDomainUtxos({
			category,
			registryContract,
			domainFactoryContract,
			name,
			networkProvider,
		});
	}
	const { threadNFTUTXO, authorizedContractUTXO, domainMintingUTXO, runningAuctionUTXO } = utxos;

	const bidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
	const bidderLockingBytecode = convertPkhToLockingBytecode(bidderPKH);
	const bidderAddressResult = lockingBytecodeToCashAddress({ bytecode: bidderLockingBytecode });

	if(typeof bidderAddressResult !== 'object' || !bidderAddressResult.address)
	{
		throw new Error('Invalid prev bidder address');
	}

	const bidderAddress = bidderAddressResult.address;

	const domainContract = constructDomainContract({
		name: name,
		category,
		inactivityExpiryTime,
		options,
	});

	const registrationId = createRegistrationId(runningAuctionUTXO);

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(threadNFTUTXO, registryContract.unlock.call())
		.addInput(authorizedContractUTXO, domainFactoryContract.unlock.call())
		.addInput(domainMintingUTXO, registryContract.unlock.call())
		.addInput(runningAuctionUTXO, registryContract.unlock.call(), { sequence: minWaitTime })
		.addOutput({
			to: registryContract.tokenAddress,
			amount: threadNFTUTXO.satoshis,
			token: {
				category: threadNFTUTXO.token.category,
				amount: threadNFTUTXO.token.amount + runningAuctionUTXO.token.amount,
				nft: {
					capability: threadNFTUTXO.token.nft.capability,
					commitment: threadNFTUTXO.token.nft.commitment,
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
				category: domainMintingUTXO.token.category,
				amount: domainMintingUTXO.token.amount,
				nft: {
					capability: domainMintingUTXO.token.nft.capability,
					commitment: domainMintingUTXO.token.nft.commitment,
				},
			},
		})
		.addOutput({
			to: domainContract.tokenAddress,
			amount: BigInt(1000),
			token: {
				category: domainMintingUTXO.token.category,
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
				category: domainMintingUTXO.token.category,
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
				category: domainMintingUTXO.token.category,
				amount: BigInt(0),
				nft: {
					capability: 'none',
					commitment: registrationId + binToHex(nameBin),
				},
			},
		});

	const feeRecipient = platformFeeAddress ? platformFeeAddress : bidderAddress;
	const platformFee = runningAuctionUTXO.satoshis * BigInt(maxPlatformFeePercentage) / BigInt(100);

	transaction.addOutput({
		to: feeRecipient,
		amount: platformFee,
	});

	return adjustLastOutputForFee(transaction, runningAuctionUTXO);
};