import { cashAddressToLockingBytecode, encodeLockingBytecodeP2sh32, lockingBytecodeToCashAddress, hash256, hexToBin, binToHex, numberToBinUint16BE } from '@bitauth/libauth';

export const intToBytesToHex = function({ value, length }: { value: number; length: number }): string
{
	const bin = numberToBinUint16BE(value);
	const bytes = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
	if(bytes.length > length)
	{
		throw new Error(`Value ${value} exceeds the specified length of ${length} bytes`);
	}
	const result = new Uint8Array(length);
	result.set(bytes, length - bytes.length);
	
	return binToHex(result);
};

export const hexToInt = function(hex: string): number
{
	const bytes = hexToBin(hex);
	let intValue = 0;
	for(let i = 0; i < bytes.length; i++)
	{
		intValue = (intValue << 8) | bytes[i];
	}

	return intValue;
};

export const pushDataHex = function(data: string): string
{
 	const hexData = Buffer.from(data, 'utf8').toString('hex');
	const length = hexData.length / 2;
  
	if(length <= 75)
	{
		return length.toString(16).padStart(2, '0') + hexData;
	}
	else if(length <= 255)
	{
		return '4c' + length.toString(16).padStart(2, '0') + hexData;
	}
	else if(length <= 65535)
	{
		return '4d' + length.toString(16).padStart(4, '0') + hexData;
	}
	else
	{
		return '4e' + length.toString(16).padStart(8, '0') + hexData;
	}
};

export const extractOpReturnPayload = function(opReturnHex: string): string
{
	if(!opReturnHex.startsWith('6a'))
	{
		throw new Error('Not a valid OP_RETURN script');
	}

	let cursor = 2;
	let opcodeOrLength = parseInt(opReturnHex.slice(cursor, cursor + 2), 16);
	cursor += 2;

	let dataLength;

	if(opcodeOrLength === 0x4c)
	{
		dataLength = parseInt(opReturnHex.slice(cursor, cursor + 2), 16);
		cursor += 2;
	}
	else if(opcodeOrLength === 0x4d)
	{
		dataLength = parseInt(opReturnHex.slice(cursor, cursor + 4), 16);
		cursor += 4;
	}
	else if(opcodeOrLength === 0x4e)
	{
		dataLength = parseInt(opReturnHex.slice(cursor, cursor + 8), 16);
		cursor += 8;
	}
	else
	{
		dataLength = opcodeOrLength;
	}

	const dataHex = opReturnHex.slice(cursor, cursor + dataLength * 2);
	
	return dataHex;
};


export const findPureUTXO = (utxos: any[]): any =>
{
	const utxo = utxos.reduce((max, val) => 
		(!val.token && val.satoshis > (max?.satoshis || 0)) ? val : max, 
	null,
	);
	
	if(!utxo) throw new Error('Could not find user UTXO without token');

	return utxo;
};

export const lockScriptToAddress = function(lockScript: string): string
{
	// Convert the lock script to a cashaddress (with bitcoincash: prefix).
	const result = lockingBytecodeToCashAddress({ bytecode: hexToBin(lockScript), prefix: 'bitcoincash' });
	// A successful conversion will result in a string, unsuccessful will return AddressContents

	// @ts-ignore
	if(typeof result.address !== 'string')
	{
		throw(new Error(`Provided lock script ${lockScript} cannot be converted to address ${JSON.stringify(result)}`));
	}

	// @ts-ignore
	return result.address;
};

export const buildLockScriptP2SH32 = function(scriptBytecodeHex: string): string
{
	// Hash the lockscript for p2sh32 (using hash256)
	const scriptHashBin = hash256(hexToBin(scriptBytecodeHex));

	// Get the lockscript
	const lockScriptBin = encodeLockingBytecodeP2sh32(scriptHashBin);

	// Convert back to the library's convention of hex
	const lockScriptHex = binToHex(lockScriptBin);

	return lockScriptHex;
};


export const addressToLockScript = function(address: string): string
{
	const result = cashAddressToLockingBytecode(address);

	// The `cashAddressToLockingBytecode()` call returns an error string OR the correct bytecode
	// so we check if it errors, in which case we throw the error, otherwise return the result
	if(typeof result === 'string') throw(new Error(result));

	const lockScript = binToHex(result.bytecode);

	return lockScript;
};
