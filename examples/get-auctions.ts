import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const auctions = await bitcannManager.getAuctions();
  console.log(auctions);
  for(const auction of auctions)
  {
    const nameHex = auction.token?.nft?.commitment.slice(40);

    // @ts-ignore
    const name = Buffer.from(nameHex, 'hex').toString('utf8');
    console.log(name);
  }
})();
