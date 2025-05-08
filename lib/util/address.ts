import {
	cashAddressToLockingBytecode,
	encodeLockingBytecodeP2sh32,
	lockingBytecodeToCashAddress,
	hash256,
	hexToBin,
	binToHex,
	decodeCashAddress,
	addressContentsToLockingBytecode,
} from '@bitauth/libauth';

/**
 * Converts a locking bytecode to a CashAddr address.
 * @param lockingBytecode - The locking bytecode to convert.
 * @returns The CashAddr address as a string.
 * @throws Will throw an error if the conversion result is invalid.
 */
export const toCashaddr = (lockingBytecode: any): string =>
{
	const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix: 'bitcoincash' });

	// @ts-ignore
	if(typeof result.address !== 'string') throw new Error('Invalid address conversion result');

	// @ts-ignore
	return result.address;
};

export const convertAddressToPkh = (userAddress: string): string =>
{
	const decodeAddressObj = decodeCashAddress(userAddress);
	if(typeof decodeAddressObj == 'string') throw new Error('error decodeCashAddress()');
	const userPkh = decodeAddressObj.payload;

	return binToHex(userPkh);
};

export const convertPkhToLockingBytecode = (userPkh: string): any =>
{
	const userPkhBin = hexToBin(userPkh);

	return addressContentsToLockingBytecode({ type: 'P2PKH', payload: userPkhBin });
};

export const lockScriptToAddress = (lockScript: string): string =>
{
	const result = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockScript), prefix: 'bitcoincash' });

	if(typeof result === 'string' || !result.address)
	{
		throw new Error(`Provided lock script ${lockScript} cannot be converted to address ${JSON.stringify(result)}`);
	}

	return result.address;
};

export const buildLockScriptP2SH32 = (scriptBytecodeHex: string): string =>
{
	const scriptHashBin = hash256(hexToBin(scriptBytecodeHex));
	const lockScriptBin = encodeLockingBytecodeP2sh32(scriptHashBin);

	return binToHex(lockScriptBin);
};

export const addressToLockScript = (address: string): string =>
{
	const result = cashAddressToLockingBytecode(address);
	if(typeof result === 'string') throw new Error(result);

	return binToHex(result.bytecode);
};

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