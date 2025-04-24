import {
  encodeTransaction,
  generateSigningSerializationBCH,
  generateTransaction,
  hash256,
  lockingBytecodeToCashAddress,
  secp256k1,
  sha256,
  SigningSerializationFlag,
  walletTemplateToCompilerBCH,
  importWalletTemplate,
  walletTemplateP2pkhNonHd,
  binToHex,
  hexToBin
} from "@bitauth/libauth";


const toCashaddr = (lockingBytecode: any) => {
  const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix: 'bitcoincash' });
  // @ts-ignore
  if (typeof result.address !== "string") throw result;
  // @ts-ignore
  return result.address;
}

export const signTransaction = async ({
  address,
  privateKey,
  decoded,
  sourceOutputsUnpacked
}: {
  address: any;
  privateKey: any;
  decoded: any;
  sourceOutputsUnpacked: any;
}) => {
  const template = importWalletTemplate(walletTemplateP2pkhNonHd);
  if (typeof template === "string") {
    throw new Error("Transaction template error");
  }
  const compiler = await walletTemplateToCompilerBCH(template);

  const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey);
  if (typeof pubkeyCompressed === "string") {
    console.log('Public key error')
    return;
  }

  const transactionTemplate = { ...decoded };

  for (const [index, input] of decoded.inputs.entries()) {
    if (sourceOutputsUnpacked[index]?.contract?.artifact.contractName) {

      // replace pubkey and sig placeholders
      let unlockingBytecodeHex = binToHex(sourceOutputsUnpacked[index].unlockingBytecode);
      const sigPlaceholder = "41" + binToHex(Uint8Array.from(Array(65)));
      const pubkeyPlaceholder = "21" + binToHex(Uint8Array.from(Array(33)));
      if (unlockingBytecodeHex.indexOf(sigPlaceholder) !== -1) {
        // compute the signature argument
        const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId;
        const context = { inputIndex: index, sourceOutputs: sourceOutputsUnpacked, transaction: decoded };
        const signingSerializationType = new Uint8Array([hashType]);

        const coveredBytecode = sourceOutputsUnpacked[index].contract?.redeemScript;
        if (!coveredBytecode) {
          console.log("Not enough information provided, please include contract redeemScript")
          return;
        }
        const sighashPreimage = generateSigningSerializationBCH(context, { coveredBytecode, signingSerializationType });
        const sighash = hash256(sighashPreimage);
        const signature = secp256k1.signMessageHashSchnorr(privateKey, sighash);
        if (typeof signature === "string") {
          console.log("Not enough information provided, please include contract redeemScript")
          return;
        }
        const sig = Uint8Array.from([...signature, hashType]);
        unlockingBytecodeHex = unlockingBytecodeHex.replace(sigPlaceholder, "41" + binToHex(sig));
      }
      if (unlockingBytecodeHex.indexOf(pubkeyPlaceholder) !== -1) {
        unlockingBytecodeHex = unlockingBytecodeHex.replace(pubkeyPlaceholder, "21" + binToHex(pubkeyCompressed));
      }
      transactionTemplate.inputs[index] = {
        ...input,
        unlockingBytecode: hexToBin(unlockingBytecodeHex)
      };

    } else {
      // replace unlocking bytecode for non-contract inputs having placeholder unlocking bytecode

      if (!sourceOutputsUnpacked[index]?.unlockingBytecode?.length && toCashaddr(sourceOutputsUnpacked[index]?.lockingBytecode) === address) {
        transactionTemplate.inputs[index] = {
          ...input,
          unlockingBytecode: {
          compiler,
          data: {
            keys: { privateKeys: { key: privateKey } },
          },
          valueSatoshis: sourceOutputsUnpacked[index].valueSatoshis,
          script: "unlock",
          token: sourceOutputsUnpacked[index].token,
        }
      }
    }
    }
  };

  const result = generateTransaction(transactionTemplate);
  if (!result.success) {
    throw result.errors;
  }

	// @ts-ignore
	const encodedTransaction = encodeTransaction(result.transaction);
  
  return {
		// @ts-ignore
    txn: result.transaction,
		hex: binToHex(encodedTransaction),
		// @ts-ignore
    txHash: binToHex(sha256.hash(sha256.hash(result.transaction)).reverse())
  }
}
