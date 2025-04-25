import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';


(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;

	const claimDomainTransaction = await bitcannManager.createClaimDomainTransaction({ name });

  const preparedTransaction = await getSignedTransaction({
    transaction: claimDomainTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);
	
})();
