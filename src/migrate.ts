import fs from 'fs';
import path from 'path';
import {refreshStdout, yellow, green} from '@bhsd/nodejs';
import {getResultDir, handleResults, normalize} from './util';
import {
	createConnection,
	createTable,
	insertEntry,
	existTable,
	createMetadataTable,
	updateMetadata,
	dropTable,
} from './util-db';
import type {LintError} from './common';

declare type Count = [{count: bigint}];

const [,, site, temp, check, update] = process.argv,
	lang = normalize(site!),
	re = new RegExp(String.raw`^${lang}(?:-(?:p\d+){2})?\.json$`, 'u'),
	resultDir = getResultDir(temp),
	dir = fs.readdirSync(resultDir);

(async () => {
	const connection = await createConnection();
	if (await existTable(connection, lang)) {
		console.warn(yellow(`Table ${lang} already exists!`));
		if (update) {
			await dropTable(connection, lang);
		} else {
			void connection.end();
			return;
		}
	}
	await createTable(connection, lang);
	let i = 0;
	const test = async (actual: bigint, expected: number, msg: string): Promise<void> => {
		if (actual !== BigInt(expected)) {
			await dropTable(connection, lang);
			await connection.end();
			throw new Error(`Expected ${expected} records for ${msg}, but got ${actual}.`);
		}
	};
	const getEach = (file: string) => async (page: string, errors: LintError[], date: Date): Promise<void> => {
		for (const {rule, message, startLine, startCol, excerpt} of errors) {
			await insertEntry(connection, lang, page, rule, message, startLine, startCol, excerpt, date);
			refreshStdout(`${++i} ${page}`);
		}
		if (check) {
			const [{count}] = await connection.query<Count>(
				`SELECT COUNT(*) AS count FROM ${lang} WHERE title COLLATE utf8mb4_bin = ?`,
				[page],
			);
			await test(count, errors.length, `${JSON.stringify(page)} from ${file}`);
		}
	};
	for (const file of dir) {
		if (!re.test(file)) {
			continue;
		}
		await handleResults(path.join(resultDir, file), getEach(file));
		if (check) {
			const [{count}] = await connection.query<Count>(`SELECT COUNT(*) AS count FROM ${lang}`);
			await test(count, i, file);
		}
	}
	await createMetadataTable(connection);
	const [{latest}] = await connection.query<[{latest: Date}]>(
		`SELECT MAX(timestamp) AS latest FROM ${lang}`,
	);
	await updateMetadata(connection, lang, latest);
	void connection.end();
	console.log(green(`Converted ${i} error records for ${lang} to MariaDB.`));
})();
