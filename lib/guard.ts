import { type AddressType, TransactionBuilder, type NetworkProvider, type Utxo } from 'cashscript';
import type { GuardConfig } from './interfaces/guard.js';
import {
	getAllRunningAuctionUtxos,
	getAuthorizedContractUtxo,
	getRunningAuctionUtxo,
	getThreadUtxo,
	constructDomainContract,
	findFirstInvalidCharacterIndex,
} from './util/index.js';
import {
	AuctionNameDoesNotContainInvalidCharacterError,
	DuplicateAuctionsDoNotExistError,
	ExternalAuthNFTUTXONotFoundError,
} from './errors.js';

/**
 * The GuardManager class is responsible for managing guard-related operations,
 * including creating guard transactions and retrieving guard data.
 */
export class GuardManager
{
	private category: string;
	private networkProvider: NetworkProvider;
	private contracts: Record<string, any>;
	private inactivityExpiryTime: number;
	private options: { provider: NetworkProvider; addressType: AddressType };

	/**
	 * Constructs a new GuardManager instance with the specified configuration parameters.
	 *
	 * @param {GuardConfig} params - The configuration parameters for the guard manager.
	 */
	constructor(params: GuardConfig)
	{
		this.category = params.category;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
		this.inactivityExpiryTime = params.inactivityExpiryTime;
		this.options = params.options;
	}


	/**
	 * Proves that an auction name is invalid. Currently logs the name.
	 *
	 * @param {string} name - The auction name to validate.
	 * @returns {Promise<void>} A promise that resolves when the operation is complete.
	 */
	public async penalizeInvalidAuctionName({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{
		const invalidCharacterIndex = findFirstInvalidCharacterIndex(name);

		if(invalidCharacterIndex === -1)
		{
			throw new AuctionNameDoesNotContainInvalidCharacterError();
		}

		const [ registryUtxos, guardUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.AuctionNameEnforcer.address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.AuctionNameEnforcer.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: guardUtxos,
		});

		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.AuctionNameEnforcer.unlock.call(BigInt(invalidCharacterIndex)))
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
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
				to: this.contracts.AuctionNameEnforcer.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: rewardTo,
				amount: runningAuctionUTXO.satoshis,
			});

		const transactionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = runningAuctionUTXO.satoshis - (BigInt(transactionSize * 2));

		return transaction;
	}

	public async penalizeDuplicateAuction({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{

		const [ registryUtxos, guardUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.AuctionConflictResolver.address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.AuctionConflictResolver.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: guardUtxos,
		});

		const auctionUTXOs = getAllRunningAuctionUtxos({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		if(auctionUTXOs.length < 2)
		{
			throw new DuplicateAuctionsDoNotExistError();
		}

		const runningValidAuctionUTXO = auctionUTXOs[0];
		const runningInValidAuctionUTXO = auctionUTXOs[1];

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
		  .addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
		  .addInput(authorizedContractUTXO, this.contracts.AuctionConflictResolver.unlock.call())
		  .addInput(runningValidAuctionUTXO, this.contracts.Registry.unlock.call())
		  .addInput(runningInValidAuctionUTXO, this.contracts.Registry.unlock.call())
		  .addOutput({
		    to: this.contracts.Registry.tokenAddress,
		    amount: threadNFTUTXO.satoshis,
		    token: {
		      category: threadNFTUTXO.token.category,
		      amount: threadNFTUTXO.token.amount + runningInValidAuctionUTXO.token.amount,
		      nft: {
		        capability: threadNFTUTXO.token.nft.capability,
		        commitment: threadNFTUTXO.token.nft.commitment,
		      },
		    },
		  })
		  .addOutput({
		    to: this.contracts.AuctionConflictResolver.tokenAddress,
		    amount: authorizedContractUTXO.satoshis,
		  })
		  .addOutput({
		    to: this.contracts.Registry.tokenAddress,
		    amount: runningValidAuctionUTXO.satoshis,
		    token: {
		      category: runningValidAuctionUTXO.token.category,
		      amount: runningValidAuctionUTXO.token.amount,
		      nft: {
		        capability: runningValidAuctionUTXO.token.nft.capability,
		        commitment: runningValidAuctionUTXO.token.nft.commitment,
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
	}

	public async penalizeIllegalAuction({ name, rewardTo }: { name: string; rewardTo: string }): Promise<TransactionBuilder>
	{
		const domainContract = constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		const [ registryUtxos, guardUtxos, domainUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.DomainOwnershipGuard.address),
			this.networkProvider.getUtxos(domainContract.address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.DomainOwnershipGuard.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: guardUtxos,
		});

		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		// Find the internal authorization NFT UTXO.
		const externalAuthUTXO: Utxo | null = domainUtxos.find(utxo =>
			utxo.token?.nft?.capability === 'none'
			&& utxo.token?.category === this.category
			&& utxo.token?.nft?.commitment.length === 0,
		) || null;

		if(!externalAuthUTXO)
		{
			throw new ExternalAuthNFTUTXONotFoundError();
		}

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.DomainOwnershipGuard.unlock.call())
			.addInput(externalAuthUTXO, domainContract.unlock.useAuth(BigInt(0)))
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
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
				to: this.contracts.DomainOwnershipGuard.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: domainContract.tokenAddress,
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
	}

}