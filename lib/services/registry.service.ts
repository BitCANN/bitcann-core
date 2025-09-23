import { binToHex, hexToBin, decodeTransaction } from '@bitauth/libauth';
import { ElectrumProtocolEvents, fetchHistory, fetchTransaction } from '@electrum-cash/protocol';
import type { GetPastAuctionsParams, PastAuctionResponse } from '../interfaces/index.js';
import type { GetAuctionsParams, GetAuctionsResponse } from '../interfaces/index.js';
import { fetchTransactionBlockHeight } from '@electrum-cash/protocol';
import { convertPkhToLockingBytecode, lockScriptToAddress } from '../util/address.js';
import { Contract, NetworkProvider } from 'cashscript';
import { ElectrumClient } from '@electrum-cash/network';


export class RegistryService
{
    /**
     * The network provider.
     */
	networkProvider: NetworkProvider;
    /**
     * The contracts.
     */
    contracts: Record<string, Contract>;
    /**
     * The category.
     */
    category: string;

	constructor(networkProvider: NetworkProvider, contracts: Record<string, Contract>, category: string)
	{
		this.networkProvider = networkProvider;
		this.contracts = contracts;
		this.category = category;
	}


    /**
     * Retrieves the transaction history of auctions.
     *
     * @returns {Promise<PastAuctionResponse[]>} A promise that resolves to an array of transaction history objects,
     * each containing a transaction hex and an auction name.
     */
    getPastAuctions = async ({
    }: GetPastAuctionsParams): Promise<PastAuctionResponse[]> =>
    {
        // @ts-ignore
        const history = await fetchHistory(this.networkProvider.electrum, this.contracts.Factory.address);

        const validTransactions = await Promise.all(history.map(async (txn) =>
        {
            // @ts-ignore
            let tx = await fetchTransaction(this.networkProvider.electrum, txn.tx_hash);
            let decodedTx = decodeTransaction(hexToBin(tx));

            if(typeof decodedTx === 'string')
            {
                return null;
            }

            if(decodedTx.inputs.length !== 4
                    || decodedTx.outputs.length !== 7
                    || !decodedTx.outputs[0].token?.category || binToHex(decodedTx.outputs[0].token.category) !== this.category
                    || !decodedTx.outputs[2].token?.category || binToHex(decodedTx.outputs[2].token.category) !== this.category
                    || !decodedTx.outputs[3].token?.category || binToHex(decodedTx.outputs[3].token.category) !== this.category
                    || !decodedTx.outputs[4].token?.category || binToHex(decodedTx.outputs[4].token.category) !== this.category
                    || !decodedTx.outputs[5].token?.category || binToHex(decodedTx.outputs[5].token.category) !== this.category
                    || decodedTx.outputs[2].token?.nft?.capability != 'minting'
            )
            {
                return null;
            }

            const nameHex = binToHex(decodedTx.outputs[5].token!.nft!.commitment).slice(16);
            const name = Buffer.from(nameHex, 'hex').toString('utf8');
        
            // @ts-ignore
            let auctionInputTx = await fetchTransaction(this.networkProvider.electrum, binToHex(decodedTx.inputs[3].outpointTransactionHash));

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


    /**
     * Retrieves all active auctions.
     *
     * @returns {Promise<Utxo[]>} A promise that resolves to an array of UTXOs representing active auctions.
     */
    getAuctions = async ({
    }: GetAuctionsParams): Promise<GetAuctionsResponse[]> =>
    {
        const registryUtxos = await this.networkProvider.getUtxos(this.contracts.Registry.address);
        const filteredUtxos = registryUtxos.filter((utxo) => utxo.token?.category === this.category && utxo.token?.nft?.capability === 'mutable');

        const auctionDetails = await Promise.all(filteredUtxos.map(async (utxo) =>
        {
            let [ auctionHex, auctionHeight ] = await Promise.all([
                // @ts-ignore
                fetchTransaction(this.networkProvider.electrum, utxo.txid),
                // @ts-ignore
                fetchTransactionBlockHeight(this.networkProvider.electrum, utxo.txid),
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
                    if(previousDecodedTx.inputs.length !== 4 || previousDecodedTx.outputs.length > 5)
                    {
                        previousDecodedTx = null;
                        break;
                    }

                    const previousHash = binToHex(previousDecodedTx.inputs[2].outpointTransactionHash);
                    // @ts-ignore
                    const previousTx = await fetchTransaction(this.networkProvider.electrum, previousHash);
                    previousDecodedTx = decodeTransaction(hexToBin(previousTx));

                    if(typeof previousDecodedTx === 'string')
                    {
                        previousDecodedTx = null;
                    }

                    if(previousDecodedTx.outputs[2].token?.nft?.capability == 'minting' && previousDecodedTx.outputs[3].token?.nft?.capability == 'mutable')
                    {
                        initialAmount = Number(previousDecodedTx.outputs[3].valueSatoshis);
                        // @ts-ignore
                        const height = await fetchTransactionBlockHeight(this.networkProvider.electrum, previousHash);
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

}