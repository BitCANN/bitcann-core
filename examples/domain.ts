import { createManager } from 'bitcann';
import { ElectrumNetworkProvider } from 'cashscript';
import 
{
	domainTokenCategory,
	minStartingBid,
	minBidIncreasePercentage,
	inactivityExpiryTime,
	minWaitTime,
	maxPlatformFeePercentage,
} from './setup.js';

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = createManager({
	category: domainTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	maxPlatformFeePercentage: maxPlatformFeePercentage,
	networkProvider: networkProvider,
});

(async () =>
{
	const name = 'test';

	const resp = await bitcannManager.getDomain('a.bch');
	console.log(resp);

	// const address = 'bitcoincash:qznn6uyfuj9t7da5mv2ul66t63tmtgggruzlpen6ql';
	// const auctionTransaction = await bitcannManager.createAuctionTransaction({ name, amount: 10000, address });
	// console.log(auctionTransaction);

	const tx = await bitcannManager.getRecords(name);
	console.log(tx);
})();
