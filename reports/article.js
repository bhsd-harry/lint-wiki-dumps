'use strict';

(async () => {
	const search = new URLSearchParams(location.search),
		page = search.get('page'),
		lang = search.get('lang'),
		buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(page)),
		hash = [...new Uint8Array(buffer)].slice(0, 4)
			.map(b => b.toString(16).padStart(2, '0'))
			.join(''),
		title = document.querySelector('title'),
		/** @type {HTMLAnchorElement} */ h2 = document.getElementById('article'),
		/** @type {HTMLAnchorElement} */ wiki = document.getElementById('wiki'),
		tbody = document.querySelector('tbody'),
		script = document.createElement('script');
	title.textContent = title.textContent.replace('Wikipedia', page);
	h2.textContent = page;
	h2.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
	wiki.textContent = `${lang}wiki`;
	wiki.href += `?lang=${lang}`;
	script.src = `./data/${lang}/pages/${hash}.js`;
	script.addEventListener('load', () => {
		for (const entry of globalThis.data) {
			/** @type {[string, number, number, string, string]} */
			const [rule, startLine, startCol, message, excerpt] = entry,
				tr = document.createElement('tr'),
				description = document.createElement('td'),
				line = document.createElement('td'),
				column = document.createElement('td'),
				detail = document.createElement('td'),
				notice = document.createElement('td'),
				descriptionLink = document.createElement('a');
			descriptionLink.textContent = rule;
			descriptionLink.href = `./rule.html?lang=${lang}&rule=${rule}`;
			description.className = 'excerpt';
			description.append(descriptionLink);
			line.textContent = startLine;
			column.textContent = startCol;
			detail.textContent = message;
			detail.className = 'excerpt';
			notice.textContent = excerpt;
			notice.className = 'excerpt mono';
			tr.append(description, line, column, detail, notice);
			tbody.append(tr);
		}
	});
	document.head.append(script);
})();
