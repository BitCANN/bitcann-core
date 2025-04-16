/* eslint-disable max-classes-per-file */

export class InvalidNameError extends Error
{
	constructor()
	{
		// Define a message indicating that no authentication token was provided.
		const message = 'The name provided is invalid. Please ensure that the name contains only alphanumeric characters and hyphens.';

		// Create an instance of the parent Error class using the specified message.
		super(message);
	}
}

export class ThreadNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Thread NFT UTXO not found';

		super(message);
	}
}

export class RegistrationCounterUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Registration Counter UTXO not found';

		super(message);
	}
}

export class AuctionUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Auction UTXO not found';

		super(message);
	}
}

export class AuthorizedContractUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Authorized Contract UTXO not found';

		super(message);
	}
}

export class UserUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User UTXO not found';

		super(message);
	}
}
