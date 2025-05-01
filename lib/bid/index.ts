import { binToHex } from '@bitauth/libauth';
import type { NetworkProvider } from 'cashscript';
import { TransactionBuilder } from 'cashscript';

import { EXPECTED_MAX_TRANSACTION_FEE } from '../constants.js';
import { InvalidBidAmountError, InvalidNameError, UserUTXONotFoundError } from '../errors.js';
import { isValidName } from '../util/name.js';
import { getAuthorizedContractUtxo, getRunningAuctionUtxo, getThreadUtxo } from '../util/utxo-util.js';
import type { BidConfig, BidParams } from './types.js';
import { createPlaceholderUnlocker } from '../util/index.js';
import { convertNameToBinary } from '../util/name.js';



export class BidManager {
    private category: string;
    private minBidIncreasePercentage: number;
    private networkProvider: NetworkProvider;
    private contracts: Record<string, any>;

    constructor(params: BidConfig) {
        this.category = params.category;
        this.minBidIncreasePercentage = params.minBidIncreasePercentage;
        this.networkProvider = params.networkProvider;
        this.contracts = params.contracts;
    }

    public async createBidTransaction({ name, amount, address }: BidParams): Promise<TransactionBuilder> {
        if(!isValidName(name)) {
            throw new InvalidNameError();
        }

        const { nameBin } = convertNameToBinary(name);
        const [ registryUtxos, bidUtxos, userUtxos ] = await Promise.all([
            this.networkProvider.getUtxos(this.contracts.Registry.address),
            this.networkProvider.getUtxos(this.contracts.Bid.address),
            this.networkProvider.getUtxos(address),
        ]);

        const threadNFTUTXO = getThreadUtxo({
            utxos: registryUtxos,
            category: this.category,
            threadContractAddress: this.contracts.Bid.address,
        });

        const authorizedContractUTXO = getAuthorizedContractUtxo({
            utxos: bidUtxos,
        });

        const runningAuctionUTXO = getRunningAuctionUtxo({
            name,
            utxos: registryUtxos,
            category: this.category,
        });

        if(BigInt(amount) < BigInt(Math.ceil(Number(runningAuctionUTXO.satoshis) * (1 + this.minBidIncreasePercentage / 100)))) {
            throw new InvalidBidAmountError();
        }

        const fundingUTXO = userUtxos.find((utxo) => utxo.satoshis >= BigInt(amount + EXPECTED_MAX_TRANSACTION_FEE) && !utxo.token);
        if(!fundingUTXO) {
            throw new UserUTXONotFoundError();
        }

        const prevBidderPKH = runningAuctionUTXO.token?.nft?.commitment.slice(0, 40);
        const prevBidderAddress = binToHex(convertNameToBinary(prevBidderPKH).nameBin);

        const placeholderUnlocker = createPlaceholderUnlocker(address);

        const transaction = new TransactionBuilder({ provider: this.networkProvider })
            .addInput(threadNFTUTXO, this.contracts.Registry.unlock.call())
            .addInput(authorizedContractUTXO, this.contracts.Bid.unlock.call())
            .addInput(runningAuctionUTXO, this.contracts.Registry.unlock.call())
            .addInput(fundingUTXO, placeholderUnlocker)
            .addOutput({
                to: this.contracts.Registry.tokenAddress,
                amount: threadNFTUTXO.satoshis,
                token: {
                    category: threadNFTUTXO.token.category,
                    amount: threadNFTUTXO.token.amount,
                    nft: {
                        capability: threadNFTUTXO.token.nft.capability,
                        commitment: threadNFTUTXO.token.nft.commitment,
                    },
                },
            })
            .addOutput({
                to: this.contracts.Bid.tokenAddress,
                amount: authorizedContractUTXO.satoshis,
            })
            .addOutput({
                to: this.contracts.Registry.tokenAddress,
                amount: BigInt(amount),
                token: {
                    category: runningAuctionUTXO.token.category,
                    amount: runningAuctionUTXO.token.amount,
                    nft: {
                        capability: 'mutable',
                        commitment: binToHex(convertNameToBinary(address).nameBin) + binToHex(nameBin),
                    },
                },
            })
            .addOutput({
                to: prevBidderAddress,
                amount: runningAuctionUTXO.satoshis,
            })
            .addOutput({
                to: address,
                amount: fundingUTXO.satoshis - (BigInt(amount) + BigInt(EXPECTED_MAX_TRANSACTION_FEE)),
            });
        
        const transactionSize = transaction.build().length;
        transaction.outputs[transaction.outputs.length - 1].amount = fundingUTXO.satoshis - (BigInt(amount) + BigInt(transactionSize));

        return transaction;
    }
} 