import { TransactionBuilder } from 'cashscript';
import { InternalAuthNFTUTXONotFoundError, UserFundingUTXONotFoundError, UserOwnershipNFTUTXONotFoundError } from '../errors.js';
import {
	adjustLastOutputForFee,
	constructDomainContract,
	convertCashAddressToTokenAddress,
	createPlaceholderUnlocker,
	findFundingUTXO,
	findInternalAuthNFTUTXO,
	findOwnershipNFTUTXO,
} from '../util/index.js';
import { CreateRecordsParams } from '../interfaces/index.js';

const fetchRecordsUtxos = async ({ name, category, domainContract, address, networkProvider }: any): Promise<any> =>
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
 * @param {CreateRecordsParams} params - The parameters for creating the record transaction.
 * @returns {Promise<TransactionBuilder>} A promise that resolves to the transaction builder.
 */
export const createRecordsTransaction = async ({ name,
	records,
	address,
	category,
	inactivityExpiryTime,
	options,
	networkProvider,
	utxos }: CreateRecordsParams): Promise<TransactionBuilder> =>
{
	const domainContract = constructDomainContract({
		name: name,
		category: category,
		inactivityExpiryTime: inactivityExpiryTime,
		options: options,
	});

	if(!utxos)
	{
		utxos = await fetchRecordsUtxos({ name, category, inactivityExpiryTime, options, networkProvider });
	}

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