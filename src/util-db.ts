import * as mariadb from 'mariadb';
import config from './config';
import type {Connection} from 'mariadb';

export const createConnection = async (): Promise<Connection> => {
	const connection = await mariadb.createConnection(config);
	await connection.query('CREATE DATABASE IF NOT EXISTS `lint-wiki-dumps`');
	await connection.query('USE `lint-wiki-dumps`');
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
	startLine: number,
	startCol: number,
	excerpt: string,
	date: Date,
): Promise<void> => {
	await connection.query(
		`INSERT INTO ${lang} (title, rule, message, startline, startcol, excerpt, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[title, rule, message, startLine, startCol, excerpt, date],
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
