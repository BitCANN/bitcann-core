import { Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { AccumulateParams, AccumulationUtxos } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import { adjustLastOutputForFee, createPlaceholderUnlocker } from '../util/index.js';

/**
 * Builder class for accumulation transactions.
 */
export class AccumulationTransactionBuilder
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
	 * Constructs a new AccumulationTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {Record<string, Contract>} contracts - The contracts used in the transaction.
	 * @param {string} category - The token category.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 */
	constructor(networkProvider: NetworkProvider, contracts: Record<string, Contract>, category: string, utxoManager: UtxoManager)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
		this.utxoManager = utxoManager;
	}

	/**
	 * Builds an accumulation transaction.
	 *
	 * @param {AccumulateParams} params - The parameters for building the transaction.
	 * @param {AccumulationUtxos} [params.utxos] - The UTXOs to use; if not provided, they will be fetched.
	 * @param {string} params.address - The address to send the accumulated UTXOs to.
	 * @returns {Promise<TransactionBuilder>} The constructed transaction builder.
	 */
	build = async ({ utxos, address }: AccumulateParams): Promise<TransactionBuilder> =>
	{
		// Fetch UTXOs if not provided
		if(!utxos)
		{
			utxos = await this.utxoManager.fetchAccumulationUtxos(address);
		}
		const {
			threadNFTUTXO,
			registrationCounterUTXO,
			authorizedContractUTXO,
			threadWithTokenUTXO,
			userUTXO,
		} = utxos as AccumulationUtxos;

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		/**
		 * Construct the transaction by adding all required inputs and outputs.
		 * - Inputs: thread NFT, authorized contract, registration counter, thread with token, user UTXO.
		 * - Outputs:
		 *   1. Return thread NFT to registry contract.
		 *   2. Return authorized contract UTXO to accumulator contract.
		 *   3. Return registration counter UTXO to registry contract, with updated token amount.
		 *   4. Return thread with token UTXO to registry contract, with token amount set to 0.
		 *   5. Return remaining BCH to the user's address.
		 */
		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.registryContract.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.accumulatorContract.unlock.call())
			.addInput(registrationCounterUTXO, this.contracts.registryContract.unlock.call())
			.addInput(threadWithTokenUTXO, this.contracts.registryContract.unlock.call())
			.addInput(userUTXO, placeholderUnlocker)
			.addOutput({
				to: this.contracts.registryContract.tokenAddress,
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
				to: this.contracts.accumulatorContract.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.registryContract.tokenAddress,
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
				to: this.contracts.registryContract.tokenAddress,
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
}
