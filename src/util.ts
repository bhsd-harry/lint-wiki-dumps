import fs from 'fs';
import path from 'path';
import {performance as perf} from 'perf_hooks';
import cluster from 'cluster';
import chalk from 'chalk';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';
import Parser from 'wikilint';
import type {LintError as LintErrorBase} from 'wikilint';

declare interface Fix extends LintErrorBase.Fix {
	original: string;
}
export interface LintError extends Omit<LintErrorBase, 'severity'> {
	excerpt: string;
	fix?: Fix;
	sugggestions?: Fix[];
}

export const MAX = 100,
	resultDir = path.join(__dirname, 'results');

const ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);

export const init = (): void => {
	if (!fs.existsSync(resultDir)) {
		fs.mkdirSync(resultDir);
	}
};

export const getXmlStream = (file: string): XmlStream => {
	const stream = new XmlStream(fs.createReadStream(file).pipe(bz2()));
	stream.preserve('text', true);
	return stream;
};

export class Processor {
	#failed = 0;
	#comma = '';
	#worst: {title: string, duration: number} | undefined;
	#results;
	#latest;

	/** @param site site nickname */
	constructor(site: string, results: fs.WriteStream, latest?: Date) {
		Parser.config = `${site}wiki`;
		this.#results = results;
		this.#latest = latest;
	}

	/**
	 * Stop the processing and log the results.
	 * @param timer timer name
	 * @param msg message to log
	 */
	stop(timer: string, msg: string): void {
		console.log();
		console.timeEnd(timer);
		console.log(chalk.green(msg));
		if (this.#failed) {
			console.error(chalk.red(`${this.#failed} pages failed to parse`));
		}
		if (this.#worst) {
			console.info(
				chalk.yellow(
					`Worst page: ${this.#worst.title} (${this.#worst.duration.toFixed(3)} ms)`,
				),
			);
		}
		this.#results.write(`${this.#comma}\n"#timestamp": ${JSON.stringify(this.#latest)}\n}`);
		this.#results.end();
	}

	/**
	 * Write a new entry to the results file.
	 * @param title page title
	 * @param errors lint errors
	 */
	newEntry(title: string, errors: LintError[]): void {
		this.#results.write(
			`${this.#comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`,
		);
		this.#comma ||= ',';
	}

	/**
	 * Parse a page and lint it.
	 * @param $text page text
	 * @param ns page namespace
	 * @param title page title
	 * @param date page revision date
	 * @throws `RangeError` maximum heap size exceeded
	 */
	lint($text: string, ns: string, title: string, date: Date): void {
		if (!this.#latest || date > this.#latest) {
			this.#latest = date;
		}
		try {
			const start = perf.now(),
				errors = Parser.parse($text, ns === '828').lint()
					.filter(({severity, rule}) => severity === 'error' && !ignore.has(rule)),
				duration = perf.now() - start;
			if (errors.length > 0) {
				this.newEntry(
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
			if (!this.#worst || duration > this.#worst.duration) {
				this.#worst = {title, duration};
			}
		} catch (e) {
			if (cluster.isWorker && e instanceof RangeError && e.message === 'Maximum heap size exceeded') {
				throw e;
			}
			this.error(e, title);
		}
	}

	/**
	 * Log an error message.
	 * @param e error object
	 * @param title page title
	 */
	error(e: unknown, title: string): void {
		console.error(chalk.red(`Error parsing ${title}`), e);
		this.#failed++;
	}
}
