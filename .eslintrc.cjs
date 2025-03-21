const config = require('@bhsd/common/eslintrc.node.cjs');

module.exports = {
	...config,
	ignorePatterns: [
		...config.ignorePatterns,
		'*.json',
	],
};
