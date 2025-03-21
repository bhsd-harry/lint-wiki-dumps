'use strict';

(async () => {
	const /** @type {string[]} */ summary = await (await fetch('./summary.json')).json(),
		search = new URLSearchParams(location.search),
		page = search.get('page');
	let lang = search.get('lang');
	if (!summary.includes(`${lang}wiki`)) {
		lang = summary[0].slice(0, -4);
	}
	const title = document.querySelector('title'),
		/** @type {HTMLAnchorElement} */ h2 = document.getElementById('article'),
		/** @type {HTMLAnchorElement} */ wiki = document.getElementById('wiki');
	title.textContent = title.textContent.replace('Wikipedia', page);
	h2.textContent = page;
	h2.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
	wiki.textContent = `${lang}wiki`;
	wiki.href += `?lang=${lang}`;
	/** @type {Record<string, (import('wikilint').LintError & {excerpt: string})[]>} */
	const results = await (await fetch(`./results/${lang}wiki.json`)).json(),
		/** @type {(import('wikilint').LintError & {excerpt: string})[]} */ errors = results[page] || [],
		rules = [...new Set(errors.map(({rule: r}) => r))].sort((a, b) => a.localeCompare(b)),
		tbody = document.querySelector('tbody');
	for (const rule of rules) {
		const tr = document.createElement('tr'),
			error = document.createElement('td'),
			description = document.createElement('td'),
			line = document.createElement('td'),
			column = document.createElement('td'),
			notice = document.createElement('td'),
			descriptionLink = document.createElement('a'),
			related = errors.filter(({rule: r}) => r === rule),
			[{startLine, startCol, excerpt}] = related;
		error.textContent = related.length;
		descriptionLink.textContent = rule;
		descriptionLink.href = `./rule.html?lang=${lang}&rule=${rule}`;
		description.className = 'excerpt';
		description.append(descriptionLink);
		line.textContent = startLine + 1;
		column.textContent = startCol + 1;
		notice.textContent = excerpt;
		notice.className = 'excerpt';
		tr.append(error, description, line, column, notice);
		tbody.append(tr);
	}
})();
