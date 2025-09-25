import { ElectrumNetworkProvider } from "cashscript";
import { BitcannManager } from "../../lib/index.js";

import {
	genesisIncentiveAddress,
	inactivityExpiryTime,
	minBidIncreasePercentage,
	minStartingBid,
	minWaitTime,
	nameTokenCategory,
	tld,
} from './config.js';

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = new BitcannManager({
	category: nameTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	genesisIncentiveAddress: genesisIncentiveAddress,
	networkProvider: networkProvider,
	tld: tld,
});

export { bitcannManager };
