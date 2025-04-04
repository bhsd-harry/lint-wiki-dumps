import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import {refreshStdout} from '@bhsd/common';
import {init, resultDir, getXmlStream, getTimestamp, getErrors} from './util';
import {Processor} from './processor';

const n = Number(process.argv[4]) || Infinity,
	[,, site, file,, restart] = process.argv,
	target = site!.replaceAll('-', '_'),
	filePath = path.join(resultDir, `${target}.json`),
	data = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8');
if (data) {
	console.log(chalk.green(`Reading ${filePath}`));
}

init();
const time = getTimestamp(data),
	last = time && new Date(time),
	results = fs.createWriteStream(filePath, {flags: restart ? 'a' : 'w'}),
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
	} else if (restarted && model === 'wikitext' && $text && ns === '0') {
		refreshStdout(`${i++} ${title}`);
		const date = new Date(timestamp);
		if (last && date <= last) {
			const previous = getErrors(data as string, title);
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
