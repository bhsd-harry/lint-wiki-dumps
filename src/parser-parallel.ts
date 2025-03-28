import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import {refreshStdout} from '@bhsd/common';
import {Processor, init, resultDir, getXmlStream} from './util';

const [,, site, dir] = process.argv,
	target = `${site}wiki`;

if (cluster.isPrimary) {
	init();
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
		const stream = getXmlStream(file),
			results = fs.createWriteStream(path.join(resultDir, `${site}-${j}.json`)),
			processor = new Processor(site!, results);
		let i = 0;

		results.write('{');
		results.on('close', () => {
			process.send!(i);
		});

		const stop = (): void => {
			processor.stop(`parse ${file}`, `Parsed ${i} pages from ${file}`);
			results.write('\n}');
			results.end();
		};

		console.time(`parse ${file}`);
		stream.on('endElement: page', ({title, ns, revision: {model, text: {$text}}}) => {
			if (model === 'wikitext' && $text && ns !== '10') {
				refreshStdout(`${i++} ${title}`);
				processor.lint($text, ns, title);
			}
		});
		stream.on('end', stop);
	});
}
