import { type NetworkProvider, TransactionBuilder } from 'cashscript';
import {
	adjustLastOutputForFee,
	convertCashAddressToTokenAddress,
	createPlaceholderUnlocker,
} from '../util/index.js';
import { CreateRecordsCoreParams } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';


/**
 * Builder class for records transactions.
 */
export class RecordsTransactionBuilder
{
	/**
	 * The network provider.
	 */
	networkProvider: NetworkProvider;

	/**
	 * The UTXO manager.
	 */
	utxoManager: UtxoManager;

	/**
	 * Constructs a new RecordsTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 */
	constructor(networkProvider: NetworkProvider, utxoManager: UtxoManager)
	{
		this.networkProvider = networkProvider;
		this.utxoManager = utxoManager;
	}

	/**
	 * Creates a transaction for adding a record to a name.
	 *
	 * @param {CreateRecordsCoreParams} params - The parameters for creating the record transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 */
	build = async ({
		address,
		nameContract,
		records,
		utxos,
	}: CreateRecordsCoreParams): Promise<TransactionBuilder> =>
	{
		const { internalAuthNFTUTXO, ownershipNFTUTXO, fundingUTXO } = utxos;

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(internalAuthNFTUTXO, nameContract.unlock.useAuth(BigInt(1)))
			.addInput(ownershipNFTUTXO, placeholderUnlocker)
			.addInput(fundingUTXO, placeholderUnlocker)
			.addOutput({
				to: nameContract.tokenAddress,
				amount: internalAuthNFTUTXO.satoshis,
				token: {
					category: internalAuthNFTUTXO.token!.category,
					amount: internalAuthNFTUTXO.token!.amount,
					nft: {
						capability: internalAuthNFTUTXO.token!.nft!.capability,
						commitment: internalAuthNFTUTXO.token!.nft!.commitment,
					},
				},
			})
			.addOutput({
				to: convertCashAddressToTokenAddress(address),
				amount: ownershipNFTUTXO.satoshis,
				token: {
					category: ownershipNFTUTXO.token!.category,
					amount: ownershipNFTUTXO.token!.amount,
					nft: {
						capability: ownershipNFTUTXO.token!.nft!.capability,
						commitment: ownershipNFTUTXO.token!.nft!.commitment,
					},
				},
			});

		for(const record of records)
		{
			transaction.addOpReturnOutput([ record ]);
		}

		transaction.addOutput({
			to: address,
			amount: fundingUTXO.satoshis,
		});

		return adjustLastOutputForFee(transaction, fundingUTXO);
	};
}