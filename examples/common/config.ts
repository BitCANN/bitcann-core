// STEP 1: Create the genesis category using the `createGenesisCategory` function
const domainTokenCategory = 'b260f4bff9899f4a33ac066520e0a7902537df73d125f0ade130253f1de8bcbe';

// STEP 2: Figure out the following parameters
const minStartingBid = 10000;
const minBidIncreasePercentage = 5;
const inactivityExpiryTime = 1;
const minWaitTime = 4194306;
const maxPlatformFeePercentage = 50;
const platformFeeAddress = process.env.FEE_COLLECTION_ADDRESS;
const genesisTokenAmount = BigInt('9223372036854775807');

export {
  domainTokenCategory,
  minStartingBid,
  minBidIncreasePercentage,
  inactivityExpiryTime,
  minWaitTime,
  maxPlatformFeePercentage,
  platformFeeAddress,
  genesisTokenAmount,
}