import { jest } from '@jest/globals';

// jest.setup.ts
beforeAll(() =>
{
	// Store the original console.log
	const originalConsoleLog = console.log;

	// Create a spy that calls the original console.log
	jest.spyOn(console, 'log').mockImplementation((...args) =>
	{
		originalConsoleLog(...args);
	});
});

afterAll(() =>
{
	if(typeof (console.log as any).mockRestore === 'function')
	{
		(console.log as any).mockRestore();
	}
});