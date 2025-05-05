import { fetchHistory } from '@electrum-cash/protocol';
import { constructDomainContract, extractRecordsFromTransaction, getValidCandidateTransactions, filterValidRecords } from '../util/index.js';
import type { FetchRecordsParams } from '../interfaces/index.js';

/**
 * Retrieves the records for a given domain.
 *
 * @param {string} name - The domain name to retrieve records for.
 * @returns {Promise<string[]>} A promise that resolves to the domain records.
 */
export const fetchRecords = async (
	{ name,
		keepDuplicates = true,
		category,
		inactivityExpiryTime,
		options,
		electrumClient }: FetchRecordsParams): Promise<string[]> =>
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

	return filterValidRecords(records);
};