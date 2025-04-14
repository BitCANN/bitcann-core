import { ManagerConfig } from '../lib/interfaces';

export const domainTokenCategory = '8b4590c0b3f84a93634b5a5a85a550db1f4a9c9e83ad30b677ef5627ac64d218';

export const registryContractAddress = 'bitcoincash:pdsm93z2w0ur9dhl7wncddw9wtc9qxt6zcd83fjvy49v79y4rcfl630kl4kwr';
export const auctionContractAddress = 'bitcoincash:p02jukyqwgmc8s4pc9xwwq0yx6murryrj7v9hps4rdnfh2vpc36qjq7tzns0l';
export const bidContractAddress = 'bitcoincash:p0hwzu46wwnvaxezyjm0crzt2yl3xkty27haewqntsza6r9t4jg5va44lxfma';
export const domainOwnershipGuardContractAddress = 'bitcoincash:pdr6ecwd6wg8p8synxs7tuwrljuhv44prwdftakyp94rswq7nj4eyn0w5dufu';
export const auctionConflictResolverContractAddress = 'bitcoincash:pvew348de40388jtmz5rzynamptmatkwccmdf4awqmjra0cz2pn2yyjd723z5';
export const auctionNameEnforcerContractAddress = 'bitcoincash:pvp68f2vna5cp37g5vge27ef6jwf0jdd64utl7x5y7x8qlqwzdqjulcpxrpvx';
export const domainFactoryContractAddress = 'bitcoincash:pwnm8z6d7ykkw3j5rwmhthy2j5gluyq765yf3gzdl4rrqmwtewjeucsw3l732';
export const accumulatorContractAddress = 'bitcoincash:p0g5cadr8l0apw6rnadsfhjjy9clv2havpm78mpvymtsfn7v4629vptwp9mw2';

export const registryLockingBytecodeHex = 'aa2061b2c44a73f832b6fff3a786b5c572f050197a161a78a64c254acf14951e13fd87';
export const auctionLockingBytecodeHex = 'aa20d52e5880723783c2a1c14ce701e436b7c18c8397985b86151b669ba981c4740987';
export const bidLockingBytecodeHex = 'aa20eee172ba73a6ce9b2224b6fc0c4b513f13596457afdcb8135c05dd0cabac914687';
export const domainOwnershipGuardLockingBytecodeHex = 'aa2047ace1cdd390709e0499a1e5f1c3fcb97656a11b9a95f6c4096a38381e9cab9287';
export const auctionConflictResolverLockingBytecodeHex = 'aa2032e8d4edcd5f139e4bd8a831127dd857beaecec636d4d7ae06e43ebf025066a287';
export const auctionNameEnforcerLockingBytecodeHex = 'aa2003a3a54c9f6980c7c8a311957b29d49c97c9add578bff8d4278c707c0e13412e87';
export const domainFactoryLockingBytecodeHex = 'aa20a7b38b4df12d6746541bb775dc8a9511fe101ed50898a04dfd46306dcbcba59e87';
export const accumulatorLockingBytecodeHex = 'aa20d14c75a33fdfd0bb439f5b04de522171f62afd6077e3ec2c26d704cfccae945687';

export const minStartingBid = 10000;
export const minBidIncreasePercentage = 5;
export const inactivityExpiryTime = 1;
export const minWaitTime = 1;
export const maxPlatformFeePercentage = 50;

export const mockOptions: ManagerConfig = 
{
	category: domainTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	maxPlatformFeePercentage: maxPlatformFeePercentage,
};