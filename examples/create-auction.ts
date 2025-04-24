import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const name = 'test';
	const address = aliceAddress;
	const auctionTransaction = await bitcannManager.createAuctionTransaction({ name, amount: 10000, address });
  const preparedTransaction = await getSignedTransaction({
    transaction: auctionTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
	
})();
