'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs');

module.exports = {
	...config,
	ignorePatterns: [
		'/*.js',
		'results/*.json',
	],
};
