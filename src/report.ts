import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {mkdir, getResultDir} from './util';
import {MAX, getHash, write, getTimestamp} from './common';
import type {LintError} from './common';

const {argv} = process,
	[,, lang,, temp] = argv,
	resultDir = getResultDir(temp),
	defaultOurDir = path.join(__dirname, 'reports');
let [,,, outDir] = argv;

if (outDir) {
	mkdir(outDir);
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	fs.cpSync(defaultOurDir, outDir, {recursive: true, force: true});
} else {
	outDir = defaultOurDir;
}

const dataDir = path.join(outDir, 'data');
mkdir(dataDir);

const writeJS = (data: unknown[], file: string, timestamp?: string): void => {
	write(path.join(dataDir, `${file}.js`), data, timestamp);
};

const initJS = (file: string): fs.WriteStream => {
	const stream = fs.createWriteStream(`${file}.js`);
	stream.write('globalThis.data={"articles":[');
	return stream;
};

const compare = (a: string, b: string): number => a.localeCompare(b);

const dir = fs.readdirSync(resultDir),
	summary = new Set<string>(),
	ruleRecords = new Map<string, [string, string[]]>(),
	wiki: Partial<Record<string, number>> = {},
	siteDir = path.join(dataDir, lang!),
	articlesDir = path.join(siteDir, 'pages');
let latest: Date | undefined;
mkdir(siteDir, true);
mkdir(articlesDir);
for (const file of dir) {
	if (!file.endsWith('.json')) {
		continue;
	}
	const fileDir = path.join(resultDir, file);
	if (!fs.existsSync(fileDir)) {
		console.error(chalk.red(`Failed to read ${file}`));
		continue;
	}
	const k = file.search(/-(?:p\d+){2}\.json$/u),
		site = (k === -1 ? file.slice(0, -5) : file.slice(0, k))
			.replaceAll('_', '-');
	summary.add(site);
	if (lang !== site) {
		continue;
	}
	const data = fs.readFileSync(fileDir, 'utf8'),
		date = new Date(data.substr(data.indexOf('\n"#timestamp": "') + 16, 10));
	latest = !latest || date > latest ? date : latest;
	for (const mt of data.matchAll(/^(".+"): \[$/gmu)) {
		const page: string = JSON.parse(mt[1]!),
			errors: LintError[] = JSON.parse(
				data.slice(mt.index + mt[0].length - 1, data.indexOf('\n]', mt.index) + 2),
			),
			rules = new Set<string>(),
			info: [string, number, number, string, string][] = [];

		for (const {rule, startLine, startCol, message, excerpt} of errors) {
			// article
			const line = startLine + 1,
				col = startCol + 1;
			info.push([rule, line, col, message, excerpt]);

			// wiki
			if (!(rule in wiki)) {
				wiki[rule] = 0;
			}

			// rule
			if (!rules.has(rule)) {
				rules.add(rule);
				wiki[rule]!++;

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
			}
		}
		writeJS(info, getHash(site, page), getTimestamp(latest));
	}
}
const timestamp = getTimestamp(latest!);

// rule
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
writeJS([...summary].sort(compare), 'index');
writeJS(Object.entries(wiki).sort(([a], [b]) => a.localeCompare(b)), path.join(lang!, 'index'), timestamp);
