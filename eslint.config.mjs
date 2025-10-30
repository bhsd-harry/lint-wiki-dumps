import {jsDoc, node, extend} from '@bhsd/code-standard';

export default extend(
	jsDoc,
	...node,
	{
		ignores: [
			'*.js',
			'results/*.json',
			'reports/',
		],
	},
);
