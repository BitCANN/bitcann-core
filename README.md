# bitcann.js

BitCANN - **Bitcoin Cash for Assigned Names and Numbers** – is a decentralized domain name and identity system built on the Bitcoin Cash Blockchain.



```js
import { createClient } from 'bitcann';

const client = createClient({
    network: 'mainnet',
    config: {
      category: '0x0000000000000000000000000000000000000000',
      minStartingBid: 100000000,
      minBidIncreasePercentage: 100,
      inactivityExpiryTime: 100000000,
      minWaitTime: 1,
      maxPlatformFeePercentage: 100,
    }
});

const auction = await client.getAuctionContract();

const records = await client.getRecords('satoshi.bch');

console.log(records);

```

### Watch for duplicate auctions

```js
setInterval(async () => {
  const getActiveAuctions = await client.getActiveAuctions();
  // Loop through the NFTs and look for the ones that already have a running auction.
  const auction = await client.proveDuplicateAuction();
  // Construct the auction case and penalise.


  // Check for dupicate auctions

  // Check for invalid auction names
}, 5000);
```