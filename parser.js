'use strict';

const fs = require('fs'),
	os = require('os'),
	{performance: perf} = require('perf_hooks'),
	chalk = require('chalk'),
	bz2 = require('unbzip2-stream'),
	XmlStream = require('xml-stream'),
	Parser = require('wikilint'),
	{refreshStdout} = require('@bhsd/common');
const n = Number(process.argv[4]) || Infinity,
	[,, site, file,, restart] = process.argv;

Parser.config = site;
Parser.lintCSS = false;

const stream = new XmlStream(fs.createReadStream(file.replace(/^~/u, os.homedir())).pipe(bz2())),
	results = fs.createWriteStream(`results/${site}.json`, {flags: restart ? 'a' : 'w'}),
	ignore = new Set(['no-arg', 'url-encoding', 'h1']);
let i = 0,
	failed = 0,
	comma = restart ? ',' : '',
	stopping = false,
	restarted = !restart,
	worst;

stream.preserve('text', true);
if (!restart) {
	results.write('{');
}
results.on('close', () => {
	process.exit(); // eslint-disable-line n/no-process-exit
});

const stop = () => {
	stopping = true;
	console.timeEnd('parse');
	console.log(chalk.green(`Parsed ${i} pages`));
	if (failed) {
		console.error(chalk.red(`${failed} pages failed to parse`));
	}
	if (worst) {
		console.info(chalk.yellow(`Worst page: ${worst.title} (${worst.duration.toFixed(3)} ms)`));
	}
	results.write('\n}');
	results.close();
};

console.time('parse');
stream.on('endElement: page', ({title, ns, revision: {model, text: {$text}}}) => {
	if (i === n) {
		if (!stopping) {
			stop();
		}
	} else if (restarted && model === 'wikitext' && $text && ns === '0') {
		refreshStdout(`${i++} ${title}`);
		try {
			const start = perf.now(),
				errors = Parser.parse($text).lint()
					.filter(({severity, rule}) => severity === 'error' && !ignore.has(rule)),
				duration = perf.now() - start;
			if (errors.length > 0) {
				results.write(`${comma}\n${JSON.stringify(title)}: ${
					JSON.stringify(
						errors.map(({severity, suggestions, fix, ...e}) => ({
							...e,
							...suggestions && {
								suggestions: suggestions.map(action => ({
									...action,
									original: $text.slice(...action.range),
								})),
							},
							...fix && {fix: {...fix, original: $text.slice(...fix.range)}},
							excerpt: $text.slice(e.startIndex, e.endIndex),
						})),
						null,
						'\t',
					)
				}`);
				comma ||= ',';
			}
			if (!worst || duration > worst.duration) {
				worst = {title, duration};
			}
		} catch (e) {
			console.error(chalk.red(`Error parsing ${title}`), e);
			failed++;
		}
	} else if (title === restart) {
		restarted = true;
	}
});
stream.on('end', stop);
