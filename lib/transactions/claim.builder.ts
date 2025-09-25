import { binToHex, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { type AddressType, Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { MINIMAL_CREATOR_INCENTIVE } from '../constants.js';
import { InvalidPrevBidderAddressError } from '../errors.js';
import type { CreateClaimNameParams } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import {
	constructNameContract,
	convertCashAddressToTokenAddress,
	convertNameToBinaryAndHex,
	convertPkhToLockingBytecode,
	createRegistrationId,
	getCreatorIncentive,
	validateName,
} from '../util/index.js';


/**
 * Builder class for accumulation transactions.
 */
export class ClaimNameTransactionBuilder
{
	/**
	 * The network provider.
	 */
	networkProvider: NetworkProvider;

	/**
	 * The set of contracts involved in the accumulation process.
	 */
	contracts: Record<string, Contract>;

	/**
	 * The token category.
	 */
	category: string;

	/**
	 * The UTXO manager.
	 */
	utxoManager: UtxoManager;

	/**
	 * The TLD of the name.
	 */
	tld: string;

	/**
	 * The options for the name contract.
	 */
	options: { provider: NetworkProvider; addressType: AddressType };

	/**
	 * The minimum wait time for the transaction.
	 */
	minWaitTime: number;

	/**
	 * The creator incentive address.
	 */
	creatorIncentiveAddress: string;

	/**
	 * Constructs a new ClaimNameTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {Record<string, Contract>} contracts - The contracts used in the transaction.
	 * @param {string} category - The token category.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 * @param {string} tld - The TLD of the name.
	 * @param {number} minWaitTime - The minimum wait time for the transaction.
	 * @param {string} creatorIncentiveAddress - The creator incentive address.
	 */
	constructor(
		networkProvider: NetworkProvider,
		utxoManager: UtxoManager,
		contracts: Record<string, Contract>,
		category: string,
		tld: string,
		minWaitTime: number,
		creatorIncentiveAddress: string,
	)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
		this.utxoManager = utxoManager;
		this.tld = tld;
		this.minWaitTime = minWaitTime;
		this.creatorIncentiveAddress = creatorIncentiveAddress;
	}

	/**
	 * Creates a transaction for claiming a name.
	 *
	 * This function constructs a transaction to claim a name by utilizing various UTXOs
	 * and contracts. It ensures the name is valid, fetches necessary UTXOs if not provided,
	 * and builds a transaction with multiple inputs and outputs to facilitate the name claim process.
	 *
	 * @param {CreateClaimNameParams} params - The parameters required to create the claim name transaction.
	 * @param {string} params.name - The name.
	 * @param {fetchClaimNameUtxosResponse} [params.utxos] - The UTXOs to be used in the transaction, if already available.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 * @throws {InvalidNameError} If the name is invalid.
	 * @throws {InvalidPrevBidderAddressError} If the previous bidder address is invalid.
	 */
	build = async ({
		name,
		utxos,
	}: CreateClaimNameParams): Promise<TransactionBuilder> =>
	{
		validateName(name);
		const { nameBin } = convertNameToBinaryAndHex(name);

		if(!utxos)
		{
			utxos = await this.utxoManager.fetchClaimNameUtxos({ name });
		}

		const { threadNFTUTXO, authorizedContractUTXO, nameMintingUTXO, runningAuctionUTXO } = utxos;

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
			category: this.category,
			tld: this.tld,
			provider: this.networkProvider,
		});

		const registrationId = createRegistrationId(runningAuctionUTXO);

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.registryContract.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.factoryContract.unlock.call())
			.addInput(nameMintingUTXO, this.contracts.registryContract.unlock.call())
			.addInput(runningAuctionUTXO, this.contracts.registryContract.unlock.call(), { sequence: this.minWaitTime })
			.addOutput({
				to: this.contracts.registryContract.tokenAddress,
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
				to: this.contracts.factoryContract.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.registryContract.tokenAddress,
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
			});

		const expectedCreatorIncentive = getCreatorIncentive(BigInt(runningAuctionUTXO.satoshis), BigInt(runningAuctionUTXO.token!.amount));

		if(expectedCreatorIncentive > MINIMAL_CREATOR_INCENTIVE)
		{
			transaction.addOutput({
				to: this.creatorIncentiveAddress,
				amount: expectedCreatorIncentive,
			});
		}

		return transaction;
	};
}
