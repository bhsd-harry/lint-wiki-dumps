import {getXmlStream} from './xml';
import {replaceTilde, isArticle} from './util';
import type {Processor} from './processor';

const file = process.argv[3]!;

export const parse = (processor: Processor, data: string, last?: Date): void => {
	console.time('parse');
	const stream = getXmlStream(
		replaceTilde(file),
		() => {
			processor.stop('parse');
		},
		({title, ns, revision: {model, timestamp, text}}) => {
			if (isArticle(text, ns, model)) {
				stream.pause();
				processor.lint(text, title, timestamp, last, data);
				stream.resume();
			}
		},
	);
};
