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
	{
		rules: {
			'no-underscore-dangle': [
				2,
				{
					allow: [
						'_',
						'_preserveAll',
					],
					enforceInMethodNames: true,
					enforceInClassFields: true,
					allowInArrayDestructuring: false,
					allowInObjectDestructuring: false,
					allowFunctionParams: false,
				},
			],
		},
	},
);
