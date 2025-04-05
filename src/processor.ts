import {performance as perf} from 'perf_hooks';
import cluster from 'cluster';
import chalk from 'chalk';
import Parser from 'wikilint';
import {MAX, getErrors} from './util';
import type {WriteStream} from 'fs';
import type {LintError} from './util';

const ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);

export class Processor {
	#failed = 0;
	#comma = '';
	#worst: {title: string, duration: number} | undefined;
	#results;
	#latest;

	/** @param site site nickname */
	constructor(site: string, results: WriteStream, latest?: Date) {
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
	newEntry(title: string, errors: LintError[] | string): void {
		this.#results.write(
			`${this.#comma}\n${JSON.stringify(title)}: ${
				typeof errors === 'string' ? errors : JSON.stringify(errors, null, '\t')
			}`,
		);
		this.#comma ||= ',';
	}

	/**
	 * Parse a page and lint it.
	 * @param $text page text
	 * @param ns page namespace
	 * @param title page title
	 * @param date page revision date
	 * @param last last revision date
	 * @param data previous results
	 * @throws `RangeError` maximum heap size exceeded
	 */
	lint($text: string, ns: string, title: string, date: Date, last: Date | false | undefined, data: string): void {
		if (!this.#latest || date > this.#latest) {
			this.#latest = date;
		}
		if (last && date <= last) {
			const previous = getErrors(data, title);
			if (previous) {
				this.newEntry(title, previous);
			}
		} else {
			try {
				const start = perf.now(),
					errors = Parser.parse($text, ns === '828').lint()
						.filter(({severity, rule}) => severity === 'error' && !ignore.has(rule)),
					duration = perf.now() - start;
				if (errors.length > 0) {
					this.newEntry(
						title,
						errors.map(({
							severity,
							suggestions,
							fix,

							/* DISABLED */

							code,
							startIndex,
							endLine,
							endCol,
							endIndex,

							/* DISABLED END */

							...e
						}) => ({
							...e,

							// eslint-disable-next-line @stylistic/multiline-comment-style
							/* DISABLED

							...suggestions && {
								suggestions: suggestions.map(action => ({
									...action,
									original: $text.slice(...action.range),
								})),
							},
							...fix && {fix: {...fix, original: $text.slice(...fix.range)}},

							*/

							excerpt: $text.slice(startIndex, endIndex).slice(0, MAX),
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
