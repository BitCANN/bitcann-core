import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;

	const amount = 10000*1.05;
  console.log('amount', amount);
	const bidTransaction = await bitcannManager.createBidTransaction({ name, amount, address });

  const preparedTransaction = await getSignedTransaction({
    transaction: bidTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
	
})();
