import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const address = aliceAddress;
	const accumulateTransaction = await bitcannManager.accumulateTokens({ address });

  console.log(accumulateTransaction);

  const preparedTransaction = await getSignedTransaction({
    transaction: accumulateTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
})();
