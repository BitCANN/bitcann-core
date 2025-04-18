import { createManager } from 'bitcann';

const domainTokenCategory = '8b4590c0b3f84a93634b5a5a85a550db1f4a9c9e83ad30b677ef5627ac64d218';
const minStartingBid = 10000;
const minBidIncreasePercentage = 5;
const inactivityExpiryTime = 1;
const minWaitTime = 1;
const maxPlatformFeePercentage = 50;

const bitcannManager = createManager({
	category: domainTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	maxPlatformFeePercentage: maxPlatformFeePercentage,
});

(async () => {
  const resp = await bitcannManager.getDomain('a.bch');
	console.log(resp)
})();
