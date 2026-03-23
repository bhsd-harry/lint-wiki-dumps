import cluster from 'cluster';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {green, red} from '@bhsd/nodejs';
import {
	getXmlStream,
	isArticle,
	replaceTilde,
	normalize,
	filter,
} from './util';
import {createConnection, existTable, updateMetadata, dropTable} from './util-db';
import {ProcessorDB} from './processor-db';
import type {Worker as NodeWorker} from 'cluster';

const [,, site, dir, refresh] = process.argv,
	target = normalize(site!);

(async () => {
	const connection = await createConnection();
	if (cluster.isPrimary) {
		const exist = await existTable(connection, target);
		if (exist) {
			await connection.query(`RENAME TABLE ${target} TO temp_${target}`);
		}
		const dumpDir = replaceTilde(dir!),
			pattern = new RegExp(String.raw`^${target}wiki-latest-pages-articles\d.+\.bz2$`, 'u'),
			files = filter(fs.readdirSync(dumpDir).filter(file => pattern.test(file)))
				.map(file => {
					const filePath = path.join(dumpDir, file);
					return [filePath, fs.statSync(filePath).size] as const;
				})
				.sort(([, a], [, b]) => b - a),
			workers = new Array(Math.min(os.availableParallelism(), files.length)).fill(undefined)
				.map(() => cluster.fork());
		let i = 0,
			n = 0,
			f = 0,
			m = 0,
			date: Date | undefined;
		const getListener = (worker: NodeWorker) =>
			([count, failed, total, latest]: [number, number, number, Date]): void => {
				n += count;
				f += failed;
				m += total;
				if (!date || latest > date) {
					date = latest;
				}
				if (i < files.length) {
					worker.send(files[i]![0]);
					i++;
				} else {
					worker.disconnect();
				}
			};
		console.time('parse');
		for (; i < workers.length; i++) {
			const worker = workers[i]!;
			worker.on('message', getListener(worker)).send(files[i]![0]);
		}
		process.on('exit', () => {
			console.timeEnd('parse');
			console.log(green(`Parsed ${n} / ${m} pages in total`));
			if (f) {
				console.error(red(`${f} pages in total failed to parse`));
			}
			(async () => {
				await updateMetadata(connection, target, date!);
				await dropTable(connection, `temp_${target}`);
				await connection.end();
			})();
		});
	} else {
		process.on('message', (file: string) => {
			(async () => {
				const processor = new ProcessorDB(
					site!,
					connection,
					await existTable(connection, `temp${target}`),
					refresh,
				);

				const stop = (): void => {
					processor.stop(`parse ${file}`, ` from ${file}`);
				};

				const lint = async ($text: string, ns: string, title: string, date: Date): Promise<void> => {
					try {
						await processor.lint($text, ns, title, date);
					} catch (e) {
						if (e instanceof RangeError && e.message === 'Maximum heap size exceeded') {
							processor.error(e, title);
							return;
						}
						throw e;
					}
				};

				console.time(`parse ${file}`);
				const stream = getXmlStream(file);
				stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
					if (isArticle($text, ns, model)) {
						stream.pause();
						(async () => {
							await lint($text, ns, title, new Date(timestamp));
							stream.resume();
						})();
					}
				});
				stream.on('end', stop);
			})();
		});
		process.on('exit', () => {
			void connection.end();
		});
	}
})();
