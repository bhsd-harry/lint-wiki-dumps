import fs from 'fs';
import path from 'path';
import {getResultDir, handleResults} from './util';
import {wiki, writeSummary, writeArticle, updateRuleRecords, writeWiki} from './report-common';
import type {LintError as LintErrorBase} from 'wikilint';
import type {LintError} from './common';

const {argv} = process,
	[,, lang,, temp] = argv,
	resultDir = getResultDir(temp);

const dir = fs.readdirSync(resultDir),
	summary = new Set<string>();
let latest: Date | undefined;

const before = (date: Date): void => {
	latest = !latest || date > latest ? date : latest;
};
const each = (page: string, errors: LintError[]): void => {
	const rules = new Set<string>(),
		info: (readonly [LintErrorBase.Rule, number, number, string, string])[] = [];
	for (const {rule, startLine, startCol, message, excerpt} of errors) {
		// article
		const line = startLine + 1,
			col = startCol + 1;
		info.push([rule, line, col, message, excerpt]);

		// wiki
		if (!(rule in wiki)) {
			wiki[rule] = 0;
		}

		// rule
		if (!rules.has(rule)) {
			rules.add(rule);
			wiki[rule]!++;
			updateRuleRecords(rule, page, line, col, message, excerpt);
		}
	}
	writeArticle(info, page, latest!);
};

(async () => {
	for (const file of dir) {
		if (!file.endsWith('.json')) {
			continue;
		}
		const fileDir = path.join(resultDir, file),
			k = file.search(/-(?:p\d+){2}\.json$/u),
			site = (k === -1 ? file.slice(0, -5) : file.slice(0, k))
				.replaceAll('_', '-');
		summary.add(site);
		if (lang === site) {
			await handleResults(fileDir, each, before);
		}
	}
	writeSummary(summary);
	writeWiki(latest!);
})();
