import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth';
import type { NetworkProvider, Utxo } from 'cashscript';
import { TransactionBuilder } from 'cashscript';
import { fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import { DUST } from './constants.js';
import { InvalidNameError, UserUTXONotFoundError } from './errors.js';
import { convertAddressToPkh, convertNameToBinary, createPlaceholderUnlocker, getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo, isValidName } from './util/index.js';
import type { AuctionConfig, AuctionParams } from './interfaces/auction.js';

/**
 * The AuctionManager class is responsible for managing auction-related operations,
 * including creating auction transactions and retrieving auction data.
 */
export class AuctionManager
{
	private category: string;
	private networkProvider: NetworkProvider;
	private contracts: Record<string, any>;

	/**
	 * Constructs a new AuctionManager instance with the specified configuration parameters.
	 *
	 * @param {AuctionConfig} params - The configuration parameters for the auction manager.
	 */
	constructor(params: AuctionConfig)
	{
		this.category = params.category;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
	}

	/**
	 * Creates a transaction for initiating an auction.
	 *
	 * @param {AuctionParams} params - The parameters for the auction transaction.
	 * @param {string} params.name - The name of the auction.
	 * @param {number} params.amount - The amount for the auction.
	 * @param {string} params.address - The address of the auction initiator.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to a TransactionBuilder object for the auction transaction.
	 * @throws {InvalidNameError} If the auction name is invalid.
	 * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the auction.
	 */
	public async createAuctionTransaction({ name, amount, address }: AuctionParams): Promise<TransactionBuilder>
	{
		if(!isValidName(name))
		{
			throw new InvalidNameError();
		}

		const { nameBin } = convertNameToBinary(name);
		const [ registryUtxos, auctionUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Auction.address),
			this.networkProvider.getUtxos(address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.Auction.address,
		});

		const registrationCounterUTXO = getRegistrationUtxo({
			utxos: registryUtxos,
			category: this.category,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: auctionUtxos,
		});

		const newRegistrationId = parseInt(registrationCounterUTXO.token.nft.commitment, 16) + 1;
		const newRegistrationIdCommitment = newRegistrationId.toString(16).padStart(16, '0');

		const userUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + 2000 + DUST));
		if(!userUTXO)
		{
			throw new UserUTXONotFoundError();
		}

		const userPkh = convertAddressToPkh(address);

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		const transaction = new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.Auction.unlock.call(nameBin))
			.addInput(registrationCounterUTXO, this.contracts.Registry.unlock.call())
			.addInput(userUTXO, placeholderUnlocker)
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: threadNFTUTXO.satoshis,
				token: {
					category: threadNFTUTXO.token.category,
					amount: threadNFTUTXO.token.amount,
					nft: {
						capability: threadNFTUTXO.token.nft.capability,
						commitment: threadNFTUTXO.token.nft.commitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Auction.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: registrationCounterUTXO.satoshis,
				token: {
					category: registrationCounterUTXO.token.category,
					amount: registrationCounterUTXO.token.amount  - BigInt(newRegistrationId),
					nft: {
						capability: registrationCounterUTXO.token.nft.capability,
						commitment: newRegistrationIdCommitment,
					},
				},
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: BigInt(amount),
				token: {
					category: registrationCounterUTXO.token.category,
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
				amount: userUTXO.satoshis - BigInt(amount),
			});

		const transactionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = userUTXO.satoshis - (BigInt(amount) + BigInt(transactionSize));

		return transaction;
	}

	/**
	 * Retrieves all active auctions.
	 *
	 * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
	 */
	public async getAuctions(): Promise<Utxo[]>
	{
		const registryUtxos = await this.networkProvider.getUtxos(this.contracts.Registry.address);

		return registryUtxos.filter((utxo) => utxo.token?.category === this.category && utxo.token?.nft?.capability === 'mutable');
	}

	/**
	 * Retrieves the transaction history of auctions.
	 *
	 * @returns {Promise<{ transactionHex: string; name: string }[]>} A promise that resolves to an array of transaction history objects, each containing a transaction hex and an auction name.
	 */
	public async getHistory(): Promise<{ transactionHex: string; name: string }[]>
	{
		// @ts-ignore
		const history = await fetchHistory(this.networkProvider.electrum, this.contracts.DomainFactory.address);

		const validTransactions = [];

		for(const txn of history)
		{
			// @ts-ignore
			let tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
			let decodedTx = decodeTransaction(hexToBin(tx));

			if(typeof decodedTx === 'string')
			{
				continue;
			}

			if(decodedTx.inputs.length !== 4
				|| decodedTx.outputs.length !== 7
				|| !decodedTx.outputs[0].token?.category || binToHex(decodedTx.outputs[0].token.category) !== this.category
				|| !decodedTx.outputs[2].token?.category || binToHex(decodedTx.outputs[2].token.category) !== this.category
				|| !decodedTx.outputs[3].token?.category || binToHex(decodedTx.outputs[3].token.category) !== this.category
				|| !decodedTx.outputs[4].token?.category || binToHex(decodedTx.outputs[4].token.category) !== this.category
				|| !decodedTx.outputs[5].token?.category || binToHex(decodedTx.outputs[5].token.category) !== this.category
				|| decodedTx.outputs[2].token?.nft?.capability != 'minting'
			)
			{
				continue;
			}

			// @ts-ignore
			const nameHex = binToHex(decodedTx.outputs[5].token?.nft?.commitment).slice(16);
			const name = Buffer.from(nameHex, 'hex').toString('utf8');

			validTransactions.push({
				transactionHex: tx,
				name,
			});
		}

		return validTransactions;
	}
}