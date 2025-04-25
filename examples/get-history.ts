import {
	bitcannManager,
} from './common/setup.js';


(async () =>
{
	const history = await bitcannManager.getHistory();

	console.log(history);
})();
