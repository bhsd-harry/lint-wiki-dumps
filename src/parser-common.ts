import {getXmlStream} from './xml';
import {replaceTilde, isArticle} from './util';
import type {Processor} from './processor';

const file = process.argv[3]!;

export const parse = (
	processor: Processor,
	data: string,
	last?: Date,
): void => {
	console.time('parse');
	const stream = getXmlStream(replaceTilde(file));
	stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
		if (isArticle($text, ns, model)) {
			stream.pause();
			processor.lint($text, ns, title, new Date(timestamp), last, data);
			stream.resume();
		}
	});
	stream.on('end', () => {
		processor.stop('parse');
	});
};
