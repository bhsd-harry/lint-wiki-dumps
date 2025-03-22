'use strict';

const config = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	root: true,
	ignorePatterns: ['data/**/*.js'],
};
