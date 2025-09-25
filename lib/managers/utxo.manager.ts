import { Contract, type NetworkProvider } from 'cashscript';
import { MINIMAL_DEDUCTION_IN_AUCTION } from '../constants.js';
import {
	DuplicateAuctionsDoNotExistError,
} from '../errors.js';
import type {
	FetchAuctionUtxosParams,
	FetchAuctionUtxosResponse,
	FetchBidUtxosParams,
	FetchBidUtxosResponse,
	FetchClaimNameUtxosParams,
	FetchClaimNameUtxosResponse,
	FetchInvalidNameGuardUtxosParams,
	FetchInvalidNameGuardUtxosResponse,
	FetchRecordsUtxosParams,
	FetchRecordsUtxosResponse,
} from '../interfaces/index.js';
import {
	AccumulationUtxos,
	FetchDuplicateAuctionGuardUtxosParams,
	FetchDuplicateAuctionGuardUtxosResponse,
	FetchIllegalAuctionGuardUtxosParams,
	FetchIllegalAuctionGuardUtxosResponse,
} from '../interfaces/index.js';
import {
	constructNameContract,
	findAllRunningAuctionUtxos,
	findAuthorizedContractUtxo,
	findBiggestUserUTXO,
	findInternalAuthNFTUTXO,
	findNameMintingUtxo,
	findOwnershipNFTUTXO,
	findRegistrationUtxo,
	findRunningAuctionUtxo,
	findThreadUtxo,
} from '../util/index.js';
import { findAnyUserUtxo, findExternalAuthUtxo, findThreadWithTokenUtxo } from '../util/utxo.js';

/**
 * Utility class for fetching UTXOs required for various operations.
 */
export class UtxoManager
{
	networkProvider: NetworkProvider;
	contracts: Record<string, Contract>;
	category: string;
	tld: string;

