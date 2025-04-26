import { ElectrumNetworkProvider } from "cashscript";
import { createManager } from "@bitcann/core";

export const domainTokenCategory = '98570f00cad2991de0ab25f14ffae29a0c61da97ba6d466acbc8476e2e612ada';
export const minStartingBid = 10000;
export const minBidIncreasePercentage = 5;
export const inactivityExpiryTime = 1;
export const minWaitTime = 1;
export const maxPlatformFeePercentage = 50;
export const platformFeeAddress = 'bitcoincash:qznn6uyfuj9t7da5mv2ul66t63tmtgggruzlpen6ql';

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = createManager({
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
