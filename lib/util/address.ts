import {
	cashAddressToLockingBytecode,
	encodeLockingBytecodeP2sh32,
	lockingBytecodeToCashAddress,
	hash256,
	hexToBin,
	binToHex,
	decodeCashAddress,
	addressContentsToLockingBytecode,
	instantiateSha256,
} from '@bitauth/libauth';

/**
 * Converts a locking bytecode to a CashAddr address.
 * @param {Uint8Array} lockingBytecode - The locking bytecode to convert.
 * @returns {string} The CashAddr address as a string.
 * @throws {Error} Will throw an error if the conversion result is invalid.
 */
export const toCashaddr = (lockingBytecode: Uint8Array): string =>
{
	const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix: 'bitcoincash' });

	// @ts-ignore
	if(typeof result.address !== 'string') throw new Error('Invalid address conversion result');

	// @ts-ignore
	return result.address;
};

/**
 * Converts a CashAddr address to a public key hash (PKH).
 * @param {string} userAddress - The CashAddr address to convert.
 * @returns {string} The public key hash as a hexadecimal string.
 * @throws {Error} Will throw an error if the address cannot be decoded.
 */
export const convertAddressToPkh = (userAddress: string): string =>
{
	const decodeAddressObj = decodeCashAddress(userAddress);
	if(typeof decodeAddressObj == 'string') throw new Error('error decodeCashAddress()');
	const userPkh = decodeAddressObj.payload;

	return binToHex(userPkh);
};

/**
 * Converts a locking bytecode to an scripthash.
 * @param {Uint8Array} lockingBytecode - The locking bytecode to convert.
 * @returns {Promise<string>} The scripthash as a hexadecimal string.
 */
export const scriptToScripthash = async (lockingBytecode: Uint8Array): Promise<string> =>
{
	const sha256 = await instantiateSha256();
	const hash = sha256.hash(lockingBytecode);
	const reversed = hash.reverse();

	return binToHex(reversed);
};

/**
 * Converts a public key hash (PKH) to a locking bytecode.
 * @param {string} userPkh - The public key hash as a hexadecimal string.
 * @returns {Uint8Array} The locking bytecode.
 */
export const convertPkhToLockingBytecode = (userPkh: string): Uint8Array =>
{
	const userPkhBin = hexToBin(userPkh);

	return addressContentsToLockingBytecode({ type: 'P2PKH', payload: userPkhBin });
};

/**
 * Converts a lock script to a CashAddr address.
 * @param {string} lockScript - The lock script as a hexadecimal string.
 * @returns {string} The CashAddr address.
 * @throws {Error} Will throw an error if the lock script cannot be converted.
 */
export const lockScriptToAddress = (lockScript: string): string =>
{
	const result = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockScript), prefix: 'bitcoincash' });

	if(typeof result === 'string' || !result.address)
	{
		throw new Error(`Provided lock script ${lockScript} cannot be converted to address ${JSON.stringify(result)}`);
	}

	return result.address;
};

/**
 * Builds a P2SH32 lock script from a script bytecode.
 * @param {string} scriptBytecodeHex - The script bytecode as a hexadecimal string.
 * @returns {string} The P2SH32 lock script as a hexadecimal string.
 */
export const buildLockScriptP2SH32 = (scriptBytecodeHex: string): string =>
{
	const scriptHashBin = hash256(hexToBin(scriptBytecodeHex));
	const lockScriptBin = encodeLockingBytecodeP2sh32(scriptHashBin);

	return binToHex(lockScriptBin);
};

/**
 * Converts a CashAddr address to a lock script.
 * @param {string} address - The CashAddr address to convert.
 * @returns {string} The lock script as a hexadecimal string.
 * @throws {Error} Will throw an error if the address cannot be converted.
 */
export const addressToLockScript = (address: string): string =>
{
	const result = cashAddressToLockingBytecode(address);
	if(typeof result === 'string') throw new Error(result);

	return binToHex(result.bytecode);
};

/**
 * Converts a CashAddr address to a token address.
 * @param {string} cashAddress - The CashAddr address to convert.
 * @returns {string} The token address.
 * @throws {Error} Will throw an error if the conversion fails.
 */
export const convertCashAddressToTokenAddress = (cashAddress: string): string =>
{
	const result = cashAddressToLockingBytecode(cashAddress);
	if(typeof result === 'string') throw new Error(result);

	const addressContents = lockingBytecodeToCashAddress({ bytecode: result.bytecode, tokenSupport: true });
	if(typeof addressContents === 'string' || !addressContents.address)
	{
		throw new Error('Failed to convert to token address');
	}

	return addressContents.address;
};