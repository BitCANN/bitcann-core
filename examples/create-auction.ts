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
	const auctionTransaction = await bitcannManager.buildAuctionTransaction({ name, amount: 10000, address });

  // console.log(auctionTransaction);

  const preparedTransaction = await getSignedTransaction({
    transaction: auctionTransaction,
    address,
    privateKey: alicePriv
  })

  console.log(preparedTransaction);

  const electrum = new ElectrumNetworkProvider('mainnet');
  // @ts-ignore
  const txid = await electrum.sendRawTransaction(preparedTransaction.hex);
  console.log('txid: ', txid);
})();
