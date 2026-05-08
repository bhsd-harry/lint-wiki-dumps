import * as mariadb from 'mariadb';
import config from './config';
import type {Connection} from 'mariadb';
import type {LintErrorDB} from './common';

export const createConnection = async (): Promise<Connection> => {
	const {dbname, ...other} = config,
		connection = await mariadb.createConnection(other);
	await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbname}\``);
	await connection.query(`USE \`${dbname}\``);
	return connection;
};

export const createTable = async (connection: Connection, lang: string): Promise<void> => {
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
};

export const createMetadataTable = async (connection: Connection): Promise<void> => {
	await connection.query(
		`CREATE TABLE IF NOT EXISTS metadata (
			table_name VARCHAR(255) PRIMARY KEY,
			timestamp TIMESTAMP NOT NULL
		)`,
	);
};

export const insertEntry = async (
	connection: Connection,
	lang: string,
	title: string,
	rule: string,
	message: string,
	startline: number,
	startcol: number,
	excerpt: string,
	date: Date,
): Promise<void> => {
	await connection.query(
		`INSERT INTO ${lang} (title, rule, message, startline, startcol, excerpt, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[title, rule, message, startline, startcol, excerpt, date],
	);
};

export const existTable = async (connection: Connection, lang: string): Promise<boolean> =>
	(await connection.query<unknown[]>('SHOW TABLES LIKE ?', [lang])).length > 0;

export const updateMetadata = async (connection: Connection, lang: string, timestamp: Date): Promise<void> => {
	await connection.query(
		`INSERT INTO metadata (table_name, timestamp)
		VALUES (?, ?)
		ON DUPLICATE KEY UPDATE
		timestamp = ?`,
		[lang, timestamp, timestamp],
	);
};

export const dropTable = async (connection: Connection, lang: string): Promise<void> => {
	await connection.query(`DROP TABLE IF EXISTS ${lang}`);
};

export const select = (connection: Connection, lang: string, title: string): Promise<LintErrorDB[]> =>
	connection.query<LintErrorDB[]>(`SELECT * FROM ${lang} WHERE title COLLATE utf8mb4_bin = ?`, [title]);

export const getTimestampDB = async (connection: Connection, lang: string): Promise<Date | undefined> =>
	(await connection.query<{timestamp: Date}[]>(
		'SELECT timestamp FROM metadata WHERE table_name = ?',
		[lang],
	))[0]?.timestamp;
