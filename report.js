'use strict';

const fs = require('fs'),
	path = require('path'),
	{createHash} = require('crypto'),
	chalk = require('chalk');
const [,, lang] = process.argv;

const mkdir = dir => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
};

const dataDir = path.join('reports', 'data');
mkdir(dataDir);

const writeJS = (data, file) => {
	fs.writeFileSync(path.join(dataDir, `${file}.js`), `window.data=${JSON.stringify(data)}`);
};

const dir = fs.readdirSync('results'),
	summary = [],
	MAX = 150;
for (const file of dir) {
	try {
		/** @type {Record<string, (import('wikilint').LintError & {excerpt: string})[]>} */
		const data = require(`./results/${file}`);
		const site = file.slice(0, -5);
		summary.push(site);
		delete data['#timestamp'];

		if (!lang || lang === site) {
			const siteDir = path.join(dataDir, site);
			mkdir(siteDir);

			// wiki
			const values = Object.values(data),
				rules = [...new Set(values.flat().map(({rule}) => rule))].sort((a, b) => a.localeCompare(b)),
				wiki = [];
			for (const rule of rules) {
				wiki.push([rule, values.filter(errors => errors.some(({rule: r}) => r === rule)).length]);

				// rule
				const articles = Object.entries(data).filter(([, errors]) => errors.some(({rule: r}) => r === rule))
					.sort(([a], [b]) => a.localeCompare(b)).map(([page, errors]) => {
						/** @type {import('wikilint').LintError & {excerpt: string}} */
						const {startLine, startCol, message, excerpt} = errors.find(({rule: r}) => r === rule);
						return [page, startLine + 1, startCol + 1, message, excerpt.slice(0, MAX)];
					});
				writeJS(articles, path.join(site, rule));
			}
			writeJS(wiki, path.join(site, 'index'));

			// article
			const articlesDir = path.join(siteDir, 'pages');
			mkdir(articlesDir);
			for (const [page, errors] of Object.entries(data)) {
				const hash = createHash('sha256').update(page).digest('hex')
						.slice(0, 8),
					relatedRules = [...new Set(errors.map(({rule}) => rule))].sort((a, b) => a.localeCompare(b)),
					info = relatedRules.map(rule => {
						const relatedErrors = errors.filter(({rule: r}) => r === rule),
							[{startLine, startCol, message, excerpt}] = relatedErrors;
						return [
							relatedErrors.length,
							rule,
							startLine + 1,
							startCol + 1,
							message,
							excerpt.slice(0, MAX),
						];
					});
				writeJS(info, path.join(site, 'pages', hash));
			}
		}
	} catch {
		console.error(chalk.red(`Failed to read ${file}`));
	}
}
writeJS(summary, 'index');
