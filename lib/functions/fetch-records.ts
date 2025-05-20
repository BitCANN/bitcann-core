import { fetchHistory } from '@electrum-cash/protocol';
import { constructDomainContract, extractRecordsFromTransaction, getValidCandidateTransactions, filterValidRecords } from '../util/index.js';
import type { FetchRecordsParams, GetRecordsResponse } from '../interfaces/index.js';

/**
 * Fetches domain records based on the provided parameters.
 *
 * @param {FetchRecordsParams} params - The parameters for fetching domain records.
 * @param {string} params.name - The domain name to retrieve records for.
 * @param {boolean} [params.keepDuplicates=true] - Whether to keep duplicate records.
 * @param {string} params.category - The category of the domain.
 * @param {number} params.inactivityExpiryTime - The expiry time for domain inactivity.
 * @param {object} params.options - Additional options for domain contract construction.
 * @param {object} params.electrumClient - The Electrum client for blockchain interactions.
 * @returns {Promise<string[]>} A promise that resolves to an array of domain records.
 */
export const fetchRecords = async ({
	name,
	keepDuplicates = true,
	category,
	inactivityExpiryTime,
	options,
	electrumClient,
}: FetchRecordsParams): Promise<GetRecordsResponse> =>
{
	const domainContract = constructDomainContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	const history = await fetchHistory(electrumClient, domainContract.address);
	const validCandidateTransactions = await getValidCandidateTransactions({
		history,
		domainContract,
		category,
		electrumClient,
	});
	let records = validCandidateTransactions.flatMap(tx => extractRecordsFromTransaction(tx));

	if(keepDuplicates)
	{
		records = [ ...new Set(records) ];
	}

	return {
		records: filterValidRecords(records),
	};
};