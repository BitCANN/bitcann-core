import { hexToBin } from "@bitauth/libauth";
import { convertAddressToPkh, convertPkhToLockingBytecode } from "./utxo-util";


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
export function convertNameToBinary(name: string): { nameHex: string; nameBin: Uint8Array } {
  const nameHex = Array.from(name).map(char => char.charCodeAt(0).toString(16)
      .padStart(2, '0'))
      .join('');
  const nameBin = hexToBin(nameHex);
  return { nameHex, nameBin };
}
