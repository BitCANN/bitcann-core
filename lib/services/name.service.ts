import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth';
import { fetchHistory, fetchTransaction, fetchUnspentTransactionOutputs } from '@electrum-cash/protocol';
import { type Contract, type NetworkProvider } from 'cashscript';
import { ChaingraphClient, graphql } from 'chaingraph-ts';
import { GetNameParams, GetRecordsParams, NameInfo, NameStatus } from '../interfaces/index.js';
import type {
	LookupAddressCoreParams,
	LookupAddressCoreResponse,
	ResolveNameByChainGraphParams,
	ResolveNameByElectrumParams,
	ResolveNameCoreParams,
} from '../interfaces/resolver.js';
import { scriptToScripthash } from '../util/address.js';
import { constructNameContract, getNamePartialBytecode } from '../util/contract.js';
import { buildLockScriptP2SH32, extractRecordsFromTransaction, findRunningAuctionUtxo, getValidCandidateTransactions, lockScriptToAddress, pushDataHex } from '../util/index.js';
import { isNameValid } from '../util/name.js';
import { ParsedRecordsInterface, parseRecords } from '../util/parser.js';


export class NameService
{
	/**
     * The network provider.
     */
	networkProvider: NetworkProvider;
	/**
     * The contracts.
     */
	contracts: Record<string, Contract>;
	/**
     * The category.
     */
	category: string;
	/**
     * The TLD.
     */
	tld: string;
	/**
     * The Chaingraph URL.
     */
	chaingraphUrl: string;

