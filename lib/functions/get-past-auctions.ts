import { binToHex, hexToBin, decodeTransaction } from '@bitauth/libauth';
import { fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import type { GetPastAuctionsParams, PastAuctionResult } from '../interfaces/index.js';

/**
	 * Retrieves the transaction history of auctions.
	 *
	 * @returns {Promise<PastAuctionResult[]>} A promise that resolves to an array of transaction history objects,
   * each containing a transaction hex and an auction name.
	 */
export const getPastAuctions = async ({
	category,
	electrumClient,
	domainContract,
}: GetPastAuctionsParams): Promise<PastAuctionResult[]> =>
{
	// @ts-ignore
	const history = await fetchHistory(electrumClient, domainContract.address);

	const validTransactions = [];

	for(const txn of history)
	{
		let tx = await fetchTransaction(electrumClient, txn.tx_hash);
		let decodedTx = decodeTransaction(hexToBin(tx));

		if(typeof decodedTx === 'string')
		{
			continue;
		}

		if(decodedTx.inputs.length !== 4
				|| decodedTx.outputs.length !== 7
				|| !decodedTx.outputs[0].token?.category || binToHex(decodedTx.outputs[0].token.category) !== category
				|| !decodedTx.outputs[2].token?.category || binToHex(decodedTx.outputs[2].token.category) !== category
				|| !decodedTx.outputs[3].token?.category || binToHex(decodedTx.outputs[3].token.category) !== category
				|| !decodedTx.outputs[4].token?.category || binToHex(decodedTx.outputs[4].token.category) !== category
				|| !decodedTx.outputs[5].token?.category || binToHex(decodedTx.outputs[5].token.category) !== category
				|| decodedTx.outputs[2].token?.nft?.capability != 'minting'
		)
		{
			continue;
		}

		const nameHex = binToHex(decodedTx.outputs[5].token!.nft!.commitment).slice(16);
		const name = Buffer.from(nameHex, 'hex').toString('utf8');

		validTransactions.push({
			transactionHex: tx,
			name,
		});
	}

	return validTransactions;
};