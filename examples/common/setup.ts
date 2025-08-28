import { ElectrumNetworkProvider } from "cashscript";
import { BitcannManager } from "../../lib/index.js";

import {
  nameTokenCategory,
  minStartingBid,
  minBidIncreasePercentage,
  inactivityExpiryTime,
  minWaitTime,
  maxPlatformFeePercentage,
  platformFeeAddress,
} from './config.js';

// Test with block-based relative timelock.
// export const nameTokenCategory = 'cd9312b30fbf5bca4cf90a6167c5be7961603447879ed9851e01d7b2cdc0e451';
// export const minWaitTime = 1;

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
	maxPlatformFeePercentage: maxPlatformFeePercentage,
	networkProvider: networkProvider,
	platformFeeAddress: platformFeeAddress,
});

export { bitcannManager };
