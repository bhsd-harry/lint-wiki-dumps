import fs from 'fs';
import path from 'path';
import {createHash} from 'crypto';
import Parser from 'wikilint';
import lintConfig from './wikilintrc';
import type {LintError as LintErrorBase} from 'wikilint';

declare interface Fix extends LintErrorBase.Fix {
	original: string;
}
export interface LintError extends Omit<
	LintErrorBase,
	'severity' | 'code' | 'startIndex' | 'endLine' | 'endCol' | 'endIndex'
> {
	excerpt: string;
	fix?: Fix;
	sugggestions?: Fix[];
}

Parser.lintConfig = lintConfig;
Parser.configPaths.push(path.join(__dirname, 'config'));

export const MAX = 100;

export const lint = ($text: string, page: string, ns?: string): LintError[] => Parser.parse($text, page, ns === '828')
	.lint()
	.filter(({severity}) => severity === 'error')
	.map(({
		severity,

		/* DISABLED */

		suggestions,
		fix,
		code,
		startIndex,
		endLine,
		endCol,
		endIndex,

		/* DISABLED END */

		...e
	}) => ({
		...e,
		excerpt: $text.slice(startIndex, endIndex).slice(0, MAX),
	}));

export const getHash = (lang: string, page: string): string => {
	const hash = createHash('sha256').update(page).digest('hex').slice(0, 8);
	return path.join(lang, 'pages', hash);
};

export const write = (file: string, data: unknown[], timestamp = ''): void => {
	fs.writeFileSync(
		file,
		`globalThis.data=${JSON.stringify(data)}${timestamp && `;data.timestamp="${timestamp}"`}`,
	);
};

export const getTimestamp = (date: Date): string => date.toISOString().slice(0, 10);
