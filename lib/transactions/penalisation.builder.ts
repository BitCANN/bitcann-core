import { Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { AuctionNameDoesNotContainInvalidCharacterError } from '../errors.js';
import { PenaliseDuplicateAuctionCoreParams, PenaliseIllegalAuctionCoreParams, PenalizeInvalidNameCoreParams } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import { adjustLastOutputForFee, constructNameContract, findFirstInvalidCharacterIndex } from '../util/index.js';


/**
 * Builder class for penalize transactions.
 */
export class PenalisationTransactionBuilder
{
	/**
	 * The network provider.
	 */
	networkProvider: NetworkProvider;
	/**
	 * The contracts.
	 */
	contracts: Record<string, Contract>;
	/**
	 * The category.
	 */
	category: string;
	/**
	 * The TLD.
	 */
	tld: string;
	/**
	 * The minimum wait time.
	 */
	minWaitTime: number;

	/**
	 * The UTXO manager.
	 */
	utxoManager: UtxoManager;

	/**
	 * Constructs a new PenalisationTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {Record<string, Contract>} contracts - The contracts used in the transaction.
	 * @param {string} category - The category.
	 * @param {string} tld - The TLD.
	 * @param {number} minWaitTime - The minimum wait time.
	 */
	constructor(
		networkProvider: NetworkProvider,
		contracts: Record<string, Contract>,
		category: string,
		tld: string,
		minWaitTime: number,
		utxoManager: UtxoManager,
	)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
		this.tld = tld;
		this.minWaitTime = minWaitTime;
		this.utxoManager = utxoManager;
	}

	/**
	 * Constructs a transaction to penalise a duplicate auction.
	 *
	 * @param {PenaliseDuplicateAuctionCoreParams} params - The parameters required to penalise a duplicate auction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	buildPenaliseDuplicateAuctionTransaction = async ({
		name,
		rewardTo,
		utxos,
	}: PenaliseDuplicateAuctionCoreParams): Promise<TransactionBuilder> =>
	{
		if(!utxos)
		{
			utxos = await this.utxoManager.fetchDuplicateAuctionGuardUtxos({ name });
		}
		const { threadNFTUTXO, authorizedContractUTXO, runningValidAuctionUTXO, runningInValidAuctionUTXO } = utxos;

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.ConflictResolver.unlock.call())
			.addInput(runningValidAuctionUTXO, this.contracts.Registry.unlock.call())
			.addInput(runningInValidAuctionUTXO, this.contracts.Registry.unlock.call())
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: threadNFTUTXO.satoshis,
				token: {
					category: threadNFTUTXO.token!.category,
					amount: threadNFTUTXO.token!.amount + runningInValidAuctionUTXO.token!.amount,
					nft: {
						capability: threadNFTUTXO.token!.nft!.capability,
						commitment: threadNFTUTXO.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.ConflictResolver.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: runningValidAuctionUTXO.satoshis,
				token: {
					category: runningValidAuctionUTXO.token!.category,
					amount: runningValidAuctionUTXO.token!.amount,
					nft: {
						capability: runningValidAuctionUTXO.token!.nft!.capability,
						commitment: runningValidAuctionUTXO.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: rewardTo,
				amount: runningInValidAuctionUTXO.satoshis,
			});

		const transactionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = runningInValidAuctionUTXO.satoshis - (BigInt(transactionSize * 2));

		return transaction;
	};


	/**
	 * Constructs a transaction to penalise an illegal auction.
	 *
	 * @param {PenaliseIllegalAuctionCoreParams} params - The parameters required to penalise an illegal auction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 */
	buildPenaliseIllegalAuctionTransaction = async ({
		name,
		rewardTo,
		utxos,
	}: PenaliseIllegalAuctionCoreParams): Promise<TransactionBuilder> =>
	{
		if(!utxos)
		{
			utxos = await this.utxoManager.fetchIllegalAuctionGuardUtxos({ name });
		}

		const nameContract = constructNameContract({
			name,
			category: this.category,
			tld: this.tld,
			provider: this.networkProvider,
		});

		const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO, externalAuthUTXO } = utxos;

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.OwnershipGuard.unlock.call())
			.addInput(externalAuthUTXO, nameContract.unlock.useAuth(BigInt(0)))
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
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
				to: this.contracts.OwnershipGuard.tokenAddress,
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

	/**
	 * Constructs a transaction to penalise an invalid auction name.
	 *
	 * @param {PenaliseInvalidAuctionNameCoreParams} params - The parameters required to penalise an invalid auction name.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the transaction.
	 * @throws {AuctionNameDoesNotContainInvalidCharacterError} If the auction name does not contain an invalid character.
	 */
	buildPenaliseInvalidAuctionNameTransaction = async ({
		name,
		rewardTo,
		utxos,
	}: PenalizeInvalidNameCoreParams): Promise<TransactionBuilder> =>
	{
		const invalidCharacterIndex = findFirstInvalidCharacterIndex(name);

		if(invalidCharacterIndex === -1)
		{
			throw new AuctionNameDoesNotContainInvalidCharacterError();
		}
		if(!utxos)
		{
			utxos = await this.utxoManager.fetchInvalidNameGuardUtxos({
				name,
				category: this.category,
				networkProvider: this.networkProvider,
				contracts: this.contracts,
			});
		}

		const { threadNFTUTXO, authorizedContractUTXO, runningAuctionUTXO } = utxos;


		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.NameEnforcer.unlock.call(BigInt(invalidCharacterIndex)))
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: threadNFTUTXO.satoshis,
				token: {
					category: threadNFTUTXO!.token!.category,
					amount: threadNFTUTXO!.token!.amount + runningAuctionUTXO!.token!.amount,
					nft: {
						capability: threadNFTUTXO!.token!.nft!.capability,
						commitment: threadNFTUTXO!.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.NameEnforcer.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: rewardTo,
				amount: runningAuctionUTXO.satoshis,
			});

		return adjustLastOutputForFee(transaction, runningAuctionUTXO);
	};
}
