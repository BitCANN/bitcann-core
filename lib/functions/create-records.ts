import { TransactionBuilder } from 'cashscript';
import { InternalAuthNFTUTXONotFoundError, UserFundingUTXONotFoundError, UserOwnershipNFTUTXONotFoundError } from '../errors.js';
import {
	adjustLastOutputForFee,
	convertCashAddressToTokenAddress,
	createPlaceholderUnlocker,
	findFundingUTXO,
	findInternalAuthNFTUTXO,
	findOwnershipNFTUTXO,
} from '../util/index.js';
import { CreateRecordsCoreParams, FetchRecordsUtxosParams, FetchRecordsUtxosResponse } from '../interfaces/index.js';

/**
 * Fetches the UTXOs required for creating records.
 *
 * @param {FetchRecordsUtxosParams} params - The parameters for fetching UTXOs.
 * @returns {Promise<FetchRecordsUtxosResponse>} A promise that resolves to the fetched UTXOs.
 * @throws {InternalAuthNFTUTXONotFoundError} If the internal authorization NFT UTXO is not found.
 * @throws {UserOwnershipNFTUTXONotFoundError} If the user ownership NFT UTXO is not found.
 * @throws {UserFundingUTXONotFoundError} If the user funding UTXO is not found.
 */
export const fetchRecordsUtxos = async ({
	name,
	category,
	domainContract,
	address,
	networkProvider,
}: FetchRecordsUtxosParams): Promise<FetchRecordsUtxosResponse> =>
{
	const [ domainUTXOs, userUtxos ] = await Promise.all([
		networkProvider.getUtxos(domainContract.address),
		networkProvider.getUtxos(address),
	]);

	const internalAuthNFTUTXO = findInternalAuthNFTUTXO(domainUTXOs, category);
	if(!internalAuthNFTUTXO)
	{
		throw new InternalAuthNFTUTXONotFoundError();
	}

	const ownershipNFTUTXO = findOwnershipNFTUTXO(userUtxos, category, name);
	if(!ownershipNFTUTXO)
	{
		throw new UserOwnershipNFTUTXONotFoundError();
	}

	const fundingUTXO = findFundingUTXO(userUtxos);
	if(!fundingUTXO)
	{
		throw new UserFundingUTXONotFoundError();
	}

	return {
		internalAuthNFTUTXO,
		ownershipNFTUTXO,
		fundingUTXO,
	};
};

/**
 * Creates a transaction for adding a record to a domain.
 *
 * @param {CreateRecordsCoreParams} params - The parameters for creating the record transaction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
 */
export const createRecordsTransaction = async ({
	address,
	domainContract,
	networkProvider,
	records,
	utxos,
}: CreateRecordsCoreParams): Promise<TransactionBuilder> =>
{
	const { internalAuthNFTUTXO, ownershipNFTUTXO, fundingUTXO } = utxos;

	const placeholderUnlocker = createPlaceholderUnlocker(address);

	const transaction = await new TransactionBuilder({ provider: networkProvider })
		.addInput(internalAuthNFTUTXO, domainContract.unlock.useAuth(BigInt(1)))
		.addInput(ownershipNFTUTXO, placeholderUnlocker)
		.addInput(fundingUTXO, placeholderUnlocker)
		.addOutput({
			to: domainContract.tokenAddress,
			amount: internalAuthNFTUTXO.satoshis,
			token: {
				category: internalAuthNFTUTXO.token!.category,
				amount: internalAuthNFTUTXO.token!.amount,
				nft: {
					capability: internalAuthNFTUTXO.token!.nft!.capability,
					commitment: internalAuthNFTUTXO.token!.nft!.commitment,
				},
			},
		})
		.addOutput({
			to: convertCashAddressToTokenAddress(address),
			amount: ownershipNFTUTXO.satoshis,
			token: {
				category: ownershipNFTUTXO.token!.category,
				amount: ownershipNFTUTXO.token!.amount,
				nft: {
					capability: ownershipNFTUTXO.token!.nft!.capability,
					commitment: ownershipNFTUTXO.token!.nft!.commitment,
				},
			},
		});

	for(const record of records)
	{
		transaction.addOpReturnOutput([ record ]);
	}

	transaction.addOutput({
		to: address,
		amount: fundingUTXO.satoshis,
	});

	return adjustLastOutputForFee(transaction, fundingUTXO);
};