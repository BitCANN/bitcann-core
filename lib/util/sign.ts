
import {
	encodeTransaction,
	generateSigningSerializationBCH,
	generateTransaction,
	hash256,
	secp256k1,
	sha256,
	SigningSerializationFlag,
	walletTemplateToCompilerBCH,
	importWalletTemplate,
	walletTemplateP2pkhNonHd,
	binToHex,
	hexToBin,
	decodeTransaction,
} from '@bitauth/libauth';
import { generateSourceOutputs } from '../index.js';
import { toCashaddr } from './address.js';

/**
 * Signs a transaction using the provided private key and address.
 * @param address - The address associated with the transaction.
 * @param privateKey - The private key used for signing.
 * @param decoded - The decoded transaction object.
 * @param sourceOutputsUnpacked - The source outputs unpacked from the transaction.
 * @returns A promise that resolves to an object containing the signed transaction, its hex representation, and its hash.
 * @throws Will throw an error if the transaction template or public key is invalid.
 */
export const signTransaction = async ({
	address,
	privateKey,
	decoded,
	sourceOutputsUnpacked,
}: {
	address: any;
	privateKey: any;
	decoded: any;
	sourceOutputsUnpacked: any;
}): Promise<{
	txn: any;
	hex: string;
	txHash: string;
}> =>
{
	const template = importWalletTemplate(walletTemplateP2pkhNonHd);
	if(typeof template === 'string')
	{
		throw new Error('Transaction template error');
	}
	const compiler = await walletTemplateToCompilerBCH(template);

	const pubkeyCompressed = secp256k1.derivePublicKeyCompressed(privateKey);
	if(typeof pubkeyCompressed === 'string')
	{
		throw new Error('Public key error');
	}

	const transactionTemplate = { ...decoded };

	for(const [ index, input ] of decoded.inputs.entries())
	{
		if(sourceOutputsUnpacked[index]?.contract?.artifact.contractName)
		{
			// Replace pubkey and sig placeholders
			let unlockingBytecodeHex = binToHex(sourceOutputsUnpacked[index].unlockingBytecode);
			const sigPlaceholder = '41' + binToHex(Uint8Array.from(Array(65)));
			const pubkeyPlaceholder = '21' + binToHex(Uint8Array.from(Array(33)));
			if(unlockingBytecodeHex.indexOf(sigPlaceholder) !== -1)
			{
				// Compute the signature argument
				const hashType = SigningSerializationFlag.allOutputs | SigningSerializationFlag.utxos | SigningSerializationFlag.forkId;
				const context = { inputIndex: index, sourceOutputs: sourceOutputsUnpacked, transaction: decoded };
				const signingSerializationType = new Uint8Array([ hashType ]);

				const coveredBytecode = sourceOutputsUnpacked[index].contract?.redeemScript;
				if(!coveredBytecode)
				{
					console.log('Not enough information provided, please include contract redeemScript');
					throw new Error('Not enough information provided, please include contract redeemScript');
				}
				const sighashPreimage = generateSigningSerializationBCH(context, { coveredBytecode, signingSerializationType });
				const sighash = hash256(sighashPreimage);
				const signature = secp256k1.signMessageHashSchnorr(privateKey, sighash);
				if(typeof signature === 'string')
				{
					console.log('Not enough information provided, please include contract redeemScript');
					throw new Error('Not enough information provided, please include contract redeemScript');
				}
				const sig = Uint8Array.from([ ...signature, hashType ]);
				unlockingBytecodeHex = unlockingBytecodeHex.replace(sigPlaceholder, '41' + binToHex(sig));
			}
			if(unlockingBytecodeHex.indexOf(pubkeyPlaceholder) !== -1)
			{
				unlockingBytecodeHex = unlockingBytecodeHex.replace(pubkeyPlaceholder, '21' + binToHex(pubkeyCompressed));
			}
			transactionTemplate.inputs[index] = {
				...input,
				unlockingBytecode: hexToBin(unlockingBytecodeHex),
			};
		}
		else
		{
			// Replace unlocking bytecode for non-contract inputs having placeholder unlocking bytecode
			if(!sourceOutputsUnpacked[index]?.unlockingBytecode?.length && toCashaddr(sourceOutputsUnpacked[index]?.lockingBytecode) === address)
			{
				transactionTemplate.inputs[index] = {
					...input,
					unlockingBytecode: {
						compiler,
						data: {
							keys: { privateKeys: { key: privateKey } },
						},
						valueSatoshis: sourceOutputsUnpacked[index].valueSatoshis,
						script: 'unlock',
						token: sourceOutputsUnpacked[index].token,
					},
				};
			}
		}
	}

	const result = generateTransaction(transactionTemplate);
	if(!result.success)
	{
		throw new Error(result.errors.join(', '));
	}

	// @ts-ignore
	const encodedTransaction = encodeTransaction(result.transaction);

	return {
		// @ts-ignore
		txn: result.transaction,
		hex: binToHex(encodedTransaction),
		// @ts-ignore
		txHash: binToHex(sha256.hash(sha256.hash(result.transaction)).reverse()),
	};
};

