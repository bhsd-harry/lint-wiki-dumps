'use strict';

const lang = new URLSearchParams(location.search).get('lang'),
	script = document.createElement('script');
script.src = `./data/${lang}/index.js`;
script.addEventListener('load', () => {
	const title = document.querySelector('title'),
		h2 = document.querySelector('h2');
	h2.textContent = h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	const tbody = document.querySelector('tbody');
	for (const entry of globalThis.data) {
		const /** @type {[string, number]} */ [rule, count] = entry,
			tr = document.createElement('tr'),
			description = document.createElement('td'),
			pages = document.createElement('td'),
			a = document.createElement('a');
		a.textContent = rule;
		a.href = `./rule.html?lang=${lang}&rule=${rule}`;
		description.append(a);
		pages.textContent = count;
		tr.append(description, pages);
		tbody.append(tr);
	}
});
document.head.append(script);
