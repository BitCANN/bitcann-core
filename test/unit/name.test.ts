import { describe, it, expect } from '@jest/globals';
import { isValidName } from '../../lib/util/name';

describe('isValidName', () => {
  it('should return true for valid names', () => {
    expect(isValidName('valid-name')).toBe(true);
    expect(isValidName('ValidName123')).toBe(true);
    expect(isValidName('another-valid-name')).toBe(true);
  });

  it('should return false for invalid names', () => {
    expect(isValidName('invalid name')).toBe(false); // contains space
    expect(isValidName('invalid@name')).toBe(false); // contains special character
    expect(isValidName('invalid_name')).toBe(false); // contains underscore
    expect(isValidName('')).toBe(false); // empty string
  });
});
