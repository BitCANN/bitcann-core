import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const name = await bitcannManager.getName('test');

	console.log(name);
})();
