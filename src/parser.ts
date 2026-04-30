import fs from 'fs';
import path from 'path';
import {
	init,
	getResultDir,
	getTempPath,
	getWriteStream,
	getDate,
	reading,
	normalize,
} from './util';
import {Processor} from './processor';
import {parse} from './parser-common';

const [,, site,, temp, refresh] = process.argv,
	resultDir = getResultDir(temp),
	filename = `${normalize(site!)}.json`,
	filePath = path.join(resultDir, filename),
	tempPath = getTempPath(filename),
	data = fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8');
if (data) {
	reading(filePath);
}

init(resultDir);
const last = getDate(data),
	results = getWriteStream(tempPath, () => {
		fs.renameSync(tempPath, filePath);
		process.exit(); // eslint-disable-line n/no-process-exit
	}),
	processor = new Processor(site!, results, refresh, last);

parse(processor, data as string, last);
