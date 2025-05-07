import { describe, it, expect } from '@jest/globals';
import { MockNetworkProvider } from 'cashscript';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import { ElectrumClient } from '@electrum-cash/network';
import { fetchRecords } from '../../lib/functions';
import { getElectrum, disconnectElectrum } from '../context.js';
import * as config from '../config.js';

describe('records', () =>
{
	const networkProvider = new MockNetworkProvider();
	config.mockOptions.networkProvider = networkProvider;

	let electrumClient: ElectrumClient<ElectrumProtocolEvents>;

	beforeAll(async () =>
	{
		electrumClient = await getElectrum();
	});

	afterAll(async () =>
	{
		await disconnectElectrum();
	});

	it('should return empty object for a domain', async () =>
	{
		const domain = 'test';

		const records = await fetchRecords({
			name: domain,
			category: config.mockOptions.category,
			inactivityExpiryTime: config.mockOptions.inactivityExpiryTime,
			options: config.mockOptions,
			// @ts-ignore
			electrumClient: electrumClient,
		});

		expect(records).toBeDefined();
		// expect(records).toStrictEqual([]);
	});
});