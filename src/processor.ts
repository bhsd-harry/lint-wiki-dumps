import {getErrors} from './util';
import {ProcessorBase} from './processor-common';
import type {WriteStream} from 'fs';
import type {LintError} from './common';

export class Processor extends ProcessorBase {
	#comma = '';
	#results;
	#refresh;

	/** @param site site nickname */
	constructor(site: string, results: WriteStream, refresh?: string, latest?: Date) {
		super(site);
		this.#results = results;
		this.#refresh = Boolean(refresh);
		this.latest = latest;
	}

	/**
	 * Stop the processing and log the results.
	 * @param timer timer name
	 * @param msg additional message to log
	 */
	override stop(timer: string, msg = ''): void {
		super.stop(timer, msg);
		this.#results.write(`${this.#comma}\n"#timestamp": ${JSON.stringify(this.latest)}\n}`);
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
	 */
	lint($text: string, ns: string, title: string, date: Date, last: Date | undefined, data: string): void {
		this.lintStart(title, date);
		if (last && date <= last) {
			const previous = getErrors(data, title);
			if (!previous) {
				return;
			} else if (!this.#refresh) {
				this.newEntry(title, previous);
				return;
			}
		}
		void this.doLint($text, ns, title);
	}
}
