import fs from 'fs';
import path from 'path';
import type {LintError as LintErrorBase} from 'wikilint';

declare interface Fix extends LintErrorBase.Fix {
	original: string;
}
export interface LintError extends Omit<LintErrorBase, 'severity'> {
	excerpt: string;
	fix?: Fix;
	sugggestions?: Fix[];
}

export const MAX = 100;

const files = new Map<string, string | undefined>(),
	resultDir = path.join(__dirname, 'results');

const getFile = (site: string): string | undefined => {
	if (files.has(site)) {
		return files.get(site)!;
	}
	const filePath = path.join(resultDir, `${site}.json`);
	if (!fs.existsSync(filePath)) {
		files.set(site, undefined);
		return undefined;
	}
	const file = fs.readFileSync(filePath, 'utf8');
	files.set(site, file);
	return file;
};

export const getTimestamp = (site: string): string | undefined => {
	const file = getFile(site);
	if (!file) {
		return undefined;
	}
	const i = file.indexOf('"#timestamp": "') + 15;
	return file.slice(i, file.indexOf('"', i));
};

export const getErrors = (site: string, page: string): LintError[] | undefined => {
	const file = getFile(site);
	if (!file) {
		return undefined;
	}
	const str = JSON.stringify(page),
		i = file.indexOf(`${str}: [`);
	if (i === -1) {
		return undefined;
	}
	const j = i + str.length + 2;
	return JSON.parse(file.slice(j, file.indexOf('\n]', j) + 2));
};
