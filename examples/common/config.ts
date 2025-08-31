// STEP 1: Create the genesis category using the `createGenesisCategory` function
const nameTokenCategory = '43bb481fc6a1c8cc18cdc61da4858194f49e587149cf099c9ea674ee28734c8c';

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