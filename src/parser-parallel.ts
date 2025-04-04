import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import {refreshStdout} from '@bhsd/common';
import {Processor, init, resultDir, getXmlStream} from './processor';

const [,, site, dir] = process.argv,
	target = `${site}wiki`;

if (cluster.isPrimary) {
	init();
	const dumpDir = dir!.replace(/^~/u, os.homedir()),
		prefix = target.replaceAll('-', '_'),
		files = fs.readdirSync(dumpDir).filter(file => file.endsWith('.bz2') && file.startsWith(prefix))
			.map(file => {
				const filePath = path.join(dumpDir, file);
				return [filePath, fs.statSync(filePath).size] as const;
			})
			.sort(([, a], [, b]) => b - a),
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		workers = new Array(Math.min(os.availableParallelism(), files.length)).fill(undefined)
			.map(() => cluster.fork());
	let i = 0,
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
			}
		}).send([files[i], i]);
	}
	process.on('exit', () => {
		console.timeEnd('parse');
		console.log(chalk.green(`Parsed ${n} pages in total`));
	});
} else {
	process.on('message', ([[file], j]: [[string, number], number]) => {
		const results = fs.createWriteStream(path.join(resultDir, `${site}-${j}.json`)),
			processor = new Processor(site!, results);
		let i = 0;

		results.write('{');
		results.on('close', () => {
			process.send!(i);
		});

		const stop = (): void => {
			processor.stop(`parse ${file}`, `Parsed ${i} pages from ${file}`);
		};

		const lint = ($text: string, ns: string, title: string, date: Date, retry = 0): boolean => {
			try {
				processor.lint($text, ns, title, date);
				return true;
			} catch (e) {
				if (e instanceof RangeError && e.message === 'Maximum heap size exceeded') {
					if (retry === 0) {
						stream.pause();
					} else if (retry > 5) {
						processor.error(e, title);
						return true;
					}
					setTimeout(() => {
						if (lint($text, ns, title, date, retry + 1)) {
							stream.resume();
						}
					}, 1e4);
					return false;
				}
				throw e;
			}
		};

		console.time(`parse ${file}`);
		const stream = getXmlStream(file);
		stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
			if (model === 'wikitext' && $text && ns === '0') {
				refreshStdout(`${i++} ${title}`);
				lint($text, ns, title, new Date(timestamp));
			}
		});
		stream.on('end', stop);
	});
}
