// Address utilities
export {
	convertAddressToPkh,
	convertPkhToLockingBytecode,
	lockScriptToAddress,
	buildLockScriptP2SH32,
	addressToLockScript,
	convertCashAddressToTokenAddress,
} from './address.js';

// Binary utilities
export {
	intToBytesToHex,
	hexToInt,
	pushDataHex,
	extractOpReturnPayload,
} from './binary.js';

// Name utilities
export {
	validateName,
	findFirstInvalidCharacterIndex,
	convertNameToBinaryAndHex,
} from './name.js';

// UTXO utilities
export {
	getRegistrationUtxo,
	getDomainMintingUtxo,
	getAllRunningAuctionUtxos,
	getRunningAuctionUtxo,
	getThreadUtxo,
	getAuctionUtxo,
	getAuthorizedContractUtxo,
	generateSourceOutputs,
} from './utxo.js';

// Transaction utilities
export {
	findInternalAuthNFTUTXO,
	findOwnershipNFTUTXO,
	findFundingUTXO,
	createPlaceholderUnlocker,
	adjustLastOutputForFee,
	isValidTransaction,
	getValidCandidateTransactions,
	extractRecordsFromTransaction,
	createRegistrationId,
} from './transaction.js';

// Contract utilities
export {
	constructDomainContract,
	getDomainPartialBytecode,
	constructContracts,
} from './contract.js';

// Sign utilities
export {
	GetWalletConnectTransactionParams,
	GetWalletConnectTransactionResponse,
	GetSignedTransactionParams,
	GetSignedTransactionResponse,
	SignTransactionParams,
	SignTransactionResponse,
	getWalletConnectTransaction,
	getSignedTransaction,
	signTransaction,
} from './sign.js';
