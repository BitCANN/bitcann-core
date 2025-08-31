import type { GetAuctionsParams, GetAuctionsResponse } from '../interfaces/index.js';
import { fetchTransaction, fetchTransactionBlockHeight } from '@electrum-cash/protocol';
import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth';
import { convertPkhToLockingBytecode, lockScriptToAddress } from '../util/address.js';

/**
 * Retrieves all active auctions.
 *
 * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
 */
export const getAuctions = async ({
	category,
	networkProvider,
	contracts,
	electrumClient,
}: GetAuctionsParams): Promise<GetAuctionsResponse[]> =>
{
	const registryUtxos = await networkProvider.getUtxos(contracts.Registry.address);
	const filteredUtxos = registryUtxos.filter((utxo) => utxo.token?.category === category && utxo.token?.nft?.capability === 'mutable');

	const auctionDetails = await Promise.all(filteredUtxos.map(async (utxo) =>
	{
		let [ auctionHex, auctionHeight ] = await Promise.all([
			fetchTransaction(electrumClient, utxo.txid),
			fetchTransactionBlockHeight(electrumClient, utxo.txid),
		]);

		let decodedTx = decodeTransaction(hexToBin(auctionHex));
		if(typeof decodedTx === 'string')
		{
			return null;
		}

		let initialAmount, previousTxHash, previousHeight, currentAmount;
		// if output 4 has op_return then the previous transaction was auction transaction, else it was a bid transaction
		if(decodedTx.outputs[2].token?.nft?.capability == 'minting' && decodedTx.outputs[3].token?.nft?.capability == 'mutable')
		{
			// auction transaction, this means
			initialAmount = Number(decodedTx.outputs[3].valueSatoshis);
			currentAmount = initialAmount;
			previousTxHash = utxo.txid;
			previousHeight = auctionHeight;
		}
		else
		{
			currentAmount = Number(decodedTx.outputs[2].valueSatoshis);

			let previousDecodedTx: any = decodedTx;
			while(previousDecodedTx != null)
			{
				const previousHash = binToHex(previousDecodedTx.inputs[2].outpointTransactionHash);
				const previousTx = await fetchTransaction(electrumClient, previousHash);
				previousDecodedTx = decodeTransaction(hexToBin(previousTx));

				if(typeof previousDecodedTx === 'string')
				{
					previousDecodedTx = null;
				}

				if(decodedTx.outputs[2].token?.nft?.capability == 'minting' && decodedTx.outputs[3].token?.nft?.capability == 'mutable')
				{
					initialAmount = Number(previousDecodedTx.outputs[3].valueSatoshis);
					const height = await fetchTransactionBlockHeight(electrumClient, previousHash);
					previousTxHash = previousHash;
					previousHeight = height;

					previousDecodedTx = null;
				}
			}
		}

		const previousBidderHex = utxo.token!.nft!.commitment.slice(0, 40);
		const previousBidder = convertPkhToLockingBytecode(previousBidderHex);
		const previousBidderAddress = lockScriptToAddress(binToHex(previousBidder));

		const nameHex = utxo.token!.nft!.commitment.slice(40);
		const name = Buffer.from(nameHex, 'hex').toString('utf8');

		return {
			name,
			previousTxHash,
			previousHeight,
			initialAmount,
			currentAmount,
			previousBidder: previousBidderAddress,
			utxo,
		};
	}));


	return auctionDetails.filter(detail => detail !== null) as GetAuctionsResponse[];
};
