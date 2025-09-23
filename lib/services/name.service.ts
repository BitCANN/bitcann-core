import { constructNameContract, getNamePartialBytecode } from '../util/contract.js';
import { hexToBin, binToHex } from '@bitauth/libauth';
import { NameInfo, GetNameParams, NameStatus, FetchRecordsParams } from '../interfaces/index.js';
import { buildLockScriptP2SH32, findRunningAuctionUtxo, lockScriptToAddress, pushDataHex } from '../util/index.js';
import { isNameValid } from '../util/name.js';
import { type AddressType, Contract, type NetworkProvider } from 'cashscript';
import { ParsedRecordsInterface } from '../util/parser.js';
import { fetchHistory } from '@electrum-cash/protocol';
import { extractRecordsFromTransaction, getValidCandidateTransactions } from '../util/index.js';
import { parseRecords } from '../util/parser.js';


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
     * The options.
     */
    options: { provider: NetworkProvider; addressType: AddressType };

    /**
     * Constructs a new NameService.
     *
     * @param {NetworkProvider} networkProvider - The network provider.
     * @param {Record<string, Contract>} contracts - The contracts.
     * @param {string} category - The category.
     * @param {string} tld - The TLD.
     * @param {object} options - The options.
     */
	constructor(
        networkProvider: NetworkProvider,
        contracts: Record<string, Contract>,
        category: string,
        tld: string,
        options: { provider: NetworkProvider; addressType: AddressType },
    )
	{
        this.networkProvider = networkProvider;
        this.contracts = contracts;
        this.category = category;
        this.tld = tld;
        this.options = options;
	}

    /**
     * Retrieves the name information for a specified name.
     *
     * @param {GetNameParams} params - The parameters required to get name details.
     * @param {string} params.name - The name to retrieve information for.
     * @param {string} params.category - The category of the name.
     * @param {string} params.tld - The TLD of the name.
     * @param {object} params.options - Additional options for the name contract.
     * @param {Contract} params.registryContract - The contract instance for the registry.
     * @returns {Promise<NameInfo>} A promise that resolves to an object containing the name address and contract.
     */
    getName = async ({ name }: GetNameParams): Promise<NameInfo> =>
        {
            // Reverse the category bytes for use in contract parameters.
            const nameCategoryReversed = binToHex(hexToBin(this.category).reverse());
        
            // Retrieve the partial bytecode of the Name contract.
            const namePartialBytecode = getNamePartialBytecode({ category: this.category, options: this.options, tld: this.tld });
        
            // Construct the Name contract with the provided parameters.
            const nameContract = constructNameContract({
                name,
                category: this.category,
                tld: this.tld,
                options: this.options,
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
     * @param {FetchRecordsParams} params - The parameters for fetching name records.
     * @param {string} params.name - The name to retrieve records for.
     * @param {string} params.category - The category of the name.
     * @param {string} params.tld - The TLD of the name.
     * @param {object} params.options - Additional options for name contract construction.
     * @param {object} params.electrumClient - The Electrum client for blockchain interactions.
     * @returns {Promise<string[]>} A promise that resolves to an array of name records.
     */
    fetchRecords = async ({
        name,
    }: FetchRecordsParams): Promise<ParsedRecordsInterface> =>
    {
        const nameContract = constructNameContract({
            name,
            category: this.category,
            tld: this.tld,
            options: this.options,
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
}