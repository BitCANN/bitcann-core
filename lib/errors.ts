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

export class InternalAuthNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Internal Auth NFT UTXO not found';

		super(message);
	}
}

export class ExternalAuthNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'External Auth NFT UTXO not found';

		super(message);
	}
}

export class UserOwnershipNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User Ownership NFT UTXO not found';

		super(message);
	}
}

export class UserFundingUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User Funding UTXO not found';

		super(message);
	}
}

export class RunningAuctionUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Running Auction UTXO not found';

		super(message);
	}
}

export class InvalidBidAmountError extends Error
{
	constructor()
	{
		const message = 'The bid amount is invalid';

		super(message);
	}
}

export class DomainMintingUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Domain Minting UTXO not found';

		super(message);
	}
}

export class AuctionNameDoesNotContainInvalidCharacterError extends Error
{
	constructor()
	{
		const message = 'The auction name does not contain an invalid character';

		super(message);
	}
}

export class DuplicateAuctionsDoNotExistError extends Error
{
	constructor()
	{
		const message = 'Duplicate auctions do not exist';

		super(message);
	}
}
