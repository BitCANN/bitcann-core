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
	const address = 'bitcoincash:qznn6uyfuj9t7da5mv2ul66t63tmtgggruzlpen6ql';
	const resp = await bitcannManager.getDomain('a.bch');
	console.log(resp);

	const utxos = await networkProvider.getUtxos(address);
	console.log(utxos);

	const auctionTransaction = await bitcannManager.createAuctionTransaction({ name: 'a', amount: 10000, address });
	console.log(auctionTransaction);
})();
