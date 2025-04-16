import { DomainStatusType } from './interfaces/domain.js';
import { ManagerConfig } from './interfaces/common.js';
import {
	NetworkProvider,
	ElectrumNetworkProvider,
	Contract,
	AddressType,
	TransactionBuilder,
	Unlocker,
	Utxo,
} from 'cashscript';
import { InvalidNameError, UserUTXONotFoundError } from './errors.js';
import { isValidName } from './util/name.js';
import { binToHex, hexToBin } from '@bitauth/libauth';
import { convertAddressToPkh, convertPkhToLockingBytecode, getAuthorizedContractUtxo, getRegistrationUtxo, getThreadUtxo } from './util/utxo-util.js';
import { pushDataHex } from './util/index.js';
import { buildLockScriptP2SH32 } from './util/index.js';
import { lockScriptToAddress } from './util/index.js';

import Accumulator from './contracts/Accumulator.json';
import Auction from './contracts/Auction.json';
import AuctionConflictResolver from './contracts/AuctionConflictResolver.json';
import AuctionNameEnforcer from './contracts/AuctionNameEnforcer.json';
import Bid from './contracts/Bid.json';
import Domain from './contracts/Domain.json';
import DomainFactory from './contracts/DomainFactory.json';
import DomainOwnershipGuard from './contracts/DomainOwnershipGuard.json';
import Registry from './contracts/Registry.json';
import { DUST } from './constants.js';


export class BitCANNManager 
{
	// Config to build the contracts in the BitCANN system.
	public category: string;
	public minStartingBid: number;
	public minBidIncreasePercentage: number;
	public inactivityExpiryTime: number;
	public minWaitTime: number;
	public maxPlatformFeePercentage: number;
	public options: { provider: NetworkProvider; addressType: AddressType };

	// Network provider to use for BCH network operations.
	public networkProvider: NetworkProvider;

	// Contracts in the BitCANN system.
	public contracts: Record<string, Contract>;

	constructor(config: ManagerConfig) 
	{
		this.category = config.category;
		this.minStartingBid = config.minStartingBid;
		this.minBidIncreasePercentage = config.minBidIncreasePercentage;
		this.inactivityExpiryTime = config.inactivityExpiryTime;
		this.minWaitTime = config.minWaitTime;
		this.maxPlatformFeePercentage = config.maxPlatformFeePercentage;

		if(config.networkProvider)
		{
			// Use the provided network provider for BCH network operations if one is provided.
			this.networkProvider = config.networkProvider;
		}
		else
		{
			// Create a new ElectrumNetworkProvider for BCH network operations.
			this.networkProvider = new ElectrumNetworkProvider('mainnet');
		}

		// Options for contract construction, specifying the network provider and address type.
		this.options = { provider: this.networkProvider, addressType: 'p2sh32' as AddressType };

		this.contracts = this.constructContracts({
			minStartingBid: this.minStartingBid,
			minBidIncreasePercentage: this.minBidIncreasePercentage,
			minWaitTime: this.minWaitTime,
			maxPlatformFeePercentage: this.maxPlatformFeePercentage,
		});
	}

	// Read Methods

	/**
	 * Retrieves the records for a given domain.
	 * 
	 * @param {string} domain - The domain name to retrieve records for.
	 * @returns {Promise<any>} A promise that resolves to the domain records.
	 */
	public async getRecords(domain: string): Promise<any> 
	{
		console.log(domain);

		// Construct the domain contract
		// Fetch the utxos
		return {};
	}

	public async getDomains({ status }: { status: DomainStatusType }): Promise<void>
	{
		console.log(status);

		return;
	}

