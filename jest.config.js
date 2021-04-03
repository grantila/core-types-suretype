module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	coverageReporters: [ 'lcov', 'text', 'html' ],
	collectCoverageFrom: [ '<rootDir>/lib/**' ],
	coveragePathIgnorePatterns: [
		'/node_modules/',
		'/__snapshots__/',
		'/read-exports/',
		'/test/',
	],
};
