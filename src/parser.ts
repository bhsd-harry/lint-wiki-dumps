import fs from 'fs';
import path from 'path';
import os from 'os';
import {refreshStdout} from '@bhsd/common';
import {Processor, init, resultDir, getXmlStream} from './util';
import type {LintError} from './util';

const n = Number(process.argv[4]) || Infinity,
	[,, site, file,, restart] = process.argv,
	filePath = path.join(resultDir, `${site}.json`),
	data = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8');

const getTimestamp = (): string | undefined => {
	if (!data) {
		return undefined;
	}
	const i = data.indexOf('"#timestamp": "') + 15;
	return data.slice(i, data.indexOf('"', i));
};

const getErrors = (page: string): LintError[] | undefined => {
	if (!data) {
		return undefined;
	}
	const str = JSON.stringify(page),
		i = data.indexOf(`${str}: [`);
	if (i === -1) {
		return undefined;
	}
	const j = i + str.length + 2;
	return JSON.parse(data.slice(j, data.indexOf('\n]', j) + 2));
};

init();
const time = getTimestamp(),
	last = time && new Date(time),
	results = fs.createWriteStream(path.join(resultDir, `${site}.json`), {flags: restart ? 'a' : 'w'}),
	processor = new Processor(site!, results, last as Date | undefined);
let i = 0,
	stopping = false,
	restarted = !restart;

if (!restart) {
	results.write('{');
}
results.on('close', () => {
	process.exit(); // eslint-disable-line n/no-process-exit
});

const stop = (): void => {
	stopping = true;
	processor.stop('parse', `Parsed ${i} pages`);
};

console.time('parse');
const stream = getXmlStream(file!.replace(/^~/u, os.homedir()));
stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
	if (i === n) {
		if (!stopping) {
			stop();
		}
	} else if (restarted && model === 'wikitext' && $text && ns !== '10') {
		refreshStdout(`${i++} ${title}`);
		const date = new Date(timestamp);
		if (last && date <= last) {
			const previous = getErrors(title);
			if (previous) {
				processor.newEntry(title, previous);
			}
		} else {
			processor.lint($text, ns, title, date);
		}
	} else if (title === restart) {
		restarted = true;
	}
});
stream.on('end', stop);
