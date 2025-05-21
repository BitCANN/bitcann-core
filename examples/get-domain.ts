import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const domain = await bitcannManager.getDomain('test');

	console.log(domain);
})();
