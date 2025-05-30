import { hash160 } from '@cashscript/utils';
import {
	deriveHdPrivateNodeFromSeed,
	deriveHdPath,
	secp256k1,
	encodeCashAddress,
	deriveSeedFromBip39Mnemonic,
} from '@bitauth/libauth';
import type { ManagerConfig } from '../lib/interfaces';
import { SignatureTemplate } from 'cashscript';

export const domainTokenCategory = '98570f00cad2991de0ab25f14ffae29a0c61da97ba6d466acbc8476e2e612ada';

export const accumulatorContractAddress = 'bchtest:p0g5cadr8l0apw6rnadsfhjjy9clv2havpm78mpvymtsfn7v4629vzvllagmc';
export const auctionConflictResolverContractAddress = 'bchtest:pvew348de40388jtmz5rzynamptmatkwccmdf4awqmjra0cz2pn2y84uqjzhx';
export const auctionContractAddress = 'bchtest:p02jukyqwgmc8s4pc9xwwq0yx6murryrj7v9hps4rdnfh2vpc36qjre6utr6d';
export const auctionNameEnforcerContractAddress = 'bchtest:pvp68f2vna5cp37g5vge27ef6jwf0jdd64utl7x5y7x8qlqwzdqjuulscmje5';
export const bidContractAddress = 'bchtest:p0hwzu46wwnvaxezyjm0crzt2yl3xkty27haewqntsza6r9t4jg5v7jyp76w0';
export const domainFactoryContractAddress = 'bchtest:pvfc4lqk3yrsd0qu7ly7m3x0389cjrmfs3t0vzkxd0f4wdren8jgzdxr35w5a';
export const domainOwnershipGuardContractAddress = 'bchtest:pd4jrf9sdfwd0f7gsv5njg24f9tu6een530qa4hs85epwxwp4wjuyu8h57ud3';
export const registryContractAddress = 'bchtest:p0lgte7fqtn9n5yqq0gmef5dq8ppdylppa830r5mma8dare50xkfgdz2804ca';

export const accumulatorLockingBytecodeHex = 'aa20d14c75a33fdfd0bb439f5b04de522171f62afd6077e3ec2c26d704cfccae945687';
export const auctionConflictResolverLockingBytecodeHex = 'aa2032e8d4edcd5f139e4bd8a831127dd857beaecec636d4d7ae06e43ebf025066a287';
export const auctionLockingBytecodeHex = 'aa20d52e5880723783c2a1c14ce701e436b7c18c8397985b86151b669ba981c4740987';
export const auctionNameEnforcerLockingBytecodeHex = 'aa2003a3a54c9f6980c7c8a311957b29d49c97c9add578bff8d4278c707c0e13412e87';
export const bidLockingBytecodeHex = 'aa20eee172ba73a6ce9b2224b6fc0c4b513f13596457afdcb8135c05dd0cabac914687';
export const domainFactoryLockingBytecodeHex = 'aa20138afc16890706bc1cf7c9edc4cf89cb890f698456f60ac66bd357347999e48187';
export const domainOwnershipGuardLockingBytecodeHex = 'aa206b21a4b06a5cd7a7c883293921554957cd6733a45e0ed6f03d321719c1aba5c287';
export const registryLockingBytecodeHex = 'aa20fe85e7c902e659d08003d1bca68d01c21693e10f4f178e9bdf4ede8f3479ac9487';

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

const seed = deriveSeedFromBip39Mnemonic('');
const rootNode = deriveHdPrivateNodeFromSeed(seed, { assumeValidity: true, throwErrors: true });
const baseDerivationPath = "m/44'/145'/0'/0";

// Derive Alice's private key, public key, public key hash and address
const aliceNode = deriveHdPath(rootNode, `${baseDerivationPath}/0`);
if(typeof aliceNode === 'string') throw new Error();
export const alicePub = secp256k1.derivePublicKeyCompressed(aliceNode.privateKey);
export const alicePriv = aliceNode.privateKey;
// @ts-ignore
export const alicePkh = hash160(alicePub);
export const aliceAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkh', payload: alicePkh, throwErrors: true }).address;
export const aliceTokenAddress = encodeCashAddress({ prefix: 'bchtest', type: 'p2pkhWithTokens', payload: alicePkh, throwErrors: true }).address;
export const aliceTemplate = new SignatureTemplate(alicePriv);