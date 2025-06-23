'use strict';

const config = require('@bhsd/code-standard/eslintrc.node.cjs');

module.exports = {
	...config,
	ignorePatterns: [
		'/*.js',
		'results/*.json',
		'build/',
	],
};