	/**
	 * Retrieves the domain information for a given full domain name.
	 * 
	 * @param {string} fullName - The full domain name to retrieve information for.
	 * @returns {Promise<{ address: string; contract: Contract; utxos: Utxo[] }>} 
	 * A promise that resolves to an object containing the domain address, contract, and UTXOs.
	 */
	public async getDomain(fullName: string): Promise<{ address: string; contract: Contract; utxos: Utxo[]; status: DomainStatusType }>
	{
		// Extract the domain name from the full domain name.
		const name = fullName.split('.')[0];

		// Reverse the category bytes for use in contract parameters.
		const domainCategoryReversed = binToHex(hexToBin(this.category).reverse());

		// Retrieve the partial bytecode of the Domain contract.
		const domainPartialBytecode = this.getDomainPartialBytecode();

		// Construct the Domain contract with the provided parameters.
		const domainContract = this.constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
		});

		// Build the lock script hash for the domain.
		const scriptHash = buildLockScriptP2SH32(20 + domainCategoryReversed + pushDataHex(name) + domainPartialBytecode);

		// Convert the lock script hash to an address.
		const address = lockScriptToAddress(scriptHash);

		// Fetch the UTXOs for the domain address.
		const utxos = await this.networkProvider.getUtxos(address);

		// from the utxos, search if the internal and external authNFTs exist or not, if they do, they also return the status of the domain.

		// Return the domain address, contract, and UTXOs.
		return {
			address,
			contract: domainContract,
			utxos,
			status: DomainStatusType.UNDER_AUCTION,
		};
	}

	// Write Methods

	public async accumulateInternalTokens(): Promise<void>
	{
		return;
	}

	/**
	 * Creates an auction transaction for a given domain name.
	 * 
	 * @param {Object} params - The parameters for the auction transaction.
	 * @param {string} params.name - The domain name for the auction.
	 * @param {number} params.amount - The amount for the auction.
	 * @param {string} params.address - The address associated with the auction.
	 * @returns {Promise<string>} A promise that resolves to the transaction string.
	 * @throws {InvalidNameError} If the provided name is invalid.
	 * @throws {UserUTXONotFoundError} If no user UTXO is found.
	 */
	public async createAuctionTransaction({ 
		name, 
		amount,
		address,
	}: {
		name: string;
		amount: number;
		address: string;
	}): Promise<string>
	{
		// Validate the domain name.
		if(!isValidName(name))
		{
			throw new InvalidNameError();
		}	

		// Convert the domain name to hexadecimal and binary formats.
		const nameHex = Buffer.from(name).toString('hex');
		const nameBin = hexToBin(nameHex);

		// Fetch UTXOs for registry, auction, and user addresses.
		const [ registryUtxos, auctionUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Auction.address),
			this.networkProvider.getUtxos(address),
		]);

		// Retrieve necessary UTXOs for the transaction.
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

		// Calculate new registration ID and commitment.
		const newRegistrationId = parseInt(registrationCounterUTXO.token.nft.commitment, 16) + 1;
		const newRegistrationIdCommitment = newRegistrationId.toString(16).padStart(16, '0');

		// Convert user address to public key hash.
		const userPkh = convertAddressToPkh(address);

		// Define a placeholder unlocker for the user UTXO.
		// @ts-ignore
		const placeholderUnlocker: Unlocker = {
			generateLockingBytecode: () => convertPkhToLockingBytecode(userPkh),
			generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
		};

		// Find the user UTXO matching the category.
		const userUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + 2000 + DUST));
		if(!userUTXO)
		{
			throw new UserUTXONotFoundError();
		}

		// Build the auction transaction.
		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
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
				amount: userUTXO.satoshis - BigInt(amount + 2000),
			})
			.build();

		// Return the constructed transaction.
		return transaction;
	}

	public async createBid(name: string, amount: number): Promise<void>
	{
		console.log(name, amount);

		return;
	}

	public async claimDomain(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveInvalidAuctionName(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveDuplicateAuction(name: string): Promise<void>
	{
		console.log(name);

		return;
	}

	public async proveIllegalAuction(name: string): Promise<void>
	{
		console.log(name);

		return;
	}


	// UTILITIES


/**
	 * Retrieves the partial bytecode of the Domain contract.
	 * 
	 * @returns {string} The partial bytecode of the Domain contract.
	 */
	getDomainPartialBytecode = (): string =>
	{
		// Reverse the category bytes for use in contract parameters.
		const reversedCategory = binToHex(hexToBin(this.category).reverse());
	
		// Dummy name used for constructing a partial domain contract bytecode.
		const dummyName = 'test';
		const dummyNameHex = Buffer.from(dummyName).toString('hex');
	
		// Construct a dummy domain contract to extract partial bytecode.
		const DummyDomainContract = new Contract(Domain, [ BigInt(1), dummyNameHex, reversedCategory ], this.options);
		const sliceIndex = 2 + 64 + 2 + dummyName.length * 2;
		const domainPartialBytecode = DummyDomainContract.bytecode.slice(sliceIndex, DummyDomainContract.bytecode.length);
	
		return domainPartialBytecode;
	};
	
	/**
	 * Constructs a set of contracts for the BitCANN system.
	 *
	 * @param {Object} params - The parameters for constructing the contracts.
	 * @param {number} params.minStartingBid - The minimum starting bid for auctions.
	 * @param {number} params.minBidIncreasePercentage - The minimum bid increase percentage.
	 * @param {number} params.minWaitTime - The minimum wait time for auction finalization.
	 * @param {number} params.maxPlatformFeePercentage - The maximum platform fee percentage.
	 * @returns {Object} An object containing the constructed contracts.
	 */
	constructContracts = (params: {
		minStartingBid: number;
		minBidIncreasePercentage: number;
		minWaitTime: number;
		maxPlatformFeePercentage: number;
	}): { [key: string]: Contract } =>
	{
		// Reverse the category bytes for use in contract parameters.
		const reversedCategory = binToHex(hexToBin(this.category).reverse());
	
		const domainPartialBytecode = this.getDomainPartialBytecode();
	
		// Return an object containing all the constructed contracts.
		return {
			Accumulator: new Contract(Accumulator, [], this.options),
			Auction: new Contract(Auction, [ BigInt(params.minStartingBid) ], this.options),
			AuctionConflictResolver: new Contract(AuctionConflictResolver, [], this.options),
			AuctionNameEnforcer: new Contract(AuctionNameEnforcer, [], this.options),
			Bid: new Contract(Bid, [ BigInt(params.minBidIncreasePercentage) ], this.options),
			DomainFactory: new Contract(DomainFactory, [ domainPartialBytecode, BigInt(params.minWaitTime), BigInt(params.maxPlatformFeePercentage) ], this.options),
			DomainOwnershipGuard: new Contract(DomainOwnershipGuard, [ domainPartialBytecode ], this.options),
			Registry: new Contract(Registry, [ reversedCategory ], this.options),
		};
	};
	
	/**
	 * Constructs a Domain contract for the BitCANN system.
	 *
	 * @param {Object} params - The parameters for constructing the Domain contract.
	 * @param {string} params.name - The name of the domain.
	 * @param {string} params.category - The category identifier for the domain.
	 * @param {number} params.inactivityExpiryTime - The time period after which the domain is considered inactive.
	 * @returns {Contract} The constructed Domain contract.
	 */
	constructDomainContract = (params: {
		name: string;
		category: string;
		inactivityExpiryTime: number;
	}): Contract =>
	{
		// Reverse the category bytes for use in contract parameters.
		const reversedCategory = binToHex(hexToBin(params.category).reverse());
	
		// Convert the domain name to a hex string.
		const nameHex = Buffer.from(params.name).toString('hex');
	
		// Construct the Domain contract with the provided parameters.
		return new Contract(
			Domain,
			[ BigInt(params.inactivityExpiryTime), nameHex, reversedCategory ],
			this.options,
		);
	};
	

}

export const createManager = function(config: ManagerConfig): BitCANNManager 
{
	return new BitCANNManager(config);
};