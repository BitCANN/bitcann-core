import { binToHex, hexToBin, decodeTransaction } from '@bitauth/libauth';
import { fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import type { GetPastAuctionsParams, PastAuctionResponse } from '../interfaces/index.js';

/**
 * Retrieves the transaction history of auctions.
 *
 * @returns {Promise<PastAuctionResponse[]>} A promise that resolves to an array of transaction history objects,
 * each containing a transaction hex and an auction name.
 */
export const getPastAuctions = async ({
	category,
	electrumClient,
	domainContract,
}: GetPastAuctionsParams): Promise<PastAuctionResponse[]> =>
{
	// @ts-ignore
	const history = await fetchHistory(electrumClient, domainContract.address);

	const validTransactions = await Promise.all(history.map(async (txn) =>
	{
		let tx = await fetchTransaction(electrumClient, txn.tx_hash);
		let decodedTx = decodeTransaction(hexToBin(tx));

		if(typeof decodedTx === 'string')
		{
			return null;
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
			return null;
		}

		const nameHex = binToHex(decodedTx.outputs[5].token!.nft!.commitment).slice(16);
		const name = Buffer.from(nameHex, 'hex').toString('utf8');

		let auctionInputTx = await fetchTransaction(electrumClient, binToHex(decodedTx.inputs[3].outpointTransactionHash));

		let decodedAuctionInputTx = decodeTransaction(hexToBin(auctionInputTx));

		if(typeof decodedAuctionInputTx === 'string')
		{
			return null;
		}

		let finalAmount = 0;

		// if output 4 has op_return then the previous transaction was auction transaction, else it was a bid transaction
		if(decodedAuctionInputTx.outputs[4].valueSatoshis == BigInt(0))
		{
			// auction transaction
			finalAmount = Number(decodedAuctionInputTx.outputs[3].valueSatoshis);
		}
		else
		{
			// bid transaction
			finalAmount = Number(decodedAuctionInputTx.outputs[2].valueSatoshis);
		}

		return {
			transactionHex: tx,
			name,
			finalAmount,
			txid: txn.tx_hash,
			height: txn.height,
		};
	}));

	return validTransactions.filter(tx => tx !== null) as PastAuctionResponse[];
};