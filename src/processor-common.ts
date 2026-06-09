import cluster from 'cluster';
import Parser from 'wikilint';
import {refreshStdout, green, red} from '@bhsd/nodejs';
import {lint} from './common';
import type {LintError} from './common';

export abstract class ProcessorBase {
	total = 0;
	parsed = 0;
	failed = 0;
	latest: Date | undefined;

	/** @param site site nickname */
	constructor(site: string) {
		Parser.config = `${site}wiki`;
	}

	abstract newEntry(title: string, errors: LintError[] | string): void;

	/**
	 * Stop the processing and log the results.
	 * @param timer timer name
	 * @param msg additional message to log
	 */
	stop(timer: string, msg = ''): void {
		console.log();
		console.timeEnd(timer);
		console.log(green(`Parsed ${this.parsed.toLocaleString()} / ${this.total.toLocaleString()} pages${msg}`));
		if (this.failed) {
			console.error(red(`${this.failed.toLocaleString()} pages failed to parse`));
		}
	}

	/**
	 * Log an error message.
	 * @param e error object
	 * @param title page title
	 */
	error(e: unknown, title: string): void {
		console.error(red(`Error parsing ${title}`));
		console.error(e);
		this.failed++;
	}

	/**
	 * Prepare for linting a page.
	 * @param title page title
	 * @param date page revision date
	 */
	lintStart(title: string, date: Date): void {
		refreshStdout(`${++this.total} ${title}`);
		if (!this.latest || date > this.latest) {
			this.latest = date;
		}
	}

	/**
	 * Parse a page and lint it.
	 * @param $text page text
	 * @param title page title
	 * @throws `RangeError` maximum heap size exceeded
	 */
	doLint($text: string, title: string): void {
		try {
			const errors = lint($text, title);
			this.parsed++;
			if (errors.length > 0) {
				this.newEntry(title, errors);
			}
		} catch (e) {
			if (cluster.isWorker && e instanceof RangeError && e.message === 'Maximum heap size exceeded') {
				throw e;
			}
			this.error(e, title);
		}
	}
}
