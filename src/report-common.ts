import path from 'path';
import fs from 'fs';
import {write, getHash, getTimestamp, MAX} from './common';
import {mkdir} from './util';
import type {LintError} from 'wikilint';

declare type WriteJS = (data: unknown[], file: string, timestamp?: string) => void;

const {argv} = process,
	lang = argv[2]!,
	ruleRecords = new Map<string, [string, string[]]>();

export const wiki: Partial<Record<string, number>> = {};

const [siteDir, writeJS] = ((): [string, WriteJS] => {
	const defaultOutDir = path.join(__dirname, 'reports');
	let [,,, outDir] = argv;
	if (outDir) {
		mkdir(outDir);
		fs.cpSync(defaultOutDir, outDir, {recursive: true, force: true});
	} else {
		outDir = defaultOutDir;
	}
	const dataDir = path.join(outDir, 'data'),
		siteDirInternal = path.join(dataDir, lang),
		writeJSInternal = (data: unknown[], file: string, timestamp?: string): void => {
			write(path.join(dataDir, `${file}.js`), data, timestamp);
		};
	mkdir(dataDir);
	mkdir(siteDirInternal, true);
	mkdir(path.join(siteDirInternal, 'pages'));
	return [siteDirInternal, writeJSInternal];
})();

const initJS = (file: string): fs.WriteStream => {
	const stream = fs.createWriteStream(`${file}.js`);
	stream.write('globalThis.data={"articles":[');
	return stream;
};

const compare = (a: string, b: string): number => a.localeCompare(b);

export const writeSummary = (summary: Iterable<string>): void => {
	writeJS([...summary].sort(compare), 'index');
};

export const writeArticle = (
	info: (readonly [LintError.Rule, number, number, string, string])[],
	page: string,
	timestamp: Date,
): void => {
	writeJS(info, getHash(lang, page), getTimestamp(timestamp));
};

export const updateRuleRecords = (
	rule: string,
	page: string,
	line: number,
	col: number,
	message: string,
	excerpt: string,
): void => {
	let ruleRecord: [string, string[]];
	if (ruleRecords.has(rule)) {
		ruleRecord = ruleRecords.get(rule)!;
	} else {
		ruleRecord = ['', []];
		ruleRecords.set(rule, ruleRecord);
	}
	ruleRecord[1].push(page);
	ruleRecord[0] += `${JSON.stringify(
		[page, line, col, message, excerpt.slice(0, MAX * 0.8)],
		null,
		'\t',
	)},`;
};

export const writeWiki = (date: Date): void => {
	const timestamp = getTimestamp(date);
	for (const [rule, [str, pages]] of ruleRecords) {
		const batches = Math.ceil(pages.length / 200);
		pages.sort(compare);
		for (let i = 0; i < batches; i++) {
			const stream = initJS(path.join(siteDir, `${rule}-${i}`));
			for (let j = i * 200; j < (i + 1) * 200; j++) {
				const page = pages[j];
				if (!page) {
					break;
				}
				const index = str.indexOf(`[\n\t${JSON.stringify(page)}`);
				stream.write(str.slice(index, str.indexOf('\n]', index) + 3));
			}
			stream.write(`],batches:${batches},timestamp:"${timestamp}"}`);
			stream.end();
		}
	}
	writeJS(Object.entries(wiki).sort(([a], [b]) => a.localeCompare(b)), path.join(lang, 'index'), timestamp);
};
