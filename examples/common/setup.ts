import { ElectrumNetworkProvider } from "cashscript";
import { BitCANNManager } from "../../lib/index.js";

import dotenv from 'dotenv';
dotenv.config();

// Previous.
// export const domainTokenCategory = '98570f00cad2991de0ab25f14ffae29a0c61da97ba6d466acbc8476e2e612ada';
// export const minWaitTime = 1;

export const domainTokenCategory = '6020caed04c53335f4c9418ae1c999f5678a2743a8c3ec38eebcc4f794c3e7a6';
export const minWaitTime = 3;

export const minStartingBid = 10000;
export const minBidIncreasePercentage = 5;
export const inactivityExpiryTime = 1;
export const maxPlatformFeePercentage = 50;

export const platformFeeAddress = process.env.FEE_COLLECTION_ADDRESS;

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = new BitCANNManager({
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
