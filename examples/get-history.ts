import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const history = await bitcannManager.getPastAuctions();

	console.log(history);
})();
