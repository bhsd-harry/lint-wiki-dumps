'use strict';

(async () => {
	const /** @type {string[]} */ summary = await (await fetch('./summary.json')).json();
	let lang = new URLSearchParams(location.search).get('lang');
	if (!summary.includes(`${lang}wiki`)) {
		lang = summary[0].slice(0, -4);
	}
	const title = document.querySelector('title'),
		h2 = document.querySelector('h2');
	h2.textContent = h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	/** @type {Record<string, (import('wikilint').LintError & {excerpt: string})[]>} */
	const results = await (await fetch(`./results/${lang}wiki.json`)).json(),
		values = Object.values(results),
		rules = [...new Set(values.flat().map(({rule}) => rule))].sort((a, b) => a.localeCompare(b)),
		tbody = document.querySelector('tbody');
	for (const rule of rules) {
		const tr = document.createElement('tr'),
			description = document.createElement('td'),
			pages = document.createElement('td'),
			a = document.createElement('a');
		a.textContent = rule;
		a.href = `./rule.html?lang=${lang}&rule=${rule}`;
		description.append(a);
		pages.textContent = values.filter(errors => errors.some(({rule: r}) => r === rule)).length;
		tr.append(description, pages);
		tbody.append(tr);
	}
})();
