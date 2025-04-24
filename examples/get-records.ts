import {
	bitcannManager,
} from './common/setup.js';

(async () =>
{
	const name = 'test';
	const records = await bitcannManager.getRecords(name);
	console.log(records);
})();
