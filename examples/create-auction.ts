import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;
	const auctionTransaction = await bitcannManager.createAuctionTransaction({ name, amount: 10000, address });

  // console.log(auctionTransaction);

  const preparedTransaction = await getSignedTransaction({
    transaction: auctionTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
})();
