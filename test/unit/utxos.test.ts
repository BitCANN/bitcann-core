import { describe, beforeAll } from '@jest/globals';
import { MockNetworkProvider, randomUtxo } from 'cashscript';
import * as config	from '../config.js';
import {
	intToBytesToHex,
} from '../../lib/index.js';

describe('validateName', () =>
{
	const networkProvider = new MockNetworkProvider();
	config.mockOptions.networkProvider = networkProvider;

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

});
