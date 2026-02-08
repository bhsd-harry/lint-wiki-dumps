import config, {browser} from '@bhsd/code-standard';

export default [
	{
		ignores: ['data/**/*.js'],
	},
	...config,
	browser,
	{
		files: ['**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: './reports/tsconfig.json',
			},
		},
	},
];
