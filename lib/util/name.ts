import { hexToBin } from '@bitauth/libauth';

/**
 * Checks if the given name is valid.
 * A valid name contains only alphanumeric characters and hyphens.
 *
 * @param {string} name - The name to validate.
 * @returns {boolean} True if the name is valid, false otherwise.
 */
export const isValidName = (name: string): boolean =>
{
	const regex = /^[a-zA-Z0-9-]+$/;

	return regex.test(name);
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
export const convertNameToBinary = (name: string): { nameHex: string; nameBin: Uint8Array } =>
{
	const nameHex = Array.from(name)
		.map(char => char.charCodeAt(0)
			.toString(16)
			.padStart(2, '0'))
		.join('');
	const nameBin = hexToBin(nameHex);

	return { nameHex, nameBin };
};

