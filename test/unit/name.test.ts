import { describe, it, expect } from '@jest/globals';
import { isValidName } from '../../lib/util';

describe('isValidName', () =>
{
	it('should return true for valid names', () =>
	{
		expect(isValidName('valid-name')).toBe(true);
		expect(isValidName('ValidName123')).toBe(true);
		expect(isValidName('another-valid-name')).toBe(true);
	});

	it('should return false for invalid names', () =>
	{
		// contains space
		expect(isValidName('invalid name')).toBe(false);
		// contains special character
		expect(isValidName('invalid@name')).toBe(false);
		// contains underscore
		expect(isValidName('invalid_name')).toBe(false);
		// empty string
		expect(isValidName('')).toBe(false);
	});
});
