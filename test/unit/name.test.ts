import { describe, it, expect } from '@jest/globals';
import { validateName } from '../../lib/util/name.js';

describe('validateName', () =>
{
	it('should not throw for valid names', () =>
	{
		expect(() => validateName('valid-name')).not.toThrow();
		expect(() => validateName('ValidName123')).not.toThrow();
		expect(() => validateName('another-valid-name')).not.toThrow();
	});

	it('should throw for invalid names', () =>
	{
		// contains space
		expect(() => validateName('invalid name')).toThrow();
		// contains special character
		expect(() => validateName('invalid@name')).toThrow();
		// contains underscore
		expect(() => validateName('invalid_name')).toThrow();
		// empty string
		expect(() => validateName('')).toThrow();
	});
});
