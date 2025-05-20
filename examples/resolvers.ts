import {
	bitcannManager,
} from './common/setup.js';
import { aliceAddress } from './common/wallet.js';

(async () =>
{
	const address = aliceAddress;
	const lookupAddress = await bitcannManager.lookupAddress(address);
  console.log(lookupAddress);

})();
