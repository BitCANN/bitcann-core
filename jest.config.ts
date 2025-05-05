import type { Config } from 'jest';

const config: Config = {
	verbose: true,
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	transform: {
		'^.+\\.(ts|tsx)$': [ 'ts-jest', { useESM: true }],
	},
	extensionsToTreatAsEsm: [ '.ts' ],
	moduleFileExtensions: [ 'ts', 'tsx', 'js', 'jsx', 'json', 'node' ],
	roots: [ '<rootDir>/lib', '<rootDir>/test' ],
	transformIgnorePatterns: [
		'node_modules/(?!(@bitauth/libauth|@electrum-cash|cashscript)/)',
	],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	silent: false,
	setupFilesAfterEnv: [ '<rootDir>/jest.setup.ts' ],
};

export default config;