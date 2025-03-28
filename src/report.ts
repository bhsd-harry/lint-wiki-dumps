import fs from 'fs';
import path from 'path';
import {createHash} from 'crypto';
import chalk from 'chalk';
import {MAX} from './util';
import type {LintError} from './util';

const [,, lang] = process.argv;

const mkdir = (dir: string, empty?: boolean): void => {
	if (fs.existsSync(dir)) {
		if (!empty) {
			return;
		}
		fs.rmSync(dir, {recursive: true});
	}
	fs.mkdirSync(dir);
};

const dataDir = path.join(__dirname, 'reports', 'data');
mkdir(dataDir);

const writeJS = (data: unknown[], file: string): void => {
	fs.writeFileSync(path.join(dataDir, `${file}.js`), `window.data=${JSON.stringify(data)}`);
};

const initJS = (file: string): fs.WriteStream => {
	const stream = fs.createWriteStream(`${file}.js`);
	stream.write('window.data={"articles":[');
	return stream;
};

const compare = (a: string, b: string): number => a.localeCompare(b);

const resultDir = path.join(__dirname, 'results'),
	dir = fs.readdirSync(resultDir),
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
	const k = file.search(/-\d+\.json$/u),
		site = k === -1 ? file.slice(0, -5) : file.slice(0, k);
	summary.add(site);
	if (lang !== site) {
		continue;
	}
	const data = fs.readFileSync(fileDir, 'utf8'),
		date = new Date(data.substr(data.indexOf('\n"#timestamp": "') + 16, 10));
	latest = !latest || date > latest ? date : latest;
	for (const mt of data.matchAll(/^(".+"): \[$/gmu)) {
		const page: string = JSON.parse(mt[1]!),
			hash = createHash('sha256').update(page).digest('hex')
				.slice(0, 8),
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
		writeJS(info, path.join(site, 'pages', hash));
	}
}
const timestamp = latest!.toISOString().slice(0, 10);

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
writeJS([...Object.entries(wiki).sort(([a], [b]) => a.localeCompare(b)), timestamp], path.join(lang!, 'index'));
