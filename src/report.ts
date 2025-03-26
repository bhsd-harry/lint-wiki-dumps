import fs from 'fs';
import path from 'path';
import {createHash} from 'crypto';
import chalk from 'chalk';
import type {LintError} from 'wikilint';
import type {Results} from './parser';

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

const writeJS = (data: object, file: string): void => {
	fs.writeFileSync(path.join(dataDir, `${file}.js`), `window.data=${JSON.stringify(data)}`);
};

const dir = fs.readdirSync(path.join(__dirname, 'results')),
	summary: string[] = [],
	MAX = 100;
for (const file of dir) {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const data: Omit<Results, '#timestamp'> = require(`./results/${file}`);
		const site = file.slice(0, -5);
		summary.push(site);
		delete data['#timestamp'];

		if (!lang || lang === site) {
			const siteDir = path.join(dataDir, site);
			mkdir(siteDir, true);

			// wiki
			const values = Object.values(data),
				rules = [...new Set(values.flat().map(({rule}) => rule))].sort((a, b) => a.localeCompare(b)),
				wiki: [LintError.Rule, number][] = [];
			for (const rule of rules) {
				wiki.push([rule, values.filter(errors => errors.some(({rule: r}) => r === rule)).length]);

				// rule
				const articles = Object.entries(data).filter(([, errors]) => errors.some(({rule: r}) => r === rule))
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([page, errors]): [string, number, number, string, string] => {
							const {startLine, startCol, message, excerpt} = errors.find(({rule: r}) => r === rule)!;
							return [page, startLine + 1, startCol + 1, message, excerpt.slice(0, MAX * 0.8)];
						}),
					batches = Math.ceil(articles.length / 200);
				for (let i = 0; i < batches; i++) {
					writeJS(
						{
							articles: articles.slice(i * 200, (i + 1) * 200),
							batches,
						},
						path.join(site, `${rule}-${i}`),
					);
				}
			}
			writeJS(wiki, path.join(site, 'index'));

			// article
			const articlesDir = path.join(siteDir, 'pages');
			mkdir(articlesDir);
			for (const [page, errors] of Object.entries(data)) {
				const hash = createHash('sha256').update(page).digest('hex')
						.slice(0, 8),
					info = errors.map(({
						startLine,
						startCol,
						rule,
						message,
						excerpt,
					}): [LintError.Rule, number, number, string, string] => [
						rule,
						startLine + 1,
						startCol + 1,
						message,
						excerpt.slice(0, MAX),
					]);
				writeJS(info, path.join(site, 'pages', hash));
			}
		}
	} catch {
		console.error(chalk.red(`Failed to read ${file}`));
	}
}
writeJS(summary, 'index');
