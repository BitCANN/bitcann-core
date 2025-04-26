export default {
	transform: {},
	reporters: [ 'default', 'jest-junit' ],
	testResultsProcessor: 'jest-junit',
	collectCoverageFrom: [
		'lib/**',
		'!lib/interfaces/**',
	],
	coverageReporters: [ 'text', 'lcov' ],
	projects: [
		{
			displayName: 'unit',
			testMatch: [ '<rootDir>/build/test/**/*.(spec|test).js' ],
			testPathIgnorePatterns: [ '/test/e2e/' ],
		},
		{
			displayName: 'e2e',
			testMatch: [ '<rootDir>/build/test/e2e/**/*.(spec|test).js' ],
		},
	],

	// some library tests are very slow so we need more than the default 5 seconds
	testTimeout: 12000,

	// There is a problem with jest and serialization of bigint.
	// When tests pass, the problem does not appear.
	// When a test fails and tries to transmit error data *that includes a bigint* to
	// the parent process, then the serialization fails and the test reports a useless
	// serialization error instead of the details of the test failure.
	// By setting this to 1, the tests run in a single process, avoiding the problem.
	// However, if there are any slow tests, that can lead to extremely slow
	// overall execution. Currently, there are no slow tests, so we leave this at 1
	// to avoid error reporting problems.
	maxWorkers: 1,
};
