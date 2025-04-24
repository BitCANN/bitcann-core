import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;
	const bidTransaction = await bitcannManager.createBidTransaction({ name, amount: 10000*1.05, address });

  const preparedTransaction = await getSignedTransaction({
    transaction: bidTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
	
})();
