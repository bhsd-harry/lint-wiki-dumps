import {normalize} from './util';
import {insertEntry, createTable, createMetadataTable, select, getTimestampDB} from './util-db';
import {ProcessorBase} from './processor-common';
import type {Connection} from 'mariadb';
import type {LintError, LintErrorDB} from './common';

export class ProcessorDB extends ProcessorBase {
	#site;
	#results;
	#exist;
	#refresh;
	#last: Date | undefined;

	/** @param site site nickname */
	constructor(site: string, results: Connection, exist: boolean, refresh?: string) {
		super(site);
		this.#site = normalize(site);
		this.#results = results;
		this.#exist = exist;
		this.#refresh = Boolean(refresh);
	}

	/** Initialize the processor. */
	async init(): Promise<void> {
		await createTable(this.#results, this.#site);
		await createMetadataTable(this.#results);
		this.#last = this.#exist ? await getTimestampDB(this.#results, this.#site) : undefined;
	}

	/**
	 * Write a new entry to the database.
	 * @param title page title
	 * @param errors lint errors
	 * @param date revision timestamp
	 */
	async newEntry(title: string, errors: LintError[] | LintErrorDB[], date: Date): Promise<void> {
		for (const error of errors) {
			const {rule, message, excerpt} = error,
				startLine = 'startLine' in error ? error.startLine : error.startline,
				startCol = 'startCol' in error ? error.startCol : error.startcol;
			await insertEntry(this.#results, this.#site, title, rule, message, startLine, startCol, excerpt, date);
		}
	}

	/**
	 * Parse a page and lint it.
	 * @param $text page text
	 * @param ns page namespace
	 * @param title page title
	 * @param date page revision date
	 */
	async lint($text: string, ns: string, title: string, date: Date): Promise<void> {
		this.lintStart(title, date);
		if (this.#last && date <= this.#last) {
			const previous = await select(this.#results, `temp_${this.#site}`, title);
			if (previous.length === 0) {
				return;
			} else if (!this.#refresh) {
				await this.newEntry(title, previous, date);
				return;
			}
		}
		await this.doLint($text, ns, title);
	}
}
