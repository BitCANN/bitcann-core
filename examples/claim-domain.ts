import { ElectrumNetworkProvider } from 'cashscript';
import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';
import { CreateClaimDomainParams } from '../lib/interfaces/index.js';

(async () =>
{
	const name = 'satoshi';
	const address = aliceAddress;

	const claimDomainTransaction = await bitcannManager.createClaimDomainTransaction({ name } as CreateClaimDomainParams);

  const preparedTransaction = await getSignedTransaction({
    transaction: claimDomainTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

  const electrum = new ElectrumNetworkProvider('mainnet');
  // @ts-ignore
  const txid = await electrum.sendRawTransaction(preparedTransaction.hex);
  console.log('txid: ', txid);
})();
