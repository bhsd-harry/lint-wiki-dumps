import fs from 'fs';
import path from 'path';
import {refreshStdout} from '@bhsd/nodejs';
import {
	init,
	getResultDir,
	getTempPath,
	getWriteStream,
	getXmlStream,
	getTimestamp,
	isArticle,
	replaceTilde,
	reading,
	normalize,
} from './util';
import {Processor} from './processor';

const [,, site, file, temp, refresh] = process.argv,
	resultDir = getResultDir(temp),
	filename = `${normalize(site!)}.json`,
	filePath = path.join(resultDir, filename),
	tempPath = getTempPath(filename),
	data = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8');
if (data) {
	reading(filePath);
}

init(resultDir);
const last = getTimestamp(data),
	results = getWriteStream(tempPath, () => {
		fs.renameSync(tempPath, filePath);
		process.exit(); // eslint-disable-line n/no-process-exit
	}),
	processor = new Processor(site!, results, refresh, last);
let i = 0;

console.time('parse');
const stream = getXmlStream(replaceTilde(file!));
stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
	if (isArticle($text, ns, model)) {
		refreshStdout(`${i++} ${title}`);
		processor.lint($text, ns, title, new Date(timestamp), last, data as string);
	}
});
stream.on('end', () => {
	processor.stop('parse', `${i} pages`);
});
