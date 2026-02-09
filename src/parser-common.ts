import {getXmlStream, replaceTilde, isArticle} from './util';
import type {Processor} from './processor';
import type {ProcessorDB} from './processor-db';

const file = process.argv[3]!;

export const parse = (
	processor: Processor | ProcessorDB,
	end?: () => Promise<void>,
	last?: Date,
	data?: string,
): void => {
	console.time('parse');
	const stream = getXmlStream(replaceTilde(file));
	stream.on('endElement: page', ({title, ns, revision: {model, timestamp, text: {$text}}}) => {
		if (isArticle($text, ns, model)) {
			stream.pause();
			(async () => {
				await processor.lint($text, ns, title, new Date(timestamp), last, data!);
				stream.resume();
			})();
		}
	});
	stream.on('end', () => {
		processor.stop('parse');
		void end?.();
	});
};
