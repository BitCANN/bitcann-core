import { binToHex, hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { fetchHistory } from '@electrum-cash/protocol';
import type { AddressType,  NetworkProvider } from 'cashscript';
import { Contract, TransactionBuilder } from 'cashscript';
import { DomainConfig, CreateClaimDomainParams, DomainInfo, DomainStatusType, CreateRecordsParams } from './interfaces/domain.js';
import { InternalAuthNFTUTXONotFoundError, InvalidNameError, UserFundingUTXONotFoundError, UserOwnershipNFTUTXONotFoundError } from './errors.js';
import {
	adjustLastOutputForFee,
	buildLockScriptP2SH32,
	constructDomainContract,
	convertCashAddressToTokenAddress,
	convertNameToBinary,
	convertPkhToLockingBytecode,
	createPlaceholderUnlocker,
	createRegistrationId,
	extractRecordsFromTransaction,
	filterValidRecords,
	findFundingUTXO,
	findInternalAuthNFTUTXO,
	findOwnershipNFTUTXO,
	getAuthorizedContractUtxo,
	getDomainMintingUtxo,
	getDomainPartialBytecode,
	getRunningAuctionUtxo,
	getThreadUtxo,
	getValidCandidateTransactions,
	isValidName,
	lockScriptToAddress,
	pushDataHex,
} from './util/index.js';


/**
 * The DomainManager class is responsible for managing domain-related operations
 * such as retrieving domain records, domain information, and creating transactions
 * for adding records or claiming domains.
 */
export class DomainManager
{
	private readonly category: string;
	private readonly networkProvider: NetworkProvider;
	private readonly contracts: Record<string, Contract>;
	private readonly inactivityExpiryTime: number;
	private readonly platformFeeAddress: string;
	private readonly maxPlatformFeePercentage: number;
	private readonly minWaitTime: number;
	private readonly options: { provider: NetworkProvider; addressType: AddressType };

	/**
	 * Constructs a new DomainManager instance with the specified configuration parameters.
	 *
	 * @param {DomainConfig} params - The configuration parameters for the domain manager.
	 */
	constructor(params: DomainConfig)
	{
		this.category = params.category;
		this.networkProvider = params.networkProvider;
		this.contracts = params.contracts;
		this.inactivityExpiryTime = params.inactivityExpiryTime;
		this.platformFeeAddress = params.platformFeeAddress;
		this.maxPlatformFeePercentage = params.maxPlatformFeePercentage;
		this.minWaitTime = params.minWaitTime;
		this.options = params.options;
	}

	/**
	 * Retrieves the records for a given domain.
	 *
	 * @param {string} name - The domain name to retrieve records for.
	 * @returns {Promise<string[]>} A promise that resolves to the domain records.
	 */
	public async getRecords({ name, keepDuplicates = true }: { name: string; keepDuplicates?: boolean }): Promise<string[]>
	{
		const domainContract = constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		// @ts-ignore - NetworkProvider type doesn't expose electrum property
		const history = await fetchHistory(this.networkProvider.electrum, domainContract.address);
		const validCandidateTransactions = await getValidCandidateTransactions(history, domainContract, this.category, this.networkProvider);
		let records = validCandidateTransactions.flatMap(tx => extractRecordsFromTransaction(tx));

		if(keepDuplicates)
		{
			records = [ ...new Set(records) ];
		}

		return filterValidRecords(records);
	}

	/**
	 * Retrieves the domain information for a given full domain name.
	 *
	 * @param {string} fullName - The full domain name to retrieve information for.
	 * @returns {Promise<DomainInfo>} A promise that resolves to an object containing the domain address, contract, and UTXOs.
	 */
	public async getDomain(fullName: string): Promise<DomainInfo>
	{
		// Extract the domain name from the full domain name.
		const name = fullName.split('.')[0];

		// Reverse the category bytes for use in contract parameters.
		const domainCategoryReversed = binToHex(hexToBin(this.category).reverse());

		// Retrieve the partial bytecode of the Domain contract.
		const domainPartialBytecode = getDomainPartialBytecode(this.category, this.options);

		// Construct the Domain contract with the provided parameters.
		const domainContract = constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		// Build the lock script hash for the domain.
		const scriptHash = buildLockScriptP2SH32(20 + domainCategoryReversed + pushDataHex(name) + domainPartialBytecode);

		// Convert the lock script hash to an address.
		const address = lockScriptToAddress(scriptHash);

		// Fetch the UTXOs for the domain address.
		const utxos = await this.networkProvider.getUtxos(address);

		// Return the domain address, contract, and UTXOs.
		return {
			address,
			contract: domainContract,
			utxos,
			status: 'UNDER_AUCTION' as DomainStatusType,
		};
	}

	/**
	 * Creates a transaction for adding a record to a domain.
	 *
	 * @param {CreateRecordsParams} params - The parameters for creating the record transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 */
	public async createRecordsTransaction({ name, records, address }: CreateRecordsParams): Promise<TransactionBuilder>
	{
		const domainContract = constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		const [ domainUTXOs, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(domainContract.address),
			this.networkProvider.getUtxos(address),
		]);

		const internalAuthNFTUTXO = findInternalAuthNFTUTXO(domainUTXOs, this.category);
		if(!internalAuthNFTUTXO)
		{
			throw new InternalAuthNFTUTXONotFoundError();
		}

		const ownershipNFTUTXO = findOwnershipNFTUTXO(userUtxos, this.category, name);
		if(!ownershipNFTUTXO)
		{
			throw new UserOwnershipNFTUTXONotFoundError();
		}

		const fundingUTXO = findFundingUTXO(userUtxos);
		if(!fundingUTXO)
		{
			throw new UserFundingUTXONotFoundError();
		}

		const placeholderUnlocker = createPlaceholderUnlocker(address);

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(internalAuthNFTUTXO, domainContract.unlock.useAuth(BigInt(1)))
			.addInput(ownershipNFTUTXO, placeholderUnlocker)
			.addInput(fundingUTXO, placeholderUnlocker)
			.addOutput({
				to: domainContract.tokenAddress,
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

		adjustLastOutputForFee(transaction, fundingUTXO, fundingUTXO.satoshis);

		return transaction;
	}

	/**
	 * Creates a transaction for claiming a domain.
	 *
	 * @param {CreateClaimDomainParams} params - The parameters for creating the claim domain transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 */
	public async createClaimDomainTransaction({ name }: CreateClaimDomainParams): Promise<TransactionBuilder>
	{
		if(!isValidName(name))
		{
			throw new InvalidNameError();
		}

		const { nameBin } = convertNameToBinary(name);

		const [ registryUtxos, domainFactoryUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.DomainFactory.address),
		]);

		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.DomainFactory.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: domainFactoryUtxos,
		});

		const domainMintingUTXO = getDomainMintingUtxo({
			utxos: registryUtxos,
			category: this.category,
		});

		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		const bidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
		const bidderLockingBytecode = convertPkhToLockingBytecode(bidderPKH);
		const bidderAddressResult = lockingBytecodeToCashAddress({ bytecode: bidderLockingBytecode });

		if(typeof bidderAddressResult !== 'object' || !bidderAddressResult.address)
		{
			throw new Error('Invalid prev bidder address');
		}

		const bidderAddress = bidderAddressResult.address;

		const domainContract = constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		const registrationId = createRegistrationId(runningAuctionUTXO);

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.DomainFactory.unlock.call())
			.addInput(domainMintingUTXO, this.contracts.Registry.unlock.call())
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call(), { sequence: this.minWaitTime })
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
				to: this.contracts.DomainFactory.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: domainMintingUTXO.satoshis,
				token: {
					category: domainMintingUTXO.token.category,
					amount: domainMintingUTXO.token.amount,
					nft: {
						capability: domainMintingUTXO.token.nft.capability,
						commitment: domainMintingUTXO.token.nft.commitment,
					},
				},
			})
			.addOutput({
				to: domainContract.tokenAddress,
				amount: BigInt(1000),
				token: {
					category: domainMintingUTXO.token.category,
					amount: BigInt(0),
					nft: {
						capability: 'none',
						commitment: '',
					},
				},
			})
			.addOutput({
				to: domainContract.tokenAddress,
				amount: BigInt(1000),
				token: {
					category: domainMintingUTXO.token.category,
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
					category: domainMintingUTXO.token.category,
					amount: BigInt(0),
					nft: {
						capability: 'none',
						commitment: registrationId + binToHex(nameBin),
					},
				},
			});

		const feeRecipient = this.platformFeeAddress ? this.platformFeeAddress : bidderAddress;
		const platformFee = runningAuctionUTXO.satoshis * BigInt(this.maxPlatformFeePercentage) / BigInt(100);

		transaction.addOutput({
			to: feeRecipient,
			amount: platformFee,
		});

		adjustLastOutputForFee(transaction, runningAuctionUTXO, platformFee);

		return transaction;
	}
}