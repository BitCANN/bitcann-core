import { hexToBin } from '@bitauth/libauth';
import { InvalidNameError } from '../errors.js';

/**
 * Validates the given name.
 * A valid name contains only alphanumeric characters and hyphens.
 *
 * @param {string} name - The name to validate.
 * @throws {InvalidNameError} If the name is invalid.
 */
export const validateName = (name: string): void =>
{
	const regex = /^[a-zA-Z0-9-]+$/;

	if(!regex.test(name))
	{
		throw new InvalidNameError();
	}
};


/**
 * Finds the first index of an invalid character in the given name.
 * An invalid character is any character that does not match the regex /^[a-zA-Z0-9-]+$/.
 *
 * @param {string} name - The name to check for invalid characters.
 * @returns {number} The index of the first invalid character, or -1 if all characters are valid.
 */
export const findFirstInvalidCharacterIndex = (name: string): number =>
{
	for(let i = 0; i < name.length; i++)
	{
		if(!/^[a-zA-Z0-9-]$/.test(name[i]))
		{
			return i + 1;
		}
	}

	return -1;
};


/**
 * Converts a given name into its hexadecimal and binary representations.
 *
 * This function takes a string name and converts each character into its
 * hexadecimal representation, then combines these into a single string.
 * It also converts the hexadecimal string into a binary Uint8Array.
 *
 * @param {string} name - The name to be converted.
 * @returns {Object} An object containing:
 *  - nameHex: The hexadecimal representation of the name.
 *  - nameBin: The binary (Uint8Array) representation of the name.
 */
export const convertNameToBinaryAndHex = (name: string): { nameHex: string; nameBin: Uint8Array } =>
{
	const nameHex = Array.from(name)
		.map(char => char.charCodeAt(0)
			.toString(16)
			.padStart(2, '0'))
		.join('');
	const nameBin = hexToBin(nameHex);

	return { nameHex, nameBin };
};

