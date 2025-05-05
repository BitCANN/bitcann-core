import { numberToBinUint16BE, hexToBin, binToHex } from '@bitauth/libauth';

export const intToBytesToHex = ({ value, length }: { value: number; length: number }): string =>
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

export const hexToInt = (hex: string): number =>
{
	const bytes = hexToBin(hex);
	let intValue = 0;
	for(let i = 0; i < bytes.length; i++)
	{
		intValue = (intValue << 8) | bytes[i];
	}

	return intValue;
};

export const pushDataHex = (data: string): string =>
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

export const extractOpReturnPayload = (opReturnHex: string): string =>
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

	return opReturnHex.slice(cursor, cursor + dataLength * 2);
};