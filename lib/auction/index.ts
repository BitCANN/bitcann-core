import { binToHex } from '@bitauth/libauth';
import type { NetworkProvider, Utxo } from 'cashscript';
import { TransactionBuilder } from 'cashscript';

import { DUST } from '../constants.js';
import { InvalidNameError, UserUTXONotFoundError } from '../errors.js';
import { getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo } from '../util/utxo-util.js';
import type { AuctionConfig, AuctionParams } from './types.js';
import { createPlaceholderUnlocker } from '../util/index.js';
import { convertNameToBinary, isValidName } from '../util/name.js';


export class AuctionManager {
	private category: string;
	private networkProvider: NetworkProvider;
	private contracts: Record<string, any>;

	constructor(params: AuctionConfig) {
		this.category = params.category;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
	}

	public async createAuctionTransaction({ name, amount, address }: AuctionParams): Promise<TransactionBuilder> {
		if(!isValidName(name)) {
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
		if(!userUTXO) {
			throw new UserUTXONotFoundError();
		}

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		return new TransactionBuilder({ provider: this.networkProvider })
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
						commitment: binToHex(convertNameToBinary(address).nameBin) + binToHex(nameBin),
					},
				},
			})
			.addOpReturnOutput([ name ])
			.addOutput({
				to: address,
				amount: userUTXO.satoshis - BigInt(amount + 2000),
			});
	}

	public async getAuctions(): Promise<Utxo[]> {
		const registryUtxos = await this.networkProvider.getUtxos(this.contracts.Registry.address);
		return registryUtxos.filter((utxo) => utxo.token?.category === this.category && utxo.token?.nft?.capability === 'mutable');
	}
}