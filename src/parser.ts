import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import {refreshStdout} from '@bhsd/common';
import {init, resultDir, getXmlStream, getTimestamp} from './util';
import {Processor} from './processor';

const [,, site, file] = process.argv,
	filePath = path.join(resultDir, `${site!.replaceAll('-', '_')}.json`),
	data = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8');
if (data) {
	console.log(chalk.green(`Reading ${filePath}`));
}

init();
const time = getTimestamp(data),
	last = (time && new Date(time)) as Date | undefined,
	results = fs.createWriteStream(filePath),
	processor = new Processor(site!, results, last);
let i = 0;

results.write('{');
results.on('close', () => {
	process.exit(); // eslint-disable-line n/no-process-exit
});

console.time('parse');
const stream = getXmlStream(file!.replace(/^~/u, os.homedir()));
stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
	if (model === 'wikitext' && $text && ns === '0') {
		refreshStdout(`${i++} ${title}`);
		processor.lint($text, ns, title, new Date(timestamp), last, data as string);
	}
});
stream.on('end', () => {
	processor.stop('parse', `Parsed ${i} pages`);
});
