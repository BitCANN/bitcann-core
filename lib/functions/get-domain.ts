import { constructDomainContract, getDomainPartialBytecode } from '../util/contract.js';
import { hexToBin, binToHex } from '@bitauth/libauth';
import { DomainInfo } from '../interfaces/index.js';
import { buildLockScriptP2SH32, lockScriptToAddress, pushDataHex, validateName } from '../util/index.js';


export interface GetDomainParams
{
	name: string;
	category: string;
	inactivityExpiryTime: number;
	options: any;
}

/**
	 * Retrieves the domain information for a given full domain name.
	 *
	 * @param {string} name - The domain name to retrieve information for.
	 * @returns {Promise<DomainInfo>} A promise that resolves to an object containing the domain address, contract, and UTXOs.
	 */
export const getDomain = async ({ name, category, inactivityExpiryTime, options }: GetDomainParams): Promise<DomainInfo> =>
{
	// Extract the domain name from the full domain name.
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
