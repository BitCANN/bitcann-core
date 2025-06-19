import {
	bitcannManager,
} from './common/setup.js';
import { parseRecords } from '../lib/util/parser.js';
import { binToHex, hexToBin, instantiateSha256 } from '@bitauth/libauth';

(async () =>
{
	const name = 'satoshi';
	const records = await bitcannManager.getRecords({ name });
	console.log(records);


	const sha256 = await instantiateSha256();

	const testRecords = [
		'bio.name=Vikram Sarabhai',
		'bio.email.0=a@example.com',
		'bio.email.1=b@example.com',
		'bio.email.meta=type:array',
		'bio.description.0=Founder of ISRO.',
		'bio.description.1=Spearheaded India’s space program.',
		'bio.description.meta=type:text',
		'social.twitter=handle',
		'social.github=vikram123',
		'crypto.BCH.address=bitcoincash:qpm2qsznhks23z7629mms6s4cwef74abcdabdaabdc',
		`revoked=${binToHex(sha256.hash(hexToBin('bio.email.1=b@example.com')))}`,
		`revoked=${binToHex(sha256.hash(hexToBin('social.github=vikram123')))}`,
		`revoked=${binToHex(sha256.hash(hexToBin('bio.description.meta=type:text')))}`,
		'bio.name=Vikram Sarabhai',
		'bio.avatar=https://example.com/vikram.jpg',
		'bio.email=vikram@example.com',
		'bio.description.0=Founder of the Indian Space Research Organisation (ISRO).',
		'bio.description.1=Spearheaded India’s entry into the space age with the first satellite launch.',
		'bio.description.meta=type:text',
		`revoked=${binToHex(sha256.hash(hexToBin('bio.description.meta=type:text')))}`,
		`revoked=${binToHex(sha256.hash(hexToBin('bio.description.1=Spearheaded India’s entry into the space age with the first satellite launch.')))}`,
		'social.twitter=handle',
		'social.telegram=handle',
		'crypto.BCH.rpa=paycode:qygqyhh8kyxvda2rtatyh9dm0acvs89fgyhrpgplq0y6ac782cxhzaadq2l5tn8scc42kne6z6zfdx5t56ljkqsv9rg7thy0ffc42cdemyk82qqqqqqqq8cxkz4r',
		'crypto.BCH.address=bitcoincash:qpm2qsznhks23z7629mms6s4cwef74abcdabdaabdc',
		'crypto.USDT.version.ERC20.address=0xabcdef1234567890abcdef1234567890abcdef12',
		'token.EVM.ETH.address=0xabcdef1234567890abcdef1234567890abcdef12',
		'dns.a=192.168.1.1',
		'dns.aaaa=2606:2800:220:1:248:1893:25c8:194',
		'contract.fingerprint=0x1234567890abcdef1234567890abcdef12345678',
		'contract.params=1465077837 4 -789332029 e4',
	];


	const parsed = await parseRecords(testRecords);
	console.log(JSON.stringify(parsed, null, 2));
})();

