import fs from 'fs';
import path from 'path';
import os from 'os';
import {performance as perf} from 'perf_hooks';
import chalk from 'chalk';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';
import Parser from 'wikilint';
import {refreshStdout} from '@bhsd/common';
import type {LintError as LintErrorBase} from 'wikilint';

declare interface Fix extends LintErrorBase.Fix {
	original: string;
}
export interface LintError extends Omit<LintErrorBase, 'severity'> {
	excerpt: string;
	fix?: Fix;
	sugggestions?: Fix[];
}
export type Results = Record<string, LintError[]> & {'#timestamp': string};

const n = Number(process.argv[4]) || Infinity,
	[,, site, file,, restart] = process.argv;

Parser.config = `${site}wiki`;

if (!fs.existsSync('results')) {
	fs.mkdirSync('results');
}
const stream = new XmlStream(fs.createReadStream(file!.replace(/^~/u, os.homedir())).pipe(bz2())),
	output = path.join('results', `${site}.json`);
let old: Results | undefined;
try {
	old = require(`./${output}`); // eslint-disable-line @typescript-eslint/no-require-imports
} catch {}
const time = old?.['#timestamp'],
	last = time && new Date(time),
	results = fs.createWriteStream(output, {flags: restart ? 'a' : 'w'}),
	ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);
let i = 0,
	latest = last,
	failed = 0,
	comma = restart ? ',' : '',
	stopping = false,
	restarted = !restart,
	worst: {title: string, duration: number} | undefined;

stream.preserve('text', true);
if (!restart) {
	results.write('{');
}
results.on('close', () => {
	process.exit(); // eslint-disable-line n/no-process-exit
});

const stop = (): void => {
	stopping = true;
	console.timeEnd('parse');
	console.log(chalk.green(`Parsed ${i} pages`));
	if (failed) {
		console.error(chalk.red(`${failed} pages failed to parse`));
	}
	if (worst) {
		console.info(
			chalk.yellow(`Worst page: ${worst.title} (${worst.duration.toFixed(3)} ms)`),
		);
	}
	results.write(`${comma}\n"#timestamp": ${JSON.stringify(latest)}\n}`);
	results.close();
};

const newEntry = (title: string, errors: LintError[]): void => {
	results.write(`${comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`);
	comma ||= ',';
};

console.time('parse');
stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
	if (i === n) {
		if (!stopping) {
			stop();
		}
	} else if (restarted && model === 'wikitext' && $text && ns === '0') {
		refreshStdout(`${i++} ${title}`);
		const date = new Date(timestamp);
		if (last && date <= last) {
			const previous = old![title];
			if (previous) {
				newEntry(title, previous);
			}
		} else {
			latest = !latest || date > latest ? date : latest;
			try {
				const start = perf.now(),
					errors = Parser.parse($text).lint()
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
							excerpt: $text.slice(e.startIndex, e.endIndex),
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
	} else if (title === restart) {
		restarted = true;
	}
});
stream.on('end', stop);
