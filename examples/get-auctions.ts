import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const auctions = await bitcannManager.getAuctions();

  for(const auction of auctions)
  {
    console.log(auction);
  }
})();