/**
 * Prepares a transaction for signing using WalletConnect.
 * @param transaction - The transaction to be prepared.
 * @param prompt - The user prompt for WalletConnect.
 * @returns A promise that resolves to an object containing the prepared transaction and source outputs.
 * @throws Will throw an error if the transaction cannot be decoded.
 */
export const getWalletConnectTransaction = async ({
	transaction,
	prompt,
}: {
	transaction: any;
	prompt: string;
}): Promise<{
	transaction: any;
	sourceOutputs: any;
}> =>
{
	const unsignedRawTransactionHex = transaction.build();

	const decodedTransaction = decodeTransaction(hexToBin(unsignedRawTransactionHex));
	if(typeof decodedTransaction == 'string') throw new Error('!decodedTransaction');

	// @ts-ignore
	const sourceOutputs = generateSourceOutputs(transaction.inputs);

	const preparedSourceOutputs = sourceOutputs.map((sourceOutput, index) =>
	{
		return { ...sourceOutput, ...decodedTransaction.inputs[index] };
	});

	// SIGN USING WALLETCONNECT

	const wcTransactionObj = {
		transaction: decodedTransaction,
		sourceOutputs: preparedSourceOutputs,
		broadcast: true,
		userPrompt: prompt,
	};

	return wcTransactionObj;
};

/**
 * Signs a transaction using a provided private key.
 * @param transaction - The transaction to be signed.
 * @param address - The address associated with the transaction.
 * @param privateKey - The private key used for signing.
 * @returns A promise that resolves to an object containing the signed transaction, its hex representation, and its hash.
 * @throws Will throw an error if the transaction cannot be decoded.
 */
export const getSignedTransaction = async ({
	transaction,
	address,
	privateKey,
}: {
	transaction: any;
	address: any;
	privateKey: any;
}): Promise<{
	txn: any;
	hex: string;
	txHash: string;
}> =>
{
	const unsignedRawTransactionHex = transaction.build();

	const decodedTransaction = decodeTransaction(hexToBin(unsignedRawTransactionHex));
	if(typeof decodedTransaction == 'string') throw new Error('!decodedTransaction');

	// @ts-ignore
	const sourceOutputs = generateSourceOutputs(transaction.inputs);

	const preparedSourceOutputs = sourceOutputs.map((sourceOutput, index) =>
	{
		return { ...sourceOutput, ...decodedTransaction.inputs[index] };
	});

	// SIGN USING LOCAL PRIVATE KEY

	const signedTransaction = await signTransaction({
		address,
		privateKey,
		decoded: decodedTransaction,
		sourceOutputsUnpacked: preparedSourceOutputs,
	});

	return signedTransaction;
};