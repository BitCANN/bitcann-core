import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';

(async () =>
{
  const name = 'satoshi';
	const address = aliceAddress;

	const recordTransaction = await bitcannManager.penalizeIllegalAuction({ name, rewardTo: address });

  const preparedTransaction = await getSignedTransaction({
    transaction: recordTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

})();
