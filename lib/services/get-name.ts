import { constructNameContract, getNamePartialBytecode } from '../util/contract.js';
import { hexToBin, binToHex } from '@bitauth/libauth';
import { NameInfo, GetNameParams, NameStatus } from '../interfaces/index.js';
import { buildLockScriptP2SH32, findRunningAuctionUtxo, lockScriptToAddress, pushDataHex } from '../util/index.js';
import { isNameValid } from '../util/name.js';


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
export const getName = async ({ name, category, tld, options, registryContract }: GetNameParams): Promise<NameInfo> =>
{
	// Reverse the category bytes for use in contract parameters.
	const nameCategoryReversed = binToHex(hexToBin(category).reverse());

	// Retrieve the partial bytecode of the Name contract.
	const namePartialBytecode = getNamePartialBytecode({ category, options, tld });

	// Construct the Name contract with the provided parameters.
	const nameContract = constructNameContract({
		name,
		category,
		tld,
		options,
	});

	// Build the lock script hash for the name.
	const nameScriptHash = buildLockScriptP2SH32(20 + nameCategoryReversed + pushDataHex(tld) + pushDataHex(name) + namePartialBytecode);

	// Convert the lock script hash to an address.
	const address = lockScriptToAddress(nameScriptHash);

	// Retrieve UTXOs for registry and name contracts.
	const [ registryUtxos, nameUtxos ] = await Promise.all([
		options.provider.getUtxos(registryContract.address),
		options.provider.getUtxos(nameContract.address),
	]);

	// Initialize the response object with basic name information.
	const response: any = {
		address,
		contract: nameContract,
	};

	// Filter name UTXOs by category to check registration status.
	const registeredUtxos = nameUtxos.filter(utxo => utxo.token?.category === category);
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
			category,
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
