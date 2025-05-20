
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
	type TransactionCommon,
} from '@bitauth/libauth';
import { TransactionBuilder } from 'cashscript';
import { generateSourceOutputs } from '../index.js';
import { toCashaddr } from './address.js';

/**
 * Parameters for preparing a transaction for signing using WalletConnect.
 */
export interface GetWalletConnectTransactionParams
{
	transaction: TransactionBuilder;
	prompt: string;
}

/**
 * Response type for a prepared transaction for signing using WalletConnect.
 */
export interface GetWalletConnectTransactionResponse
{
	transaction: TransactionCommon;
	sourceOutputs: any;
	broadcast: boolean;
	userPrompt: string;
}

/**
 * Interface for the parameters required to sign a transaction.
 */
export interface GetSignedTransactionParams
{
	transaction: TransactionBuilder;
	address: string;
	privateKey: string;
}

/**
 * Interface for the response returned after signing a transaction.
 */
export interface GetSignedTransactionResponse
{
	txn: any;
	hex: string;
	txHash: string;
}


/**
 * Interface for the parameters required to sign a transaction.
 */
export interface SignTransactionParams
{
	address: any;
	privateKey: any;
	decoded: any;
	sourceOutputsUnpacked: any;
}

/**
 * Interface for the response returned after signing a transaction.
 */
export interface SignTransactionResponse
{
	txn: any;
	hex: string;
	txHash: string;
}

/**
 * Signs a transaction using the provided private key and address.
 * @param params - The parameters required to sign the transaction.
 * @returns A promise that resolves to an object containing the signed transaction, its hex representation, and its hash.
 * @throws Will throw an error if the transaction template or public key is invalid.
 */
export const signTransaction = async ({
	address,
	privateKey,
	decoded,
	sourceOutputsUnpacked,
}: SignTransactionParams): Promise<SignTransactionResponse> =>
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
 *
 * This function processes a transaction and a user prompt to prepare it for signing,
 * returning an object with the prepared transaction and its source outputs.
 *
 * @param {GetWalletConnectTransactionParams} params - The parameters for preparing the transaction.
 * @param {Transaction} params.transaction - The transaction object to be prepared for signing.
 * @param {string} params.prompt - A user prompt message for WalletConnect.
 * @returns {Promise<GetWalletConnectTransactionResponse>} A promise that resolves to an object containing:
 *   - transaction: The prepared transaction object.
 *   - sourceOutputs: The source outputs associated with the transaction.
 * @throws {Error} Throws an error if the transaction cannot be decoded.
 */
export const getWalletConnectTransaction = async ({
	transaction,
	prompt,
}: GetWalletConnectTransactionParams): Promise<GetWalletConnectTransactionResponse> =>
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
 * @param params - The parameters for signing the transaction.
 * @returns A promise that resolves to an object containing the signed transaction, its hex representation, and its hash.
 * @throws Will throw an error if the transaction cannot be decoded.
 */
export const getSignedTransaction = async (
	params: GetSignedTransactionParams,
): Promise<GetSignedTransactionResponse> =>
{
	const { transaction, address, privateKey } = params;
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