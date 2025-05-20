// STEP 1: Create the genesis category using the `createGenesisCategory` function
const domainTokenCategory = 'cd9312b30fbf5bca4cf90a6167c5be7961603447879ed9851e01d7b2cdc0e451';

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