	/**
     * Constructs a new NameService.
     *
     * @param {NetworkProvider} networkProvider - The network provider.
     * @param {Record<string, Contract>} contracts - The contracts.
     * @param {string} category - The category.
     * @param {string} tld - The TLD.
     */
	constructor(
		networkProvider: NetworkProvider,
		contracts: Record<string, Contract>,
		category: string,
		tld: string,
		chaingraphUrl: string,
	)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
		this.tld = tld;
		this.chaingraphUrl = chaingraphUrl;
	}

	/**
     * Retrieves the name information for a specified name.
     *
     * @param {GetNameParams} params - The parameters required to get name details.
     * @param {string} params.name - The name to retrieve information for.
     * @returns {Promise<NameInfo>} A promise that resolves to an object containing the name address and contract.
     */
	getName = async ({ name }: GetNameParams): Promise<NameInfo> =>
	{
		// Reverse the category bytes for use in contract parameters.
		const nameCategoryReversed = binToHex(hexToBin(this.category).reverse());

		// Retrieve the partial bytecode of the Name contract.
		const namePartialBytecode = getNamePartialBytecode({ category: this.category, provider: this.networkProvider, tld: this.tld });

		// Construct the Name contract with the provided parameters.
		const nameContract = constructNameContract({
			name,
			category: this.category,
			provider: this.networkProvider,
			tld: this.tld,
		});

		// Build the lock script hash for the name.
		const nameScriptHash = buildLockScriptP2SH32(20 + nameCategoryReversed + pushDataHex(this.tld) + pushDataHex(name) + namePartialBytecode);

		// Convert the lock script hash to an address.
		const address = lockScriptToAddress(nameScriptHash);

		// Retrieve UTXOs for registry and name contracts.
		const [ registryUtxos, nameUtxos ] = await Promise.all([
			this.networkProvider.getUtxos(this.contracts.Registry.address),
			this.networkProvider.getUtxos(nameContract.address),
		]);

		// Initialize the response object with basic name information.
		const response: any = {
			address,
			contract: nameContract,
		};

		// Filter name UTXOs by category to check registration status.
		const registeredUtxos = nameUtxos.filter(utxo => utxo.token?.category === this.category);
		if(registeredUtxos.length > 0)
		{
			return { ...response, status: NameStatus.REGISTERED, utxos: registeredUtxos };
		}

		// Check for any running auction for the name.
		try
		{
			const runningAuctionUTXO = findRunningAuctionUtxo({
				name,
				utxos: registryUtxos,
				category: this.category,
			});
			if(runningAuctionUTXO)
			{
				return { ...response, status: NameStatus.AUCTIONING, utxos: [ runningAuctionUTXO ] };
			}
		}
		catch(error)
		{}

		// If no registration or auction is found, mark the name as available.
		return { ...response, status: isNameValid(name) ? NameStatus.AVAILABLE : NameStatus.INVALID };
	};


	/**
     * Fetches name records based on the provided parameters.
     *
     * @param {GetRecordsParams} params - The parameters for fetching name records.
     * @param {string} params.name - The name to retrieve records for.
     * @returns {Promise<ParsedRecordsInterface>} A promise that resolves to an array of name records.
     */
	getRecords = async ({
		name,
	}: GetRecordsParams): Promise<ParsedRecordsInterface> =>
	{
		const nameContract = constructNameContract({
			name,
			category: this.category,
			tld: this.tld,
			provider: this.networkProvider,
		});

		// @ts-ignore
		const history = await fetchHistory(this.networkProvider.electrum, nameContract.address);
		const validCandidateTransactions = await getValidCandidateTransactions({
			history,
			nameContract,
			category: this.category,
			// @ts-ignore
			electrumClient: this.networkProvider.electrum,
		});
		let records = validCandidateTransactions.flatMap(tx => extractRecordsFromTransaction(tx));

		records = [ ...new Set(records) ];

		return parseRecords(records);
	};


	resolveNameByChainGraph = async ({ token }: ResolveNameByChainGraphParams): Promise<string> =>
	{
		const queryReq = graphql(`query SearchNameOwner(
        $tokenId: bytea,
        $commitment: bytea
      ){
        output(where: {token_category: {_eq: $tokenId}, nonfungible_token_commitment: {_eq: $commitment} }) {
        transaction_hash
        transaction {
          block_inclusions {
            block {
              height
            }
          }
        }
      }
      }`);

		const category = binToHex(token.category);
		const commitment = binToHex(token.nft.commitment);

		const chaingraphClient = new ChaingraphClient(this.chaingraphUrl);
		const resultQuery = await chaingraphClient.query(queryReq, {
			tokenId: `\\x${category}`,
			commitment: `\\x${commitment}`,
		});

		if(!resultQuery.data)
		{
			throw new Error('No data returned from Chaingraph query');
		}

		const transactions = resultQuery.data.output.map((output: any) => ({
			height: output.transaction.block_inclusions.length > 0 ? output.transaction.block_inclusions[0].block.height : null,
			txHash: output.transaction_hash.replace(/^\\x/, ''),
		}));

		// Filter transactions to keep only those with block_inclusions length of 0
		let filteredTransaction = transactions.filter(output => output.height === null);
		// If the filteredTransaction has a length then it means that the NFT is currently in the mempool.
		// Go through all the transactions that are filtered here and fine the one that currently ownes the NFT.

		// If no such transactions exist, keep only the one with the highest block height
		// That means the NFT exists with the recipient of the address in that transaction.
		if(filteredTransaction.length === 0)
		{
			const maxHeight = Math.max(...transactions.map(output => parseInt(output.height || '0', 10)));
			filteredTransaction = transactions.filter(output => parseInt(output.height || '0', 10) === maxHeight);
		}

		let ownerLockingBytecode;

		const potentialOwners = new Set();

		for(const tx of filteredTransaction)
		{
			// @ts-ignore
			const t = await fetchTransaction(this.networkProvider.electrum, tx.txHash);
			const decodedTx = decodeTransaction(hexToBin(t));
			// @ts-ignore
			for(const output of decodedTx.outputs)
			{
				if(output.token
            // @ts-ignore
            && output.token.amount === token.amount
            // @ts-ignore
            && binToHex(output.token.category) === binToHex(token.category)
            // @ts-ignore
            && output.token.nft.capability === token.nft.capability
            // @ts-ignore
            && binToHex(output.token.nft.commitment) === binToHex(token.nft.commitment))
				{
					potentialOwners.add(binToHex(output.lockingBytecode));
				}
			}
		}

		const promises = Array.from(potentialOwners).map(async (owner) =>
		{
			const ownerAddress = await lockScriptToAddress(owner as string);
			// @ts-ignore
			const utxos = await fetchUnspentTransactionOutputs(this.networkProvider.electrum, ownerAddress, false, true);

			const matchingUtxo = utxos.find(utxo =>
				utxo.token_data
				// @ts-ignore
            && utxo.token_data.category === binToHex(token.category)
				// @ts-ignore
            && utxo.token_data.nft
				// @ts-ignore
            && utxo.token_data.nft.commitment === binToHex(token.nft.commitment),
			);

			if(matchingUtxo)
			{
				ownerLockingBytecode = owner;
			}
		});
		await Promise.all(promises);

		if(!ownerLockingBytecode)
		{
			throw new Error('No owner found');
		}

		const ownerAddress = await lockScriptToAddress(ownerLockingBytecode);

		return ownerAddress;
	};

	resolveNameByElectrum = async ({ baseHeight, token, ownerLockingBytecode }: ResolveNameByElectrumParams): Promise<string> =>
	{

		let lookingForNewOwner = true;
		while(lookingForNewOwner)
		{
			let foundTransferTxn = false;
			// @ts-ignore
			const scriptHash = await scriptToScripthash(ownerLockingBytecode);
			// @ts-ignore
			const scriptHashHistory = await this.networkProvider.electrum.request('blockchain.scripthash.get_history', scriptHash);

			// Capture the current value of baseHeight
			const currentBaseHeight = baseHeight;
			const filteredScriptHashHistory = scriptHashHistory.filter((entry: any) => entry.height > currentBaseHeight).reverse();

			if(filteredScriptHashHistory.length === 0)
			{
				lookingForNewOwner = false;
			}

			for(const txn of filteredScriptHashHistory)
			{
				// @ts-ignore
				const tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
				const decodedTx = decodeTransaction(hexToBin(tx));
				if(decodedTx === null || typeof decodedTx === 'string')
				{
					throw new Error('No valid base transaction found');
				}
				// @ts-ignore
				for(const output of decodedTx.outputs)
				{
					if(
						output.token
                        // @ts-ignore
                        && output.token.amount === token.amount
                        // @ts-ignore
                        && binToHex(output.token.category) === binToHex(token.category)
                        // @ts-ignore
                        && output.token.nft.capability === token.nft.capability
                        // @ts-ignore
                        && binToHex(output.token.nft.commitment) === binToHex(token.nft.commitment)
                        // @ts-ignore
                        && binToHex(output.lockingBytecode) !== binToHex(ownerLockingBytecode)
					)
					{
						// Assign the value of owner to the new owner.
						ownerLockingBytecode = output.lockingBytecode;
						// Set the height of the base transaction.
						baseHeight = txn.height;
						// Set this variable to true to break out of the loop. [Outputs]
						foundTransferTxn = true;
						break;
					}
				}

				// If the transfer transaction is found then break out of the loop. [scriptHashHistory]
				if(foundTransferTxn)
				{
					break;
				}

				lookingForNewOwner = false;
			}
		}

		// If not transaction then the owner still has the NFT.
		// Go through the history and check the inputs for the spending of that token above.
		// If it's found then check the output and repeat the process untill it's not spent.
		// The last output is the owner.

		const ownerAddress = await lockScriptToAddress(binToHex(ownerLockingBytecode));

		return ownerAddress;
	};

	resolveNameCore = async (
		{
			name,
			useElectrum,
			useChaingraph,
		}: ResolveNameCoreParams,
	): Promise<any> =>
	{
		if(useElectrum && useChaingraph || !useElectrum && !useChaingraph)
		{
			throw new Error('Either useElectrum or useChaingraph must be true');
		}

		const nameContract = constructNameContract({
			name,
			category: this.category,
			tld: this.tld,
			provider: this.networkProvider,
		});

		const [ history, utxos ] = await Promise.all([
			// @ts-ignore
			fetchHistory(this.networkProvider.electrum, nameContract.address),
			// @ts-ignore
			fetchUnspentTransactionOutputs(this.networkProvider.electrum, nameContract.address, false, true),
		]);

		const filteredUtxos = utxos
		// @ts-ignore
			.filter((utxo) => utxo.token_data.category === this.category && utxo.token_data.nft?.commitment !== '');

		if(filteredUtxos.length === 0)
		{
			throw new Error('No UTXOs found for the name');
		}

		const validUtxo = filteredUtxos.reduce((prev, current) =>
		{
			// @ts-ignore
			const prevCommitment = parseInt(prev.token_data.nft!.commitment, 16);
			// @ts-ignore
			const currentCommitment = parseInt(current.token_data.nft!.commitment, 16);

			return currentCommitment < prevCommitment ? current : prev;
		});

		// @ts-ignore
		const validRegistrationId = validUtxo.token_data.nft.commitment;

		let baseTransaction = null;
		let baseHeight = 0;

		for(const txn of history)
		{
			// @ts-ignore
			const tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
			const decodedTx = decodeTransaction(hexToBin(tx));

			if(typeof decodedTx === 'string')
			{
				continue;
			}

			if(decodedTx.inputs.length !== 5
                    || decodedTx.outputs.length !== 8
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

			const registrationId = binToHex(decodedTx.outputs[5].token!.nft!.commitment).slice(0, 16);

			if(registrationId == validRegistrationId)
			{
				baseTransaction = decodedTx;
				baseHeight = txn.height;
				break;
			}
		}

		if(baseTransaction === null || typeof baseTransaction === 'string')
		{
			throw new Error('Name has not been auctioned yet');
		}

		if(useChaingraph)
		{
			return this.resolveNameByChainGraph({ token: baseTransaction.outputs[5].token });
		}

		let ownerLockingBytecode = baseTransaction.outputs[5].lockingBytecode;

		return this.resolveNameByElectrum({ baseHeight, token: baseTransaction.outputs[5].token, ownerLockingBytecode });
	};


	/**
     * Retrieves all names associated with a given Bitcoin Cash address.
     *
     * This function queries the blockchain to find all UTXOs linked to the specified address
     * and filters them to extract the names owned by the address.
     *
     * @param {LookupAddressRequest} params - The parameters for the lookup operation.
     * @returns {Promise<LookupAddressResponse>} A promise that resolves to an object containing an array of names owned by the address.
     */
	lookupAddressCore = async ({
		address,
	}: LookupAddressCoreParams): Promise<LookupAddressCoreResponse> =>
	{
		// Look for all the UTXOs for the given address and filter the names.
		const utxos = await this.networkProvider.getUtxos(address);

		const filteredUtxos = utxos.filter((utxo) => utxo.token?.category === this.category);

		const names = filteredUtxos.map((utxo) =>
		{
			const nameHex = utxo.token!.nft!.commitment.slice(16);

			return Buffer.from(nameHex, 'hex').toString('utf8');
		});

		return { names };
	};

}