	constructor(networkProvider: NetworkProvider, contracts: Record<string, Contract>, category: string, tld: string)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
		this.tld = tld;
	}

	/**
     * Fetches UTXOs required for accumulation operations.
     *
     * @param {string} address - The user's address to fetch UTXOs for.
     * @returns {Promise<AccumulationUtxos>} A promise that resolves to the required UTXOs.
     * @throws {UserUTXONotFoundError} If no suitable user UTXO is found.
     */
	async fetchAccumulationUtxos(address: string): Promise<AccumulationUtxos>
	{
		const [ registryUtxos, accumulationUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Accumulator.address),
			this.networkProvider.getUtxos(address),
		]);

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.Accumulator.address,
			}),
			registrationCounterUTXO: findRegistrationUtxo({
				utxos: registryUtxos,
				category: this.category,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: accumulationUtxos,
			}),
			threadWithTokenUTXO: findThreadWithTokenUtxo({
				utxos: registryUtxos,
				category: this.category,
			}),
			userUTXO: findAnyUserUtxo(userUtxos),
		};
	}

	/**
     * Fetches UTXOs required for claiming a name.
     *
     * @param {FetchClaimNameUtxosParams} params - The parameters for fetching UTXOs.
     * @param {string} params.name - The name of the name.
     * @returns {Promise<FetchClaimNameUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
     */
	async fetchClaimNameUtxos({
		name,
	}: FetchClaimNameUtxosParams): Promise<FetchClaimNameUtxosResponse>
	{
		const [ registryUtxos, factoryUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Factory.address),
		]);

		return {
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: factoryUtxos,
			}),
			nameMintingUTXO: findNameMintingUtxo({
				utxos: registryUtxos,
				category: this.category,
			}),
			runningAuctionUTXO: findRunningAuctionUtxo({
				name,
				utxos: registryUtxos,
				category: this.category,
			}),
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.Factory.address,
			}),
		};
	}

	/**
     * Fetches the necessary UTXOs for creating an auction.
     *
     * @param {FetchAuctionUtxosParams} params - The parameters required to fetch UTXOs.
     * @param {number} params.amount - The amount for the auction.
     * @param {string} params.address - The address of the user initiating the auction.
     * @param {string} params.category - The category of the auction.
     * @returns {Promise<FetchAuctionUtxosResponse>} A promise that resolves to an object containing the necessary UTXOs.
     * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the auction.
     */
	async fetchAuctionUtxos({ amount, address }: FetchAuctionUtxosParams): Promise<FetchAuctionUtxosResponse>
	{
		const [ registryUtxos, auctionUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Auction.address),
			this.networkProvider.getUtxos(address),
		]);

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.Auction.address,
			}),
			registrationCounterUTXO: findRegistrationUtxo({
				utxos: registryUtxos,
				category: this.category,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: auctionUtxos,
			}),
			userUTXO: findAnyUserUtxo(userUtxos, amount + Number(MINIMAL_DEDUCTION_IN_AUCTION)),
		};

	}

	/**
     * Fetches the necessary UTXOs for placing a bid in an auction.
     *
     * @param {FetchBidUtxosParams} params - The parameters required to fetch UTXOs.
     * @returns {Promise<FetchBidUtxosResponse>} A promise that resolves to the required UTXOs.
     * @throws {UserUTXONotFoundError} If no suitable UTXO is found for funding the bid.
     */
	async fetchBidUtxos({
		name,
		address,
		amount,
	}: FetchBidUtxosParams): Promise<FetchBidUtxosResponse>
	{
		const [ registryUtxos, bidUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Bid.address),
			this.networkProvider.getUtxos(address),
		]);

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.Bid.address,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: bidUtxos,
			}),
			runningAuctionUTXO: findRunningAuctionUtxo({
				name,
				utxos: registryUtxos,
				category: this.category,
			}),
			fundingUTXO: findAnyUserUtxo(userUtxos, amount + Number(MINIMAL_DEDUCTION_IN_AUCTION)),
		};
	}

	/**
     * Fetches the UTXOs required for creating records.
     *
     * @param {FetchRecordsUtxosParams} params - The parameters for fetching UTXOs.
     * @returns {Promise<FetchRecordsUtxosResponse>} A promise that resolves to the fetched UTXOs.
     */
	async fetchRecordsUtxos({
		name,
		nameContract,
		address,
	}: FetchRecordsUtxosParams): Promise<FetchRecordsUtxosResponse>
	{
		const [ nameUTXOs, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(nameContract.address),
			this.networkProvider.getUtxos(address),
		]);

		return {
			internalAuthNFTUTXO: findInternalAuthNFTUTXO(nameUTXOs, this.category),
			ownershipNFTUTXO: findOwnershipNFTUTXO(userUtxos, this.category, name),
			fundingUTXO: findBiggestUserUTXO(userUtxos),
		};
	}

	/**
     * Fetches UTXOs required for penalizing a duplicate auction.
     *
     * @param {FetchDuplicateAuctionGuardUtxosParams} params - The parameters required to fetch UTXOs.
     * @returns {Promise<FetchDuplicateAuctionGuardUtxosResponse>} A promise that resolves to the required UTXOs.
     * @throws {DuplicateAuctionsDoNotExistError} If less than two duplicate auctions exist.
     */
	async fetchDuplicateAuctionGuardUtxos({
		name,
	}: FetchDuplicateAuctionGuardUtxosParams): Promise<FetchDuplicateAuctionGuardUtxosResponse>
	{
		const [ registryUtxos, guardUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.ConflictResolver.address),
		]);

		const auctionUTXOs = findAllRunningAuctionUtxos({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		if(auctionUTXOs.length < 2)
		{
			throw new DuplicateAuctionsDoNotExistError();
		}

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.ConflictResolver.address,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: guardUtxos,
			}),
			runningValidAuctionUTXO: auctionUTXOs[0],
			runningInValidAuctionUTXO: auctionUTXOs[1],
		};
	}

	/**
 * Fetches UTXOs required for penalizing an illegal auction.
 *
 * @param {FetchIllegalAuctionGuardUtxosParams} params - The parameters required to fetch UTXOs.
 * @returns {Promise<FetchIllegalAuctionGuardUtxosResponse>} A promise that resolves to the required UTXOs.
 * @throws {ExternalAuthNFTUTXONotFoundError} If the external authorization NFT UTXO is not found.
 */
	async fetchIllegalAuctionGuardUtxos({
		name,
	}: FetchIllegalAuctionGuardUtxosParams): Promise<FetchIllegalAuctionGuardUtxosResponse>
	{
		const nameContract = constructNameContract({
			name,
			category: this.category,
			provider: this.networkProvider,
			tld: this.tld,
		});

		const [ registryUtxos, guardUtxos, nameUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.OwnershipGuard.address),
			this.networkProvider.getUtxos(nameContract.address),
		]);

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.OwnershipGuard.address,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: guardUtxos,
			}),
			runningAuctionUTXO: findRunningAuctionUtxo({
				name,
				utxos: registryUtxos,
				category: this.category,
			}),
			externalAuthUTXO: findExternalAuthUtxo({
				utxos: nameUtxos,
				category: this.category,
			}),
		};
	}

	/**
     * Fetches UTXOs required for penalizing an invalid auction name.
     *
     * @param {FetchInvalidNameGuardUtxosParams} params - The parameters required to fetch UTXOs.
     * @returns {Promise<FetchInvalidNameGuardUtxosResponse>} A promise that resolves to the required UTXOs.
     */
	async fetchInvalidNameGuardUtxos({
		name,
	}: FetchInvalidNameGuardUtxosParams): Promise<FetchInvalidNameGuardUtxosResponse>
	{
		const [ registryUtxos, guardUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.NameEnforcer.address),
		]);

		return {
			threadNFTUTXO: findThreadUtxo({
				utxos: registryUtxos,
				category: this.category,
				threadContractAddress: this.contracts.NameEnforcer.address,
			}),
			authorizedContractUTXO: findAuthorizedContractUtxo({
				utxos: guardUtxos,
			}),
			runningAuctionUTXO: findRunningAuctionUtxo({
				name,
				utxos: registryUtxos,
				category: this.category,
			}),
		};

	}
}
