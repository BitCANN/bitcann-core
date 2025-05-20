import { ElectrumNetworkProvider } from "cashscript";
import { BitcannManager } from "../../lib/index.js";

import dotenv from 'dotenv';
dotenv.config();

// Test with block-based relative timelock.
export const domainTokenCategory = 'cd9312b30fbf5bca4cf90a6167c5be7961603447879ed9851e01d7b2cdc0e451';
export const minWaitTime = 1;

// Test with time-based relative timelock.
// export const domainTokenCategory = 'a78e4d0bb8d9c4227e3e03b20bef87b31a6e03ddcd56053671ab95770abd5099';
// export const minWaitTime = 4194306;

export const minStartingBid = 10000;
export const minBidIncreasePercentage = 5;
export const inactivityExpiryTime = 1;
export const maxPlatformFeePercentage = 50;

export const platformFeeAddress = process.env.FEE_COLLECTION_ADDRESS;

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = new BitcannManager({
	category: domainTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	maxPlatformFeePercentage: maxPlatformFeePercentage,
	networkProvider: networkProvider,
	platformFeeAddress: platformFeeAddress,
});

export { bitcannManager };
