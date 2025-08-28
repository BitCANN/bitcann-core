import { ElectrumNetworkProvider } from 'cashscript';
import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';
import { CreateClaimNameParams } from '../lib/interfaces/index.js';

(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;

	const claimNameTransaction = await bitcannManager.createClaimNameTransaction({ name } as CreateClaimNameParams);

  const preparedTransaction = await getSignedTransaction({
    transaction: claimNameTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

  const electrum = new ElectrumNetworkProvider('mainnet');
  // @ts-ignore
  const txid = await electrum.sendRawTransaction(preparedTransaction.hex);
  console.log('txid: ', txid);
})();
