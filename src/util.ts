import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';

export const resultDir = path.join(__dirname, 'results');
const tempDir = path.join(__dirname, 'temp');

export const getTempPath = (file: string): string => path.join(tempDir, file);

export const init = (): void => {
	if (!fs.existsSync(resultDir)) {
		fs.mkdirSync(resultDir);
	}
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir);
	}
};

export const getWriteStream = (file: string, callback: () => void): fs.WriteStream => {
	const stream = fs.createWriteStream(file);
	stream.write('{');
	stream.on('close', callback);
	return stream;
};

export const getXmlStream = (file: string): XmlStream => {
	const readable = fs.createReadStream(file).pipe(bz2()),
		stream = new XmlStream(readable);
	readable.on('error', e => {
		console.error(chalk.red(`Error unzipping ${file}`));
		throw e;
	});
	stream._preserveAll = true; // eslint-disable-line no-underscore-dangle
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
