import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import {refreshStdout} from '@bhsd/common';
import {init, resultDir, getXmlStream, getTimestamp} from './util';
import {Processor} from './processor';

const [,, site, dir] = process.argv,
	target = site!.replaceAll('-', '_');

if (cluster.isPrimary) {
	init();
	const tempFiles: string[] = [];
	for (const file of fs.readdirSync(resultDir)) {
		if (file.startsWith(`${target}-p`) && file.endsWith('.json')) {
			const oldName = path.join(resultDir, file),
				newName = path.join(resultDir, `temp${file.slice(target.length)}`);
			console.log(chalk.green(`Reading ${oldName}`));
			tempFiles.push(newName);
			fs.renameSync(oldName, newName);
		}
	}
	const dumpDir = dir!.replace(/^~/u, os.homedir()),
		prefix = `${target}wiki`,
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
				worker.send(files[i]![0]);
				i++;
			} else {
				worker.disconnect();
			}
		}).send(files[i]![0]);
	}
	process.on('exit', () => {
		console.timeEnd('parse');
		console.log(chalk.green(`Parsed ${n} pages in total`));
		for (const file of tempFiles) {
			fs.unlinkSync(file);
		}
	});
} else {
	const getStartEnd = (f: string): [number, number] => {
		const p2 = f.lastIndexOf('p');
		return [Number(f.slice(6, p2)), Number(f.slice(p2 + 1, -5))];
	};
	const tempFiles = fs.readdirSync(resultDir)
			.filter(file => file.startsWith('temp-p') && file.endsWith('.json')),
		ranges = tempFiles.map(getStartEnd),
		max = Math.max(...ranges.map(([, end]) => end));
	let start: number | undefined,
		end: number | undefined,
		last: Date | false | undefined,
		data: string | undefined;
	process.on('message', (file: string) => {
		const results = fs.createWriteStream(
				path.join(resultDir, `${target}${file.slice(file.lastIndexOf('-'), -4)}.json`),
			),
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
				processor.lint($text, ns, title, date, last, data!);
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
		stream.on('endElement: page', ({title, ns, id, revision: {model, timestamp, text: {$text}}}) => {
			if (model === 'wikitext' && $text && ns === '0') {
				refreshStdout(`${i++} ${title}`);
				const pageid = Number(id);
				if (start === undefined || end === undefined || pageid < start || pageid > end) {
					const cur = pageid <= max && ranges.findIndex(([a, b]) => a <= pageid && b >= pageid);
					if (cur === false || cur === -1) {
						start = undefined;
						end = undefined;
						last = undefined;
					} else {
						[start, end] = ranges[cur]!;
						data = fs.readFileSync(path.join(resultDir, tempFiles[cur]!), 'utf8');
						const time = getTimestamp(data);
						last = (time && new Date(time)) as Date | false;
					}
				}
				lint($text, ns, title, new Date(timestamp));
			}
		});
		stream.on('end', stop);
	});
}
