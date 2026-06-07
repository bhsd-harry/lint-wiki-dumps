import fs from 'fs';
import bz2 from 'unbzip2-stream';
import {WritableStream as ParserStream} from 'htmlparser2/WritableStream';
import {green, red} from '@bhsd/nodejs';
import type {Transform} from 'stream';

declare interface Page {
	title: string;
	ns: string;
	id: number;
	revision: {
		timestamp: Date;
		model: string;
		text: string;
	};
}

export const getXmlStream = (file: string, onend: () => void, processPage: (page: Page) => void): Transform => {
	console.log(green(`Unzipping and reading ${file}`));
	let cur: string,
		page: Page | undefined;
	const stack: string[] = [],
		readable = fs.createReadStream(file),
		decompressor = bz2(),
		stream = new ParserStream({
			onend,
			onopentag(name): void {
				stack.push(name);
				cur = '';
				if (name === 'page') {
					page = {revision: {}} as Page;
				}
			},
			ontext(text): void {
				if (page) {
					cur += text;
				}
			},
			onclosetag(name): void {
				stack.pop();
				switch (name) {
					case 'id':
						if (stack.at(-1) === 'page') {
							page!.id = Number(cur);
						}
						break;
					case 'title':
					case 'ns':
						page![name] = cur.trim();
						break;
					case 'timestamp':
						page!.revision.timestamp = new Date(cur.trim());
						break;
					case 'model':
						page!.revision.model = cur.trim();
						break;
					case 'text':
						page!.revision.text = cur;
						break;
					case 'page':
						processPage(page!);
						page = undefined;
						break;
					// no default
				}
			},
		}, {xmlMode: true});
	decompressor.on('error', e => {
		console.error(red(`Error unzipping ${file}`));
		readable.destroy();
		stream.destroy();
		throw e;
	});
	stream.on('error', e => {
		console.error(red(`Error parsing XML from ${file}`));
		readable.destroy();
		decompressor.destroy();
		throw e;
	});
	readable.pipe(decompressor).pipe(stream);
	return decompressor;
};
