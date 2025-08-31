import { ElectrumNetworkProvider } from "cashscript";
import { BitcannManager } from "../../lib/index.js";

import {
  nameTokenCategory,
  minStartingBid,
  minBidIncreasePercentage,
  inactivityExpiryTime,
  minWaitTime,
  creatorIncentiveAddress,
  tld,
} from './config.js';

// Test with time-based relative timelock.
// export const nameTokenCategory = 'a78e4d0bb8d9c4227e3e03b20bef87b31a6e03ddcd56053671ab95770abd5099';
// export const minWaitTime = 4194306;

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = new BitcannManager({
	category: nameTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	creatorIncentiveAddress: creatorIncentiveAddress,
	networkProvider: networkProvider,
	tld: tld,
});

export { bitcannManager };
