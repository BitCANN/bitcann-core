import { constructDomainContract, getDomainPartialBytecode } from '../util/contract.js';
import { hexToBin, binToHex } from '@bitauth/libauth';
import { DomainInfo, GetDomainParams } from '../interfaces/index.js';
import { buildLockScriptP2SH32, lockScriptToAddress, pushDataHex, validateName } from '../util/index.js';


/**
 * Retrieves the domain information for a specified domain name.
 *
 * @param {GetDomainParams} params - The parameters required to get domain details.
 * @param {string} params.name - The domain name to retrieve information for.
 * @param {string} params.category - The category of the domain.
 * @param {number} params.inactivityExpiryTime - The inactivity expiry time for the domain.
 * @param {object} params.options - Additional options for the domain contract.
 * @returns {Promise<DomainInfo>} A promise that resolves to an object containing the domain address and contract.
 */
export const getDomain = async ({ name, category, inactivityExpiryTime, options }: GetDomainParams): Promise<DomainInfo> =>
{
	// Validate the domain name.
	validateName(name);

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

	// Return the domain address and contract.
	return {
		address,
		contract: domainContract,
	};
};
