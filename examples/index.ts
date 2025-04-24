import { createManager, generateSourceOutputs } from 'bitcann';
import { ElectrumNetworkProvider } from 'cashscript';
import { decodeTransaction, hexToBin } from '@bitauth/libauth';
import {
	domainTokenCategory,
	minStartingBid,
	minBidIncreasePercentage,
	inactivityExpiryTime,
	minWaitTime,
	maxPlatformFeePercentage,
} from './setup.js';
import { aliceAddress, alicePriv } from './common.js';
import { signTransaction } from './sign.js';


const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = createManager({
	category: domainTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	maxPlatformFeePercentage: maxPlatformFeePercentage,
	networkProvider: networkProvider,
});


(async () =>
{
	const name = 'test';

	// const resp = await bitcannManager.getDomain(`${name}.bch`);
	// console.log(resp);

	const address = aliceAddress;
	// const auctionTransaction = await bitcannManager.createAuctionTransaction({ name, amount: 10000, address });
	// console.log(auctionTransaction);

	const records = await bitcannManager.getRecords(name);
	console.log(records);

	// const record = 'com.github kiok46';

	// const recordTransaction = await bitcannManager.createRecordTransaction({ name, record, address });
	// console.log(recordTransaction);

  // const unsignedRawTransactionHex = recordTransaction.build();

  // const decodedTransaction = decodeTransaction(hexToBin(unsignedRawTransactionHex));
  // if(typeof decodedTransaction == "string") throw new Error("!decodedTransaction")

	// // @ts-ignore
  // const sourceOutputs = generateSourceOutputs(recordTransaction.inputs)

  // const preparedSourceOutputs = sourceOutputs.map((sourceOutput, index) => {
  //   return { ...sourceOutput, ...decodedTransaction.inputs[index] }
  // })

	// // SIGN USING WALLETCONNECT

	// // const wcTransactionObj = {
  // //   transaction: decodedTransaction,
  // //   sourceOutputs: preparedSourceOutputs,
  // //   broadcast: true,
  // //   userPrompt: "Create Record",
  // // };

	// // SIGN USING LOCAL PRIVATE KEY

	// const signedTransaction = await signTransaction({
	// 	address: address,
	// 	privateKey: alicePriv,
	// 	decoded: decodedTransaction,
	// 	sourceOutputsUnpacked: preparedSourceOutputs,
	// });

	// console.log(signedTransaction);

})();
