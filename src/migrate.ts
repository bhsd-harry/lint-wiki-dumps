import fs from 'fs';
import path from 'path';
import {styleText} from 'util';
import * as mariadb from 'mariadb';
import {refreshStdout} from '@bhsd/nodejs';
import config from './config';
import {getResultDir, handleResults} from './util';
import type {LintError} from './common';

declare type Count = [{count: bigint}];

const [,, lang, temp, check] = process.argv,
	re = new RegExp(String.raw`^${lang}(?:-(?:p\d+){2})?\.json$`, 'u'),
	resultDir = getResultDir(temp),
	dir = fs.readdirSync(resultDir);

(async () => {
	const connection = await mariadb.createConnection(config);
	await connection.query('CREATE DATABASE IF NOT EXISTS `lint-wiki-dumps`');
	await connection.query('USE `lint-wiki-dumps`');
	const exist = await connection.query<unknown[]>('SHOW TABLES LIKE ?', [lang]);
	if (exist.length > 0) {
		console.warn(styleText('yellow', `Table ${lang} already exists!`));
		void connection.end();
		return;
	}
	await connection.query(`
		CREATE TABLE IF NOT EXISTS ${lang} (
			id INT PRIMARY KEY AUTO_INCREMENT,
			title VARCHAR(255) NOT NULL,
			rule VARCHAR(255) NOT NULL,
			message VARCHAR(255) NOT NULL,
			startline INT NOT NULL,
			startcol INT NOT NULL,
			excerpt TEXT NOT NULL,
			timestamp TIMESTAMP NOT NULL
		)
	`);
	let i = 0;
	const test = async (actual: bigint, expected: number, msg: string): Promise<void> => {
		if (actual !== BigInt(expected)) {
			await connection.query(`DROP TABLE ${lang}`);
			await connection.end();
			throw new Error(`Expected ${expected} records for ${msg}, but got ${actual}.`);
		}
	};
	const getEach = (file: string) => async (page: string, errors: LintError[], date: Date): Promise<void> => {
		for (const {rule, message, startLine, startCol, excerpt} of errors) {
			await connection.query(
				`INSERT INTO ${lang} (title, rule, message, startline, startcol, excerpt, timestamp)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				[page, rule, message, startLine, startCol, excerpt, date],
			);
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
	await connection.query(
		`CREATE TABLE IF NOT EXISTS metadata (
			table_name VARCHAR(255) PRIMARY KEY,
			timestamp TIMESTAMP NOT NULL
		)`,
	);
	const [{latest}] = await connection.query<[{latest: Date}]>(
		`SELECT MAX(timestamp) AS latest FROM ${lang}`,
	);
	await connection.query(
		`INSERT INTO metadata (table_name, timestamp)
		VALUES (?, ?)`,
		[lang, latest],
	);
	void connection.end();
	console.log(styleText('green', `Converted ${i} error records for ${lang} to MariaDB.`));
})();
