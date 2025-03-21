'use strict';

(async () => {
	const /** @type {string[]} */ summary = await (await fetch('./summary.json')).json(),
		search = new URLSearchParams(location.search),
		rule = search.get('rule');
	let lang = search.get('lang');
	if (!summary.includes(`${lang}wiki`)) {
		lang = summary[0].slice(0, -4);
	}
	const title = document.querySelector('title'),
		h2 = document.querySelector('h2'),
		/** @type {HTMLAnchorElement} */ wiki = document.getElementById('wiki');
	h2.textContent = h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org: ${rule}`);
	title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	wiki.textContent = `${lang}wiki`;
	wiki.href += `?lang=${lang}`;
	/** @type {Record<string, (import('wikilint').LintError & {excerpt: string})[]>} */
	const results = await (await fetch(`./results/${lang}wiki.json`)).json(),
		articles = Object.entries(results).filter(([, errors]) => errors.some(({rule: r}) => r === rule))
			.sort(([a], [b]) => a.localeCompare(b)),
		tbody = document.querySelector('tbody');
	for (const [page, errors] of articles) {
		const tr = document.createElement('tr'),
			article = document.createElement('td'),
			edit = document.createElement('td'),
			line = document.createElement('td'),
			column = document.createElement('td'),
			notice = document.createElement('td'),
			more = document.createElement('td'),
			articleLink = document.createElement('a'),
			editLink = document.createElement('a'),
			moreLink = document.createElement('a'),
			/** @type {import('wikilint').LintError & {excerpt: string}} */
			{startLine, startCol, excerpt} = errors.find(({rule: r}) => r === rule);
		articleLink.textContent = page;
		articleLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
		article.className = 'excerpt';
		article.append(articleLink);
		editLink.textContent = 'edit';
		editLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?action=edit`;
		edit.append(editLink);
		line.textContent = startLine + 1;
		column.textContent = startCol + 1;
		notice.textContent = excerpt;
		notice.className = 'excerpt';
		moreLink.textContent = 'more';
		moreLink.href = `./article.html?lang=${lang}&page=${encodeURIComponent(page)}`;
		more.append(moreLink);
		tr.append(article, edit, line, column, notice, more);
		tbody.append(tr);
	}
})();
