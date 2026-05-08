import fs from 'fs';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';
import {green, red} from '@bhsd/nodejs';

export const getXmlStream = (file: string): XmlStream => {
	console.log(green(`Unzipping and reading ${file}`));
	const readable = fs.createReadStream(file).pipe(bz2()),
		stream = new XmlStream(readable);
	readable.on('error', e => {
		console.error(red(`Error unzipping ${file}`));
		throw e;
	});
	stream._preserveAll = true;
	return stream;
};
