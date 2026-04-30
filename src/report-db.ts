import {normalize} from './util';
import {createConnection, select, getTimestampDB} from './util-db';
import {wiki, writeSummary, writeArticle, updateRuleRecords, writeWiki} from './report-common';
import type {LintErrorDB} from './common';

const lang = normalize(process.argv[2]!);

(async () => {
	const connection = await createConnection(),
		summary = (await connection.query<Record<string, string>[]>('SHOW TABLES')).flatMap<string>(Object.values)
			.filter(table => table !== 'metadata')
			.map(table => table.replaceAll('_', '-'));
	writeSummary(summary);

	let k = 0;
	while (true) {
		const [entry] = await connection.query<LintErrorDB[]>(
			`SELECT * FROM ${lang} LIMIT ${k}, 1`,
		);
		if (!entry) {
			break;
		}
		const {title} = entry,
			relevant = await select(connection, lang, title);
		k = relevant.at(-1)!.id;

		// article
		const info = relevant.map(({rule, startline, startcol, message, excerpt}) => [
			rule,
			startline + 1,
			startcol + 1,
			message,
			excerpt,
		] as const);
		writeArticle(info, title, relevant[0]!.timestamp);

		for (const rule of new Set(info.map(([r]) => r))) {
			// wiki
			wiki[rule] = (wiki[rule] ?? 0) + 1;

			// rule
			const [, line, col, message, excerpt] = info.find(([r]) => r === rule)!;
			updateRuleRecords(rule, title, line, col, message, excerpt);
		}
	}

	writeWiki((await getTimestampDB(connection, lang))!);
	await connection.end();
})();
