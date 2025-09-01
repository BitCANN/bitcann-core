// STEP 1: Create the genesis category using the `createGenesisCategory` function
const nameTokenCategory = '5ac6457bca0e65c21a8d4fffe41769748d4ba6d58e9a6e52b6ee74031ce6ae24';

// STEP 2: Figure out the following parameters
const minStartingBid = 10000;
const minBidIncreasePercentage = 5;
const inactivityExpiryTime = 4194305;
const minWaitTime = 4194306;
const creatorIncentiveAddress = 'bitcoincash:qqaer4yfa0j4sa7dez9gwsgjd98edjm3dg40rkrchw';
const tld = '.bch';

const genesisTokenAmount = BigInt('9223372036854775807');

export {
  nameTokenCategory,
  minStartingBid,
  minBidIncreasePercentage,
  inactivityExpiryTime,
  minWaitTime,
  creatorIncentiveAddress,
  genesisTokenAmount,
  tld,
}