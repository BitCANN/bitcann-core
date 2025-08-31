/* eslint-disable max-classes-per-file */

/**
 * Error thrown when an invalid name is provided.
 */
export class InvalidNameError extends Error
{
	constructor()
	{
		// Message indicating the name is invalid.
		const message = 'The name provided is invalid. Please ensure that the name contains only alphanumeric characters and hyphens.';

		// Call the parent Error class with the message.
		super(message);
	}
}

/**
 * Error thrown when a Thread NFT UTXO is not found.
 */
export class ThreadNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Thread NFT UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a Registration Counter UTXO is not found.
 */
export class RegistrationCounterUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Registration Counter UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an Auction UTXO is not found.
 */
export class AuctionUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Auction UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an Authorized Contract UTXO is not found.
 */
export class AuthorizedContractUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Authorized Contract UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a User UTXO is not found.
 */
export class UserUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an Internal Auth NFT UTXO is not found.
 */
export class InternalAuthNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Internal Auth NFT UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an External Auth NFT UTXO is not found.
 */
export class ExternalAuthNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'External Auth NFT UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a User Ownership NFT UTXO is not found.
 */
export class UserOwnershipNFTUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User Ownership NFT UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a User Funding UTXO is not found.
 */
export class UserFundingUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'User Funding UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a Running Auction UTXO is not found.
 */
export class RunningAuctionUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Running Auction UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an auction amount is invalid.
 */
export class InvalidAuctionAmountError extends Error
{
	constructor()
	{
		const message = 'The auction amount is invalid';

		super(message);
	}
}

/**
 * Error thrown when a bid amount is invalid.
 */
export class InvalidBidAmountError extends Error
{
	constructor()
	{
		const message = 'The bid amount is invalid';

		super(message);
	}
}

/**
 * Error thrown when a Name Minting UTXO is not found.
 */
export class NameMintingUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Name Minting UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when an auction name does not contain an invalid character.
 */
export class AuctionNameDoesNotContainInvalidCharacterError extends Error
{
	constructor()
	{
		const message = 'The auction name does not contain an invalid character';

		super(message);
	}
}

/**
 * Error thrown when duplicate auctions do not exist.
 */
export class DuplicateAuctionsDoNotExistError extends Error
{
	constructor()
	{
		const message = 'Duplicate auctions do not exist';

		super(message);
	}
}

/**
 * Error thrown when a Thread With Token UTXO is not found.
 */
export class ThreadWithTokenUTXONotFoundError extends Error
{
	constructor()
	{
		const message = 'Thread With Token UTXO not found';

		super(message);
	}
}

/**
 * Error thrown when a previous bidder address is invalid.
 */
export class InvalidPrevBidderAddressError extends Error
{
	constructor()
	{
		const message = 'The previous bidder address is invalid';

		super(message);
	}
}
