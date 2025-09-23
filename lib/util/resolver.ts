import { fetchTransaction, fetchHistory, fetchUnspentTransactionOutputs } from '@electrum-cash/protocol';
import type { LookupAddressCoreParams, LookupAddressCoreResponse, ResolveNameByChainGraphParams, ResolveNameByElectrumParams, ResolveNameCoreParams } from '../interfaces/resolver.js';
import { constructNameContract } from './index.js';
import { binToHex, decodeTransaction, hexToBin } from '@bitauth/libauth';
import { ChaingraphClient, graphql } from 'chaingraph-ts';
import { lockScriptToAddress, scriptToScripthash } from './address.js';
import { chaingraphURL } from '../config.js';


export const resolveNameByChainGraph = async ({ token, chaingraphUrl, electrumClient }: ResolveNameByChainGraphParams): Promise<string> =>
{
	const queryReq = graphql(`query SearchNameOwner(
    $tokenId: bytea,
    $commitment: bytea
  ){
    output(where: {token_category: {_eq: $tokenId}, nonfungible_token_commitment: {_eq: $commitment} }) {
    transaction_hash
    transaction {
      block_inclusions {
        block {
          height
        }
      }
    }
  }
  }`);

	const category = binToHex(token.category);
	const commitment = binToHex(token.nft.commitment);

	const chaingraphClient = new ChaingraphClient(chaingraphUrl);
	const resultQuery = await chaingraphClient.query(queryReq, {
		tokenId: `\\x${category}`,
		commitment: `\\x${commitment}`,
	});

	if(!resultQuery.data)
	{
		throw new Error('No data returned from Chaingraph query');
	}

	const transactions = resultQuery.data.output.map((output: any) => ({
		height: output.transaction.block_inclusions.length > 0 ? output.transaction.block_inclusions[0].block.height : null,
		txHash: output.transaction_hash.replace(/^\\x/, ''),
	}));

	// Filter transactions to keep only those with block_inclusions length of 0
	let filteredTransaction = transactions.filter(output => output.height === null);
	// If the filteredTransaction has a length then it means that the NFT is currently in the mempool.
	// Go through all the transactions that are filtered here and fine the one that currently ownes the NFT.

	// If no such transactions exist, keep only the one with the highest block height
	// That means the NFT exists with the recipient of the address in that transaction.
	if(filteredTransaction.length === 0)
	{
		const maxHeight = Math.max(...transactions.map(output => parseInt(output.height || '0', 10)));
		filteredTransaction = transactions.filter(output => parseInt(output.height || '0', 10) === maxHeight);
	}

	let ownerLockingBytecode;

	const potentialOwners = new Set();

	for(const tx of filteredTransaction)
	{
		// @ts-ignore
		const t = await fetchTransaction(electrumClient, tx.txHash);
		const decodedTx = decodeTransaction(hexToBin(t));
		// @ts-ignore
		for(const output of decodedTx.outputs)
		{
			if(output.token
        // @ts-ignore
        && output.token.amount === token.amount
        // @ts-ignore
        && binToHex(output.token.category) === binToHex(token.category)
        // @ts-ignore
        && output.token.nft.capability === token.nft.capability
        // @ts-ignore
        && binToHex(output.token.nft.commitment) === binToHex(token.nft.commitment))
			{
				potentialOwners.add(binToHex(output.lockingBytecode));
			}
		}
	}

	const promises = Array.from(potentialOwners).map(async (owner) =>
	{
		const ownerAddress = await lockScriptToAddress(owner as string);
		const utxos = await fetchUnspentTransactionOutputs(electrumClient, ownerAddress, false, true);

		const matchingUtxo = utxos.find(utxo =>
			utxo.token_data
			// @ts-ignore
		&& utxo.token_data.category === binToHex(token.category)
			// @ts-ignore
		&& utxo.token_data.nft
			// @ts-ignore
		&& utxo.token_data.nft.commitment === binToHex(token.nft.commitment),
		);

		if(matchingUtxo)
		{
			ownerLockingBytecode = owner;
		}
	});
	await Promise.all(promises);

	if(!ownerLockingBytecode)
	{
		throw new Error('No owner found');
	}

	const ownerAddress = await lockScriptToAddress(ownerLockingBytecode);

	return ownerAddress;
};

