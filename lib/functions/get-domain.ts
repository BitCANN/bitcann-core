import { constructDomainContract, getDomainPartialBytecode } from '../util/contract.js';
import { hexToBin, binToHex } from '@bitauth/libauth';
import { DomainInfo, GetDomainParams, DomainStatus } from '../interfaces/index.js';
import { buildLockScriptP2SH32, getRunningAuctionUtxo, lockScriptToAddress, pushDataHex } from '../util/index.js';
import { isNameValid } from '../util/name.js';


/**
 * Retrieves the domain information for a specified domain name.
 *
 * @param {GetDomainParams} params - The parameters required to get domain details.
 * @param {string} params.name - The domain name to retrieve information for.
 * @param {string} params.category - The category of the domain.
 * @param {number} params.inactivityExpiryTime - The inactivity expiry time for the domain.
 * @param {object} params.options - Additional options for the domain contract.
 * @param {Contract} params.registryContract - The contract instance for the registry.
 * @returns {Promise<DomainInfo>} A promise that resolves to an object containing the domain address and contract.
 */
export const getDomain = async ({ name, category, inactivityExpiryTime, options, registryContract }: GetDomainParams): Promise<DomainInfo> =>
{
	// Reverse the category bytes for use in contract parameters.
	const domainCategoryReversed = binToHex(hexToBin(category).reverse());

	// Retrieve the partial bytecode of the Domain contract.
	const domainPartialBytecode = getDomainPartialBytecode(category, options);

	// Construct the Domain contract with the provided parameters.
	const domainContract = constructDomainContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	// Build the lock script hash for the domain.
	const scriptHash = buildLockScriptP2SH32(20 + domainCategoryReversed + pushDataHex(name) + domainPartialBytecode);

	// Convert the lock script hash to an address.
	const address = lockScriptToAddress(scriptHash);

	// Retrieve UTXOs for registry and domain contracts.
	const [ registryUtxos, domainUtxos ] = await Promise.all([
		options.provider.getUtxos(registryContract.address),
		options.provider.getUtxos(domainContract.address),
	]);

	// Initialize the response object with basic domain information.
	const response: any = {
		address,
		contract: domainContract,
	};

	// Filter domain UTXOs by category to check registration status.
	const registeredUtxos = domainUtxos.filter(utxo => utxo.token?.category === category);
	if(registeredUtxos.length > 0)
	{
		return { ...response, status: DomainStatus.REGISTERED, utxos: registeredUtxos };
	}

	// Check for any running auction for the domain.
	try
	{
		const runningAuctionUTXO = getRunningAuctionUtxo({
			name,
			utxos: registryUtxos,
			category,
		});
		if(runningAuctionUTXO)
		{
			return { ...response, status: DomainStatus.AUCTIONING, utxos: [ runningAuctionUTXO ] };
		}
	}
	catch(error)
	{}

	// If no registration or auction is found, mark the domain as available.
	return { ...response, status: isNameValid(name) ? DomainStatus.AVAILABLE : DomainStatus.INVALID };
};
