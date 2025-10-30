import config, {browser} from '@bhsd/code-standard';

export default [
	{
		ignores: ['reports/data/**/*.js'],
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
