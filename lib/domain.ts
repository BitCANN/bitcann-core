import { binToHex, decodeTransaction, hexToBin, cashAddressToLockingBytecode, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import type { AddressType,  NetworkProvider, Utxo } from 'cashscript';
import { Contract, TransactionBuilder } from 'cashscript';
import { constructDomainContract, getDomainPartialBytecode } from './util/contract.js';
import { buildLockScriptP2SH32, extractOpReturnPayload, lockScriptToAddress, pushDataHex } from './util/index.js';
import { DomainConfig, CreateRecordParams, CreateClaimDomainParams, DomainInfo, DomainStatusType } from './interfaces/domain.js';
import { convertAddressToPkh, convertCashAddressToTokenAddress, convertPkhToLockingBytecode, getAuthorizedContractUtxo, getDomainMintingUtxo, getRunningAuctionUtxo, getThreadUtxo } from './util/utxo.js';
import { InternalAuthNFTUTXONotFoundError, InvalidNameError, UserFundingUTXONotFoundError, UserOwnershipNFTUTXONotFoundError } from './errors.js';
import { isValidName } from './util/name.js';

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
	public async getRecords(name: string): Promise<string[]> 
	{
		const domainContract = constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		// Fetch the transaction history for the domain contract address.
		// @ts-ignore
		const history = await fetchHistory(this.networkProvider.electrum, domainContract.address);

		const records: string[] = [];
		const validCandidateTransactions = [];

		// Iterate over each transaction in the history.
		for(const txn of history) 
		{
			// Fetch and decode the transaction.
			// @ts-ignore
			let tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
			let decodedTx = decodeTransaction(hexToBin(tx));

			let hasOpReturn = false;
			let hasCategoryFromContract = false;

			// Check each output in the transaction for specific conditions.
			// @ts-ignore
			for(const output of decodedTx.outputs) 
			{
				if(output.valueSatoshis == 0) 
				{
					hasOpReturn = true;
					continue;
				}

				if(!output.token || binToHex(output.token.category) != this.category) 
				{
					continue;
				}

				// Verify if the output locking bytecode matches the domain contract.
				// @ts-ignore
				const lockingBytecode = cashAddressToLockingBytecode(domainContract.address).bytecode;
				if(binToHex(output.lockingBytecode) === binToHex(lockingBytecode)) 
				{
					hasCategoryFromContract = true;
				}
			}

			// If both conditions are met, add the transaction to valid candidates.
			if(hasOpReturn && hasCategoryFromContract) 
			{
				validCandidateTransactions.push(decodedTx);
			}
		}

		// Extract and decode OP_RETURN payloads from valid transactions.
		for(const tx of validCandidateTransactions) 
		{
			// @ts-ignore
			for(const output of tx.outputs) 
			{
				if(output.valueSatoshis == 0) 
				{
					const opReturnPayload = extractOpReturnPayload(binToHex(output.lockingBytecode));
					const utf8String = Buffer.from(opReturnPayload, 'hex').toString('utf8');
					records.push(utf8String);
				}
			}
		}

		return records;
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
	 * @param {CreateRecordParams} params - The parameters for creating the record transaction.
	 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
	 */
	public async createRecordTransaction({ name, record, address }: CreateRecordParams): Promise<TransactionBuilder> 
	{
		// Construct the Domain contract with the provided parameters.
		const domainContract = constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		// Fetch UTXOs for registry, auction, and user addresses.
		const [ domainUTXOs, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(domainContract.address),
			this.networkProvider.getUtxos(address),
		]);

		// Find the internal authorization NFT UTXO.
		const internalAuthNFTUTXO: Utxo | null = domainUTXOs.find(utxo =>
			utxo.token?.nft?.capability === 'none'
			&& utxo.token?.category === this.category
			&& utxo.token?.nft?.commitment.length > 0,
		) || null;

		if(!internalAuthNFTUTXO) 
		{
			throw new InternalAuthNFTUTXONotFoundError();
		}

		// Find the ownership NFT UTXO.
		const ownershipNFTUTXO: Utxo | null = userUtxos.find(utxo =>
			utxo.token?.nft?.capability === 'none' && utxo.token?.category === this.category,
		) || null;

		if(!ownershipNFTUTXO) 
		{
			throw new UserOwnershipNFTUTXONotFoundError();
		}

		// Find the funding UTXO with the highest satoshis.
		const fundingUTXO: Utxo | null = userUtxos.reduce<Utxo | null>((max, utxo) => (!utxo.token && utxo.satoshis > (max?.satoshis || 0)) ? utxo : max, null);

		if(!fundingUTXO) 
		{
			throw new UserFundingUTXONotFoundError();
		}

		const change = fundingUTXO.satoshis - BigInt(2000);

		// Convert user address to public key hash.
		const pkh = convertAddressToPkh(address);

		// Define a placeholder unlocker for the user UTXO.
		// @ts-ignore
		const placeholderUnlocker: Unlocker = {
			generateLockingBytecode: () => convertPkhToLockingBytecode(pkh),
			generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
		};

		// Build the transaction for adding a record.
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
			})
			.addOpReturnOutput([ record ])
			.addOutput({
				to: address,
				amount: change,
			});

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
		// Validate the domain name.
		if(!isValidName(name)) 
		{
			throw new InvalidNameError();
		}

		// Convert the domain name to hexadecimal and binary formats.
		const nameHex = Array.from(name).map(char => char.charCodeAt(0).toString(16)
			.padStart(2, '0'))
			.join('');
		const nameBin = hexToBin(nameHex);

		// Fetch UTXOs for registry, auction, and user addresses.
		const [ registryUtxos, domainFactoryUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.DomainFactory.address),
		]);

		// Retrieve necessary UTXOs for the transaction.
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

		// Extract bidder's public key hash and convert to address.
		const bidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
		const bidderLockingBytecode = convertPkhToLockingBytecode(bidderPKH);
		// @ts-ignore
		const bidderAddress = lockingBytecodeToCashAddress({ bytecode: bidderLockingBytecode }).address;

		if(typeof bidderAddress !== 'string') 
		{
			throw new Error('Invalid prev bidder address');
		}

		// Construct the Domain contract with the provided parameters.
		const domainContract = constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
			options: this.options,
		});

		const registrationId = runningAuctionUTXO.token?.amount.toString(16).padStart(16, '0');

		// Build the transaction for claiming the domain.
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

		const transactionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = platformFee - BigInt(transactionSize);
	

		return transaction;
	}
}