// // Name to address
// // Returns the bitcoin cash address for the given name.
export const resolveNameByElectrum = async ({ baseHeight, token, ownerLockingBytecode, electrumClient }: ResolveNameByElectrumParams): Promise<string> =>
{

	let lookingForNewOwner = true;
	while(lookingForNewOwner)
	{
		let foundTransferTxn = false;
		// @ts-ignore
		const scriptHash = await scriptToScripthash(ownerLockingBytecode);
		const scriptHashHistory = await electrumClient.request('blockchain.scripthash.get_history', scriptHash);

		// Capture the current value of baseHeight
		const currentBaseHeight = baseHeight;
		const filteredScriptHashHistory = scriptHashHistory.filter((entry: any) => entry.height > currentBaseHeight).reverse();

		if(filteredScriptHashHistory.length === 0)
		{
			lookingForNewOwner = false;
		}

		for(const txn of filteredScriptHashHistory)
		{
			const tx = await fetchTransaction(electrumClient, txn.tx_hash);
			const decodedTx = decodeTransaction(hexToBin(tx));
			if(decodedTx === null || typeof decodedTx === 'string')
			{
				throw new Error('No valid base transaction found');
			}
			// @ts-ignore
			for(const output of decodedTx.outputs)
			{
				if(
					output.token
					// @ts-ignore
					&& output.token.amount === token.amount
					// @ts-ignore
					&& binToHex(output.token.category) === binToHex(token.category)
					// @ts-ignore
					&& output.token.nft.capability === token.nft.capability
					// @ts-ignore
					&& binToHex(output.token.nft.commitment) === binToHex(token.nft.commitment)
					// @ts-ignore
					&& binToHex(output.lockingBytecode) !== binToHex(ownerLockingBytecode)
				)
				{
					// Assign the value of owner to the new owner.
					ownerLockingBytecode = output.lockingBytecode;
					// Set the height of the base transaction.
					baseHeight = txn.height;
					// Set this variable to true to break out of the loop. [Outputs]
					foundTransferTxn = true;
					break;
				}
			}

			// If the transfer transaction is found then break out of the loop. [scriptHashHistory]
			if(foundTransferTxn)
			{
				break;
			}

			lookingForNewOwner = false;
		}
	}

	// If not transaction then the owner still has the NFT.
	// Go through the history and check the inputs for the spending of that token above.
	// If it's found then check the output and repeat the process untill it's not spent.
	// The last output is the owner.

	const ownerAddress = await lockScriptToAddress(binToHex(ownerLockingBytecode));

	return ownerAddress;
};

export const resolveNameCore = async (
	{
		name,
		category,
		tld,
		options,
		electrumClient,
		useElectrum,
		useChaingraph,
		chaingraphUrl,
	}: ResolveNameCoreParams,
): Promise<any> =>
{
	if(useElectrum && useChaingraph || !useElectrum && !useChaingraph)
	{
		throw new Error('Either useElectrum or useChaingraph must be true');
	}

	const nameContract = constructNameContract({
		name,
		category,
		tld,
		options,
	});

	const [ history, utxos ] = await Promise.all([
		fetchHistory(electrumClient, nameContract.address),
		fetchUnspentTransactionOutputs(electrumClient, nameContract.address, false, true),
	]);

	const filteredUtxos = utxos
	// @ts-ignore
		.filter((utxo) => utxo.token_data.category === category && utxo.token_data.nft?.commitment !== '');

	if(filteredUtxos.length === 0)
	{
		throw new Error('No UTXOs found for the name');
	}

	const validUtxo = filteredUtxos.reduce((prev, current) =>
	{
		// @ts-ignore
		const prevCommitment = parseInt(prev.token_data.nft!.commitment, 16);
		// @ts-ignore
		const currentCommitment = parseInt(current.token_data.nft!.commitment, 16);

		return currentCommitment < prevCommitment ? current : prev;
	});

	// @ts-ignore
	const validRegistrationId = validUtxo.token_data.nft.commitment;

	let baseTransaction = null;
	let baseHeight = 0;

	for(const txn of history)
	{
		const tx = await fetchTransaction(electrumClient, txn.tx_hash);
		const decodedTx = decodeTransaction(hexToBin(tx));

		if(typeof decodedTx === 'string')
		{
			continue;
		}

		if(decodedTx.inputs.length !== 5
				|| decodedTx.outputs.length !== 8
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

		const registrationId = binToHex(decodedTx.outputs[5].token!.nft!.commitment).slice(0, 16);

		if(registrationId == validRegistrationId)
		{
			baseTransaction = decodedTx;
			baseHeight = txn.height;
			break;
		}
	}

	if(baseTransaction === null || typeof baseTransaction === 'string')
	{
		throw new Error('Name has not been auctioned yet');
	}

	if(useChaingraph)
	{
		return resolveNameByChainGraph({ token: baseTransaction.outputs[5].token, chaingraphUrl: chaingraphUrl || chaingraphURL, electrumClient });
	}

	let ownerLockingBytecode = baseTransaction.outputs[5].lockingBytecode;

	return resolveNameByElectrum({ baseHeight, token: baseTransaction.outputs[5].token, ownerLockingBytecode, electrumClient });
};


/**
 * Retrieves all names associated with a given Bitcoin Cash address.
 *
 * This function queries the blockchain to find all UTXOs linked to the specified address
 * and filters them to extract the names owned by the address.
 *
 * @param {LookupAddressRequest} params - The parameters for the lookup operation.
 * @returns {Promise<LookupAddressResponse>} A promise that resolves to an object containing an array of names owned by the address.
 */
export const lookupAddressCore = async ({
	address,
	category,
	networkProvider,
}: LookupAddressCoreParams): Promise<LookupAddressCoreResponse> =>
{
	// Look for all the UTXOs for the given address and filter the names.
	const utxos = await networkProvider.getUtxos(address);

	const filteredUtxos = utxos.filter((utxo) => utxo.token?.category === category);

	const names = filteredUtxos.map((utxo) =>
	{
		const nameHex = utxo.token!.nft!.commitment.slice(16);

		return Buffer.from(nameHex, 'hex').toString('utf8');
	});

	return { names };
};