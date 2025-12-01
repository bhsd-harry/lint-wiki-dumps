import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';

const defaultResultDir = path.join(__dirname, 'results'),
	tempDir = path.join(__dirname, 'temp');

export const getTempPath = (file: string): string => path.join(tempDir, file);

export const mkdir = (dir: string, empty?: boolean): void => {
	if (fs.existsSync(dir)) {
		if (!empty) {
			return;
		}
		fs.rmSync(dir, {recursive: true});
	}
	fs.mkdirSync(dir);
};

export const init = (dir?: string): void => {
	mkdir(tempDir);
	if (dir) {
		mkdir(dir);
	}
};

export const getResultDir = (dir?: string): string => dir ? replaceTilde(dir) : defaultResultDir;

export const getWriteStream = (file: string, callback: () => void): fs.WriteStream => {
	const stream = fs.createWriteStream(file);
	stream.write('{');
	stream.on('close', callback);
	return stream;
};

export const getXmlStream = (file: string): XmlStream => {
	console.log(chalk.green(`Unzipping and reading ${file}`));
	const readable = fs.createReadStream(file).pipe(bz2()),
		stream = new XmlStream(readable);
	readable.on('error', e => {
		console.error(chalk.red(`Error unzipping ${file}`));
		throw e;
	});
	stream._preserveAll = true;
	return stream;
};

export const getTimestamp = (data: string | false): Date | undefined => {
	if (!data) {
		return undefined;
	}
	const i = data.indexOf('"#timestamp": "') + 15;
	return new Date(data.slice(i, data.indexOf('"', i)));
};

export const getErrors = (data: string, page: string): string | undefined => {
	const str = JSON.stringify(page),
		i = data.indexOf(`${str}: [`);
	if (i === -1) {
		return undefined;
	}
	const j = i + str.length + 2;
	return data.slice(j, data.indexOf('\n]', j) + 2);
};

export const isArticle = ($text: string, ns: string, model: string): boolean =>
	ns === '0' && model === 'wikitext' && Boolean($text);

export const replaceTilde = (str: string): string => str.replace(/^~/u, os.homedir());

export const reading = (file: string): void => {
	console.log(chalk.green(`Reading ${file}`));
};

export const normalize = (str: string): string => str.replaceAll('-', '_');

export const filter = (files: string[]): string[] => files.map(file => [
	file,
	.../\.xml-p(\d+)p(\d+)\.bz2$/u.exec(file)!.slice(1).map(Number),
] as [string, number, number])
	.sort(([, a1, a2], [, b1, b2]) => a1 - b1 || a2 - b2)
	.filter(([, a], i, arr) => a !== arr[i + 1]?.[1])
	.map(([file]) => file);
