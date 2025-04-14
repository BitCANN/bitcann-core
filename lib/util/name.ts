

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
