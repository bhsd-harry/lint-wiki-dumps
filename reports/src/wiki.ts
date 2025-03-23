import type {LintError} from 'wikilint';

declare const data: [LintError.Rule, number][];

const lang = new URLSearchParams(location.search).get('lang'),
	script = document.createElement('script'),
	title = document.querySelector('title')!,
	h2 = document.querySelector('h2')!,
	tbody = document.querySelector('tbody')!;
h2.textContent = h2.textContent!.replace('Wikipedia', `${lang}.wikipedia.org`);
title.textContent = title.textContent!.replace('Wikipedia', `${lang}.wikipedia.org`);
script.src = `./data/${lang}/index.js`;
script.addEventListener('load', () => {
	for (const [rule, count] of data) {
		const tr = document.createElement('tr'),
			description = document.createElement('td'),
			pages = document.createElement('td'),
			a = document.createElement('a');
		a.textContent = rule;
		a.href = `./rule.html?lang=${lang}&rule=${rule}`;
		description.append(a);
		pages.textContent = String(count);
		tr.append(description, pages);
		tbody.append(tr);
	}
});
document.head.append(script);
