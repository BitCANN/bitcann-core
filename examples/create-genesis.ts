import { cashAddressToLockingBytecode, binToHex } from '@bitauth/libauth';
import { NFTCapability, SendRequest, TokenMintRequest, TokenSendRequest, Wallet } from 'mainnet-js'
import { BitcannManager } from "../lib/index.js";
import { ElectrumNetworkProvider } from "cashscript";

import dotenv from 'dotenv';
dotenv.config();

import {
  nameTokenCategory,
  minStartingBid,
  minBidIncreasePercentage,
  inactivityExpiryTime,
  minWaitTime,
  creatorIncentiveAddress,
  genesisTokenAmount,
  tld,
} from './common/config.js';

const networkProvider = new ElectrumNetworkProvider('mainnet');

const bitcannManager = new BitcannManager({
	category: nameTokenCategory,
	minStartingBid: minStartingBid,
	minBidIncreasePercentage: minBidIncreasePercentage,
	inactivityExpiryTime: inactivityExpiryTime,
	minWaitTime: minWaitTime,
	creatorIncentiveAddress: creatorIncentiveAddress,
	tld: tld,
	networkProvider: networkProvider,
});

const getWallet = async () => {
  const seed = process.env.SEED
  if (!seed) {
    throw new Error('SEED is not set');
  }
  const wallet = await Wallet.fromSeed(seed, "m/44'/145'/0'/0/0");

  return wallet;
}

const createSuitableUTXO = async () => {
  const wallet = await getWallet();
  
  if (!wallet.cashaddr) {
    throw new Error('Cashaddr is not set');
  }

  const tx = await wallet.send({
    cashaddr: wallet.cashaddr,
    value: 5000,
    unit: "sat"
  })

  console.log(tx)
  console.log('INFO: Suitable UTXO created for minting the genesis category')
}

const createGenesisCategory = async () => {
  const wallet = await getWallet();

  if (!wallet.tokenaddr) {
    throw new Error('Tokenaddr is not set');
  }

  const initialValue = 0
  const tx = await wallet.tokenGenesis({
    cashaddr: wallet.tokenaddr,
    capability: NFTCapability.minting,
    amount: genesisTokenAmount,
    commitment: initialValue.toString(16).padStart(16, '0'),
  })

  console.log(tx)
  console.log('INFO: Genesis category created')
}

const createMintingSetup = async () => {
  const wallet = await getWallet();
  const mintingSetup: any = []
  const registryContract = bitcannManager.contracts.Registry;

  mintingSetup.push(
    new TokenMintRequest({
      cashaddr: registryContract.address,
      value: 800,
      capability: NFTCapability.minting,
    }),
  )

  for (const contract of Object.values(bitcannManager.contracts)) {
    console.log('contract', contract.name)
    console.log('contract', contract.address)
    // @ts-ignore
    const lockingBytecode = binToHex(cashAddressToLockingBytecode(contract.address).bytecode)
    console.log('lockingBytecode', lockingBytecode)
    console.log('--------------------------------')
  }

  for (const contract of Object.values(bitcannManager.contracts)) {
    // @ts-ignore
    const lockingBytecode = binToHex(cashAddressToLockingBytecode(contract.address).bytecode)

    if(contract.name === 'Registry') {
      continue;
    }

    mintingSetup.push(
      new TokenMintRequest({
        cashaddr: registryContract.address,
        value: 800,
        capability: NFTCapability.none,
        commitment: lockingBytecode
      }),
      new SendRequest({
        cashaddr: contract.address,
        value: 800,
        unit: "sat"
      })
    )
  }

  const tx = await wallet.tokenMint(
    nameTokenCategory,
    mintingSetup
  )

  console.log(mintingSetup)
  console.log(tx)
  console.log('INFO: Minting setup complete')

  const utxos = await wallet.getTokenUtxos(nameTokenCategory);
  const mintingUtxo = utxos.find(utxo => utxo.token?.capability === NFTCapability.minting);
  if (!mintingUtxo) {
    console.log('No minting NFT found');
    return;
  }
  
  const tokenId = mintingUtxo.token?.tokenId;
  const amount = mintingUtxo.token?.amount;
  const capability = mintingUtxo.token?.capability;
  const commitment = mintingUtxo.token?.commitment;

  const transferTx = await wallet.send([
    new TokenSendRequest({
      cashaddr: registryContract.address,
      amount,
      // @ts-ignore
      tokenId,
      capability,
      commitment
    })
  ])

  console.log(transferTx)

  console.log('INFO: Minting with token amount transferred')
}

(async () =>
  {
    // Do this as Step 1 and once done, comment out the line below
    // await createSuitableUTXO();

    // Do this as Step 2
    // await createGenesisCategory();

    // Do this as step 3, copy the tokenID from the terminal and paste it above in the `const nameTokenCategory` variable
    // and once done, comment out the line below
    await createMintingSetup();

    // Once this is done, you are ready to go!
  })();
  