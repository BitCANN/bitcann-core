import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';
import { binToHex, hexToBin, hash256 } from '@bitauth/libauth';

(async () =>
{
	const name = 'test';
	const address = aliceAddress;
	const record = "description Bitcoin finally has it's own naming system!!";
	const rmvRecord = "RMV " + binToHex(hash256(hexToBin(record)));

	const recordTransaction = await bitcannManager.createRecordsTransaction({ name, records: [ rmvRecord ], address });

  const preparedTransaction = await getSignedTransaction({
    transaction: recordTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

})();
