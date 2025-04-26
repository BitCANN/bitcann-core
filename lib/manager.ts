import { BitCANNArtifacts } from '@bitcann/contracts';
import { binToHex, cashAddressToLockingBytecode, decodeTransaction, hexToBin, lockingBytecodeToCashAddress } from '@bitauth/libauth';
import { fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import type { NetworkProvider, AddressType, Unlocker, Utxo } from 'cashscript';
import { ElectrumNetworkProvider, Contract, TransactionBuilder } from 'cashscript';

import { DUST, EXPECTED_MAX_TRANSACTION_FEE } from './constants.js';
import { InternalAuthNFTUTXONotFoundError, InvalidBidAmountError, InvalidNameError, UserFundingUTXONotFoundError, UserOwnershipNFTUTXONotFoundError, UserUTXONotFoundError } from './errors.js';
import type { ManagerConfig } from './interfaces/common.js';
import { DomainStatusType } from './interfaces/domain.js';
import { isValidName } from './util/name.js';
import { extractOpReturnPayload, pushDataHex } from './util/index.js';
import { buildLockScriptP2SH32 } from './util/index.js';
import { lockScriptToAddress } from './util/index.js';
import { convertAddressToPkh, convertCashAddressToTokenAddress, convertPkhToLockingBytecode, getAuthorizedContractUtxo, getDomainMintingUtxo, getRegistrationUtxo, getRunningAuctionUtxo, getThreadUtxo } from './util/utxo-util.js';

const {
	Accumulator,
	Auction,
	AuctionConflictResolver,
	AuctionNameEnforcer,
	Bid,
	Domain,
	DomainFactory,
	DomainOwnershipGuard,
	Registry,
} = BitCANNArtifacts;

export class BitCANNManager 
{
	// Config to build the contracts in the BitCANN system.
	public category: string;
	public minStartingBid: number;
	public minBidIncreasePercentage: number;
	public inactivityExpiryTime: number;
	public minWaitTime: number;
	public maxPlatformFeePercentage: number;
	public platformFeeAddress: string | undefined;
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
		this.platformFeeAddress = config.platformFeeAddress;
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
	 * @param {string} name - The domain name to retrieve records for.
	 * @returns {Promise<string[]>} A promise that resolves to the domain records.
	 */
	public async getRecords(name: string): Promise<string[]> 
	{
		const domainContract = this.constructDomainContract({
			name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
		});

		// @ts-ignore
		const history = await fetchHistory(this.networkProvider.electrum, domainContract.address);

		const records = [];
		const validCandidateTransactions = [];

		for(const txn of history)
		{
			// @ts-ignore
			let tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
			let decodedTx = decodeTransaction(hexToBin(tx));

			let hasOpReturn = false;
			let hasCategoryFromContract = false;

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

				// @ts-ignore
				const lockingBytecode = cashAddressToLockingBytecode(domainContract.address).bytecode;
				if(binToHex(output.lockingBytecode) === binToHex(lockingBytecode))
				{
					hasCategoryFromContract = true;
				}
			}

			if(hasOpReturn && hasCategoryFromContract)
			{
				validCandidateTransactions.push(decodedTx);
			}
			
		}

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

	public async getAuctions(): Promise<Utxo[]>
	{
		const registryUtxos = await this.networkProvider.getUtxos(this.contracts.Registry.address);
		const auctionUtxos = registryUtxos.filter((utxo) => utxo.token?.category === this.category && utxo.token?.nft?.capability === 'mutable');

		return auctionUtxos;
	}

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
	}): Promise<TransactionBuilder>
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
			});

		// Return the constructed transaction.
		return transaction;
	}

	public async createBidTransaction({ name, amount, address }: { name: string; amount: number; address: string }): Promise<TransactionBuilder>
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
		const [ registryUtxos, bidUtxos, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(this.contracts.Bid.address),
			this.networkProvider.getUtxos(address),
		]);

		// Retrieve necessary UTXOs for the transaction.
		const threadNFTUTXO = getThreadUtxo({
			utxos: registryUtxos,
			category: this.category,
			threadContractAddress: this.contracts.Bid.address,
		});

		const authorizedContractUTXO = getAuthorizedContractUtxo({
			utxos: bidUtxos,
		});

		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category: this.category,
		});

		if(BigInt(amount) < BigInt(Math.ceil(Number(runningAuctionUTXO.satoshis) * (1 + this.minBidIncreasePercentage / 100))))
		{
			throw new InvalidBidAmountError();
		}

		// Convert user address to public key hash.
		const userPkh = convertAddressToPkh(address);

		// Define a placeholder unlocker for the user UTXO.
		// @ts-ignore
		const placeholderUnlocker: Unlocker = {
			generateLockingBytecode: () => convertPkhToLockingBytecode(userPkh),
			generateUnlockingBytecode: () => Uint8Array.from(Array(0)),
		};

		// Find the user UTXO matching the category.
		const fundingUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + EXPECTED_MAX_TRANSACTION_FEE) && !utxo.token);
		if(!fundingUTXO)
		{
			throw new UserUTXONotFoundError();
		}

		const prevBidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
		const prevBidderLockingBytecode = convertPkhToLockingBytecode(prevBidderPKH);
		// @ts-ignore
		const prevBidderAddress = lockingBytecodeToCashAddress({ bytecode: prevBidderLockingBytecode }).address;

		if(typeof prevBidderAddress !== 'string')
		{
			throw new Error('Invalid prev bidder address');
		}

		const transaction = await new TransactionBuilder({ provider: this.networkProvider })
			.addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
			.addInput(authorizedContractUTXO, this.contracts.Bid.unlock.call())
			.addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
			.addInput(fundingUTXO, placeholderUnlocker)
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
				to: this.contracts.Bid.tokenAddress,
				amount: authorizedContractUTXO.satoshis,
			})
			.addOutput({
				to: this.contracts.Registry.tokenAddress,
				amount: BigInt(amount),
				token: {
					category: runningAuctionUTXO.token.category,
					amount: runningAuctionUTXO.token.amount,
					nft: {
						capability: 'mutable',
						commitment: userPkh + binToHex(nameBin),
					},
				},
			})
			.addOutput({
				to: prevBidderAddress,
				amount: runningAuctionUTXO.satoshis,
			})
			.addOutput({
				to: address,
				amount: fundingUTXO.satoshis - (BigInt(amount) + BigInt(EXPECTED_MAX_TRANSACTION_FEE)),
			});
		
		const tranasctionSize = transaction.build().length;
		transaction.outputs[transaction.outputs.length - 1].amount = fundingUTXO.satoshis - (BigInt(amount) + BigInt(tranasctionSize));

		return transaction;
	}

	public async createClaimDomainTransaction({ name }: { name: string }): Promise<TransactionBuilder>
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


		const bidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
		const bidderLockingBytecode = convertPkhToLockingBytecode(bidderPKH);
		// @ts-ignore
		const bidderAddress = lockingBytecodeToCashAddress({ bytecode: bidderLockingBytecode }).address;

		if(typeof bidderAddress !== 'string')
		{
			throw new Error('Invalid prev bidder address');
		}

		// Construct the Domain contract with the provided parameters.
		const domainContract = this.constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
		});

		const registrationId = runningAuctionUTXO.token?.amount.toString(16).padStart(16, '0');


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
		
		if(this.platformFeeAddress)
		{
			const platformFee = runningAuctionUTXO.satoshis * BigInt(this.maxPlatformFeePercentage) / BigInt(100);

			transaction.addOutput({
				to: this.platformFeeAddress,
				amount: platformFee,
			});

			const tranasctionSize = transaction.build().length;
			transaction.outputs[transaction.outputs.length - 1].amount = platformFee - BigInt(tranasctionSize);
		}

		return transaction;
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

	public async createRecordTransaction({ name, record, address }: { name: string; record: string; address: string }): Promise<TransactionBuilder>
	{
		// Construct the Domain contract with the provided parameters.
		const domainContract = this.constructDomainContract({
			name: name,
			category: this.category,
			inactivityExpiryTime: this.inactivityExpiryTime,
		});
		// Fetch UTXOs for registry, auction, and user addresses.
		const [ domainUTXOs, userUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(domainContract.address),
			this.networkProvider.getUtxos(address),
		]);

		// Utxo from registry contract that has authorizedContract's lockingbytecode in the nftCommitment
		const internalAuthNFTUTXO: Utxo | null = domainUTXOs.find(utxo => 
			utxo.token?.nft?.capability === 'none'
			&& utxo.token?.category === this.category
			&& utxo.token?.nft?.commitment.length > 0,
		) || null;

		if(!internalAuthNFTUTXO)
		{
			throw new InternalAuthNFTUTXONotFoundError();
		}

		const ownershipNFTUTXO: Utxo | null = userUtxos.find(utxo => 
			utxo.token?.nft?.capability === 'none' && utxo.token?.category === this.category,
		) || null;

		if(!ownershipNFTUTXO)
		{
			throw new UserOwnershipNFTUTXONotFoundError();
		}
	
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
		const dummyNameHex = Array.from(dummyName).map(char => char.charCodeAt(0).toString(16)
			.padStart(2, '0'))
			.join('');
	
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