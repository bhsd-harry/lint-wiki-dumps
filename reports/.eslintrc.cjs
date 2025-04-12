/* eslint-env node */
'use strict';

const config = require('@bhsd/common/eslintrc.browser.cjs'),
	{overrides: [, ts]} = config;

module.exports = {
	...config,
	root: true,
	ignorePatterns: [
		'dist/*.js',
		'data/**/*.js',
	],
	overrides: [
		{
			...ts,
			parserOptions: {
				ecmaVersion: 'latest',
				project: './reports/tsconfig.json',
			},
		},
	],
};
