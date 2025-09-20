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
