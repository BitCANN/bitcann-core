import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress, alicePriv } from './common/wallet.js';
import { getSignedTransaction } from './common/sign.js';
import { ElectrumNetworkProvider } from 'cashscript';


(async () =>
{
	const name = 'test';
	const address = aliceAddress;

	const amount = 10000*1.05;
  console.log('amount', amount);
	const bidTransaction = await bitcannManager.buildBidTransaction({ name, amount, address });

  const preparedTransaction = await getSignedTransaction({
    transaction: bidTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

  const electrum = new ElectrumNetworkProvider('mainnet');
  // @ts-ignore
  const txid = await electrum.sendRawTransaction(preparedTransaction.hex);
  console.log('txid: ', txid);
	
})();
