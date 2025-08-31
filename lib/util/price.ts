
/**
 * Calculates the creator incentive from the auction price and registration ID.
 *
 * The creator incentive is determined by first deducting a fixed amount (5000) from the auction price,
 * then multiplying the result by (100,000 - registrationId) and dividing by 100,000.
 *
 * @param {bigint} auctionPrice - The final auction price in satoshis.
 * @param {bigint} registrationId - The registration ID (should be between 0 and 100,000).
 * @returns {bigint} The calculated creator incentive in satoshis.
 */
export const getCreatorIncentive = (auctionPrice: bigint, registrationId: bigint): bigint =>
{
	const minimalDeduction = auctionPrice - 5000n;
	const creatorIncentive = (minimalDeduction * (100_000n - registrationId)) / 100_000n;
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
	return currentAuctionPrice > 6000n ? currentAuctionPrice : 6000n;
	// TODO: make this 20_000n
	// return currentAuctionPrice > 20_000n ? currentAuctionPrice : 20_000n;
};