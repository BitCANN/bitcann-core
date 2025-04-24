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
import { aliceAddress } from './common.js';

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

	const resp = await bitcannManager.getDomain(`${name}.bch`);
	console.log(resp);

	const address = aliceAddress;
	const auctionTransaction = await bitcannManager.createAuctionTransaction({ name, amount: 10000, address });
	console.log(auctionTransaction);

	const records = await bitcannManager.getRecords(name);
	console.log(records);
})();
