# @bitcann/core

BitCANN - **Bitcoin Cash for Assigned Names and Numbers** – is a decentralized domain name and identity system built on the Bitcoin Cash Blockchain.

<p align="center">
  <a href="https://www.npmjs.com/package/@bitcann/core"><img src="https://img.shields.io/npm/v/@bitcann/core.svg" alt="NPM version" /></a>
<a href="https://codecov.io/github/BitCANN/bitcann-core" > 
 <img src="https://codecov.io/github/BitCANN/bitcann-core/graph/badge.svg?token=RJB8LUO1NY"/> 
 </a><br>
  <a href="https://t.me/bitcann_protocol"><img alt="Join Chat on Telegram" src="https://img.shields.io/badge/chat-BitCANN-0088CC?logo=telegram"></a>
  <a href="https://www.npmjs.com/package/@bitcann/core"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@bitcann/core"></a>
</p>

## Contract and Documentation
For more details, visit the [BitCANN Contracts and Documentation](https://github.com/BitCANN/bitcann-contracts) repository.


## Usage

### Installation
```bash
npm install @bitcann/core
```

### Setup
```js
import { BitCANNManager } from '@bitcann/core';

const manager = new BitCANNManager({
  // Category ID for the BitCANN system
  category: '0x0000000000000000000000000000000000000000',
  // Minimum starting bid in satoshis
  minStartingBid: 100000000,
  // Minimum bid increase percentage
  minBidIncreasePercentage: 5,
  // Inactivity expiry time in blocks/MTP
  inactivityExpiryTime: 1000000,
  // Minimum wait time in blocks/MTP
  minWaitTime: 1,
  // Maximum platform fee percentage
  maxPlatformFeePercentage: 50,
  // Optional platform fee address
  platformFeeAddress: 'bitcoincash:...',
  // Network provider (optional)
  networkProvider: new ElectrumNetworkProvider('mainnet'),
});
```

### Handling

#### Domain Operations
```js
// Get domain records
const records = await manager.getRecords('satoshi');

// Get domain information
const domain = await manager.getDomain('satoshi');

// Create record
const recordTx = await manager.createRecordTransaction({
  name: 'satoshi',
  record: 'Hello, World!',
  address: 'bitcoincash:...'
});
```

#### Auction Operations
```js
// Get active auctions
const auctions = await manager.getAuctions();

// Create auction
const auctionTx = await manager.createAuctionTransaction({
  name: 'satoshi',
  amount: 100000000,
  address: 'bitcoincash:...'
});

// Place bid
const bidTx = await manager.createBidTransaction({
  name: 'satoshi',
  amount: 200000000,
  address: 'bitcoincash:...'
});

// Claim domain
const claimTx = await manager.createClaimDomainTransaction({
  name: 'satoshi'
});
```


## Support
For support, please open an issue on our GitHub repository or create a PR, or join our community chat at [Telegram](https://t.me/bitcann_discussion).


## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| category | Category ID for the BitCANN system | Required |
| minStartingBid | Minimum starting bid in satoshis | Required |
| minBidIncreasePercentage | Minimum bid increase percentage | Required |
| inactivityExpiryTime | Inactivity expiry time in blocks/MTP | Required |
| minWaitTime | Minimum wait time in blocks/MTP | Required |
| maxPlatformFeePercentage | Maximum platform fee percentage | Required |
| platformFeeAddress | Platform fee address | Optional |
| networkProvider | Network provider | Optional |

## License

MIT


