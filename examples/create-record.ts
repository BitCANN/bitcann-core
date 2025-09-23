import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';

(async () =>
{
	const name = 'test';
	const address = aliceAddress;
	const record = 'social.github=kiok46';

	const recordTransaction = await bitcannManager.buildRecordsTransaction({ name, records: [ record ], address });

  const preparedTransaction = await getSignedTransaction({
    transaction: recordTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

})();
