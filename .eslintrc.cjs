'use strict';

const config = require('@bhsd/common/eslintrc.node.cjs'),
	{env, plugins, extends: ex, rules, settings} = require('@bhsd/common/eslintrc.dist.cjs');

module.exports = {
	...config,
	ignorePatterns: [
		...config.ignorePatterns,
		'results/*.json',
	],
	overrides: [
		...config.overrides,
		{
			files: 'gh-page/*.js',
			env,
			plugins,
			extends: ex,
			rules,
			settings,
		},
	],
};
