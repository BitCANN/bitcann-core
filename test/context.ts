import type { ElectrumClient } from '@electrum-cash/network';
import type { ElectrumProtocolEvents } from '@electrum-cash/protocol';
import { initializeElectrumClient } from '@electrum-cash/protocol';

let electrumClient: any;

export const getElectrum = async (): Promise<ElectrumClient<ElectrumProtocolEvents>> =>
{
	if(!electrumClient)
	{
		electrumClient = await initializeElectrumClient('bitcann tests', 'bch.imaginary.cash');
	}

	return electrumClient;
};

export const disconnectElectrum = async (): Promise<void> =>
{
	if(electrumClient)
	{
		await electrumClient.disconnect();
	}
};
