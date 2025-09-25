import { MINIMAL_AUCTION_PRICE, MINIMAL_DEDUCTION_IN_NAME_CLAIM } from '../constants.js';

/**
 * Calculates the creator incentive from the auction price and registration ID.
 *
 * @param {bigint} auctionPrice - The final auction price in satoshis.
 * @param {bigint} registrationId - The registration ID (should be between 0 and 100,000).
 * @returns {bigint} The calculated creator incentive in satoshis.
 */
export const getCreatorIncentive = (auctionPrice: bigint, registrationId: bigint): bigint =>
{
	const minimalDeduction = auctionPrice - MINIMAL_DEDUCTION_IN_NAME_CLAIM;
	const creatorIncentive = (minimalDeduction * (BigInt(1e5) - registrationId) / BigInt(1e5));

	return creatorIncentive;
};

/**
 * Calculates the current auction price based on registration ID and minimum starting bid.
 *
 * The auction price decays linearly with registrationId, with a minimum enforced value of 20,000 satoshis.
 * The formula is:
 *   currentAuctionPrice = ((minStartingBid * 1,000,000) - (minStartingBid * registrationId * 3)) / 1,000,000
 * The result is floored at 20,000 satoshis.
 *
 * @param {bigint} registrationId - The registration ID (should be a non-negative integer).
 * @param {bigint} minStartingBid - The minimum starting bid in satoshis.
 * @returns {bigint} The current auction price in satoshis.
 */
export const getAuctionPrice = (registrationId: bigint, minStartingBid: bigint): bigint =>
{
	const decayPoints = minStartingBid * registrationId * 3n;
	const currentPricePoints = minStartingBid * 1_000_000n;
	const currentAuctionPrice = (currentPricePoints - decayPoints) / 1_000_000n;

	return currentAuctionPrice > MINIMAL_AUCTION_PRICE ? currentAuctionPrice : MINIMAL_AUCTION_PRICE;
};

/**
 * Calculates the minimum required bid amount for an auction.
 *
 * The minimum bid must be at least the current auction price plus a percentage increase.
 * The formula is:
 *   minimumBid = price * (1 + minBidIncreasePercentage / 100)
 *
 * @param {bigint} price - The current auction price in satoshis.
 * @param {bigint} minBidIncreasePercentage - The minimum required increase as a percentage (e.g., 5n for 5%).
 * @returns {bigint} The minimum allowed bid amount in satoshis.
 */
export const getMinimumBidAmount = (price: bigint, minBidIncreasePercentage: bigint): bigint =>
{
	return price * (1n + minBidIncreasePercentage / 100n);
};
