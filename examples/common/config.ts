// STEP 1: Create the genesis category using the `createGenesisCategory` function
const nameTokenCategory = 'b260f4bff9899f4a33ac066520e0a7902537df73d125f0ade130253f1de8bcbe';

// STEP 2: Figure out the following parameters
const minStartingBid = 10000;
const minBidIncreasePercentage = 5;
const inactivityExpiryTime = 1;
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