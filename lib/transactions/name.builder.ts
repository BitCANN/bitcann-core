import { type Contract, type NetworkProvider, TransactionBuilder } from 'cashscript';
import { CreateRecordsParams } from '../interfaces/index.js';
import { UtxoManager } from '../managers/utxo.manager.js';
import {
	adjustLastOutputForFee,
	constructNameContract,
	convertCashAddressToTokenAddress,
	createPlaceholderUnlocker,
} from '../util/index.js';


/**
 * Builder class for name transactions.
 */
export class NameTransactionBuilder
{
	/**
	 * The network provider.
	 */
	private networkProvider: NetworkProvider;

	/**
	 * The UTXO manager.
	 */
	private utxoManager: UtxoManager;

	/**
	 * The category.
	 */
	private category: string;

	/**
	 * The TLD.
	 */
	private tld: string;

	/**
	 * The min expiry time for a name to expire due to inactivity
	 */
	private inactivityExpiryTime: number;

	/**
	 * Constructs a new NameTransactionBuilder.
	 *
	 * @param {NetworkProvider} networkProvider - The network provider instance.
	 * @param {UtxoManager} utxoManager - The UTXO manager.
	 * @param {string} category - The category.
	 * @param {string} tld - The TLD.
	 */
	constructor(networkProvider: NetworkProvider, utxoManager: UtxoManager, category: string, tld: string, inactivityExpiryTime: number)
	{
		this.networkProvider = networkProvider;
		this.utxoManager = utxoManager;
		this.category = category;
		this.tld = tld;
		this.inactivityExpiryTime = inactivityExpiryTime;
	}

	getNameContract = (name: string): Contract =>
	{
		return constructNameContract({
			name: name,
			category: this.category,
			tld: this.tld,
			provider: this.networkProvider,
		});
	};

	/**
	 * Creates a transaction for adding a record to a name.
	 *
	 * @param {CreateRecordsParams} params - The parameters for creating the name transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 */
	build = async ({ address, name, records, utxos }: CreateRecordsParams): Promise<TransactionBuilder> =>
	{
		const nameContract = this.getNameContract(name);

		if(!utxos)
		{
			utxos = await this.utxoManager.fetchRecordsUtxos({
				name,
				category: this.category,
				nameContract,
				address,
				networkProvider: this.networkProvider,
			});
		}
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

	expireName = async (name: string): Promise<Contract> =>
	{
		const nameContract = this.getNameContract(name);

		return nameContract;
	};

	buildResolveOwnershipConflictTransaction = (): void =>
	{

	};

	buildRenounceOwnershipTransaction = (): void =>
	{

	};

	buildPenaliseInvalidNameTransaction = (): void =>
	{

	};
}
