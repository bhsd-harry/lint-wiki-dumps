import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {performance as perf} from 'perf_hooks';
import chalk from 'chalk';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';
import Parser from 'wikilint';
import {refreshStdout} from '@bhsd/common';
import {MAX} from './util';
import type {LintError} from './util';

const [,, site, dir] = process.argv,
	target = `${site}wiki`,
	resultDir = path.join(__dirname, 'results');

Parser.config = target;

if (cluster.isPrimary) {
	if (!fs.existsSync(resultDir)) {
		fs.mkdirSync(resultDir);
	}
	const dumpDir = dir!.replace(/^~/u, os.homedir()),
		files = fs.readdirSync(dumpDir)
			.filter(file => file.startsWith(target.replaceAll('-', '_')))
			.map(file => {
				const filePath = path.join(dumpDir, file);
				return [filePath, fs.statSync(filePath).size] as const;
			})
			.sort(([, a], [, b]) => b - a),
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		workers = new Array(Math.min(os.availableParallelism(), files.length)).fill(undefined)
			.map(() => cluster.fork());
	let i = 0,
		j = 0,
		n = 0;
	console.time('parse');
	for (; i < workers.length; i++) {
		const worker = workers[i]!;
		worker.on('message', count => { // eslint-disable-line @typescript-eslint/no-loop-func
			n += count;
			if (i < files.length) {
				worker.send([files[i], i]);
				i++;
			} else {
				worker.disconnect();
				j++;
				if (j === workers.length) {
					console.timeEnd('parse');
					console.log(chalk.green(`Parsed ${n} pages in total`));
					process.exit(); // eslint-disable-line n/no-process-exit
				}
			}
		}).send([files[i], i]);
	}
} else {
	process.on('message', ([[file], j]: [[string, number], number]) => {
		const stream = new XmlStream(fs.createReadStream(file).pipe(bz2())),
			results = fs.createWriteStream(path.join(resultDir, `${site}-${j}.json`)),
			ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);
		let i = 0,
			failed = 0,
			comma = '',
			worst: {title: string, duration: number} | undefined;

		stream.preserve('text', true);
		results.write('{');
		results.on('close', () => {
			process.send!(i);
		});

		const stop = (): void => {
			console.log();
			console.timeEnd(`parse ${file}`);
			console.log(chalk.green(`Parsed ${i} pages from ${file}`));
			if (failed) {
				console.error(chalk.red(`${failed} pages failed to parse`));
			}
			if (worst) {
				console.info(
					chalk.yellow(
						`Worst page: ${worst.title} (${worst.duration.toFixed(3)} ms)`,
					),
				);
			}
			results.write('\n}');
			results.end();
		};

		const newEntry = (title: string, errors: LintError[]): void => {
			results.write(
				`${comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`,
			);
			comma ||= ',';
		};

		console.time(`parse ${file}`);
		stream.on('endElement: page', ({title, ns, revision: {model, text: {$text}}}) => {
			if (model === 'wikitext' && $text && ns !== '10') {
				refreshStdout(`${i++} ${title}`);
				try {
					const start = perf.now(),
						errors = Parser.parse($text, ns === '828').lint()
							.filter(({severity, rule}) => severity === 'error' && !ignore.has(rule)),
						duration = perf.now() - start;
					if (errors.length > 0) {
						newEntry(
							title,
							errors.map(({severity, suggestions, fix, ...e}) => ({
								...e,
								...suggestions && {
									suggestions: suggestions.map(action => ({
										...action,
										original: $text.slice(...action.range),
									})),
								},
								...fix && {fix: {...fix, original: $text.slice(...fix.range)}},
								excerpt: $text.slice(e.startIndex, e.endIndex).slice(0, MAX),
							})),
						);
					}
					if (!worst || duration > worst.duration) {
						worst = {title, duration};
					}
				} catch (e) {
					console.error(chalk.red(`Error parsing ${title}`), e);
					failed++;
				}
			}
		});
		stream.on('end', stop);
	});
}
