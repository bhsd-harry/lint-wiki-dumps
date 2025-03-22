'use strict';

const search = new URLSearchParams(location.search),
	lang = search.get('lang'),
	rule = search.get('rule'),
	script = document.createElement('script');
script.src = `./data/${lang}/${rule}.js`;
script.addEventListener('load', () => {
	const title = document.querySelector('title'),
		h2 = document.querySelector('h2'),
		/** @type {HTMLAnchorElement} */ wiki = document.getElementById('wiki');
	h2.textContent = h2.textContent.replace('Wikipedia', `${lang}.wikipedia.org: ${rule}`);
	title.textContent = title.textContent.replace('Wikipedia', `${lang}.wikipedia.org`);
	wiki.textContent = `${lang}wiki`;
	wiki.href += `?lang=${lang}`;
	/** @type {Record<string, (import('wikilint').LintError & {excerpt: string})[]>} */
	const tbody = document.querySelector('tbody');
	for (const entry of globalThis.data) {
		const /** @type {[string, number, number, string]} */ [page, startLine, startCol, excerpt] = entry,
			tr = document.createElement('tr'),
			article = document.createElement('td'),
			edit = document.createElement('td'),
			line = document.createElement('td'),
			column = document.createElement('td'),
			notice = document.createElement('td'),
			more = document.createElement('td'),
			articleLink = document.createElement('a'),
			editLink = document.createElement('a'),
			moreLink = document.createElement('a');
		articleLink.textContent = page;
		articleLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
		article.className = 'excerpt';
		article.append(articleLink);
		editLink.textContent = 'edit';
		editLink.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?action=edit`;
		edit.append(editLink);
		line.textContent = startLine;
		column.textContent = startCol;
		notice.textContent = excerpt;
		notice.className = 'excerpt';
		moreLink.textContent = 'more';
		moreLink.href = `./article.html?lang=${lang}&page=${encodeURIComponent(page)}`;
		more.append(moreLink);
		tr.append(article, edit, line, column, notice, more);
		tbody.append(tr);
	}
});
document.head.append(script);
