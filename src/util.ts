import fs from 'fs';
import path from 'path';
import bz2 from 'unbzip2-stream';
import XmlStream from 'xml-stream';
import type {LintError as LintErrorBase} from 'wikilint';

declare interface Fix extends LintErrorBase.Fix {
	original: string;
}
export interface LintError extends Omit<
	LintErrorBase,
	'severity' | 'code' | 'startIndex' | 'endLine' | 'endCol' | 'endIndex'
> {
	excerpt: string;
	fix?: Fix;
	sugggestions?: Fix[];
}

export const MAX = 100,
	resultDir = path.join(__dirname, 'results');

export const init = (): void => {
	if (!fs.existsSync(resultDir)) {
		fs.mkdirSync(resultDir);
	}
};

export const getXmlStream = (file: string): XmlStream => {
	const stream = new XmlStream(fs.createReadStream(file).pipe(bz2()));
	stream.preserve('text', true);
	return stream;
};

export const getTimestamp = (data: string | false): string | undefined => {
	if (!data) {
		return undefined;
	}
	const i = data.indexOf('"#timestamp": "') + 15;
	return data.slice(i, data.indexOf('"', i));
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
