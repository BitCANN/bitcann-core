import { fetchHistory } from '@electrum-cash/protocol';
import { constructNameContract, extractRecordsFromTransaction, getValidCandidateTransactions } from '../util/index.js';
import type { FetchRecordsParams } from '../interfaces/index.js';
import { parseRecords, type ParsedRecordsInterface } from '../util/parser.js';

/**
 * Fetches name records based on the provided parameters.
 *
 * @param {FetchRecordsParams} params - The parameters for fetching name records.
 * @param {string} params.name - The name to retrieve records for.
 * @param {string} params.category - The category of the name.
 * @param {number} params.inactivityExpiryTime - The expiry time for name inactivity.
 * @param {object} params.options - Additional options for name contract construction.
 * @param {object} params.electrumClient - The Electrum client for blockchain interactions.
 * @returns {Promise<string[]>} A promise that resolves to an array of name records.
 */
export const fetchRecords = async ({
	name,
	category,
	inactivityExpiryTime,
	options,
	electrumClient,
}: FetchRecordsParams): Promise<ParsedRecordsInterface> =>
{
	const nameContract = constructNameContract({
		name,
		category,
		inactivityExpiryTime,
		options,
	});

	const history = await fetchHistory(electrumClient, nameContract.address);
	const validCandidateTransactions = await getValidCandidateTransactions({
		history,
		nameContract,
		category,
		electrumClient,
	});
	let records = validCandidateTransactions.flatMap(tx => extractRecordsFromTransaction(tx));

	records = [ ...new Set(records) ];

	return parseRecords(records);
};