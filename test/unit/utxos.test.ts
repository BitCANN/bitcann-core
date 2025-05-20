import { describe, it, expect, beforeAll } from '@jest/globals';
import { MockNetworkProvider, randomUtxo } from 'cashscript';
import * as config	from '../config.js';
import {
	BitCANNManager,
	fetchAuctionUtxos,
	intToBytesToHex,
	type FetchAuctionUtxosResponse,
} from '../../lib/index.js';

describe('validateName', () =>
{
	const networkProvider = new MockNetworkProvider();
	config.mockOptions.networkProvider = networkProvider;

	const manager = new BitCANNManager(config.mockOptions);

	beforeAll( async () =>
	{
		networkProvider.addUtxo(config.aliceAddress, { ...randomUtxo() });
		networkProvider.addUtxo(config.auctionContractAddress, { ...randomUtxo() });
		networkProvider.addUtxo(config.registryContractAddress, {
			token: {
				category: config.mockOptions.category,
				amount: BigInt(0),
				nft: {
					commitment: config.auctionLockingBytecodeHex,
					capability: 'none',
				},
			},
			...randomUtxo(),
		});
		networkProvider.addUtxo(config.registryContractAddress, {
			token: {
				category: config.mockOptions.category,
				amount: BigInt('9223372036854775807'),
				nft: {
					commitment: intToBytesToHex({ value: 0, length: 8 }),
					capability: 'minting',
				},
			},
			...randomUtxo(),
		});
		networkProvider.addUtxo(config.registryContractAddress, {
			token: {
				category: config.mockOptions.category,
				// @ts-ignore
				nft: {
					capability: 'minting',
				},
			},
			...randomUtxo(),
		});
	});


	it('should fetch utxos necessary for an auction', async () =>
	{
		const utxos: FetchAuctionUtxosResponse = await fetchAuctionUtxos({
			amount: 1000,
			address: config.aliceAddress,
			networkProvider,
			contracts: manager.contracts,
			category: config.mockOptions.category,
		});

		expect(utxos).toBeDefined();
		expect(utxos.threadNFTUTXO).toBeDefined();
		expect(utxos.registrationCounterUTXO).toBeDefined();
		expect(utxos.authorizedContractUTXO).toBeDefined();
		expect(utxos.userUTXO).toBeDefined();
	});
});
