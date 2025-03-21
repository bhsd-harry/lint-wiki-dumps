'use strict';

(async () => {
	const search = new URLSearchParams(location.search),
		page = search.get('page'),
		lang = search.get('lang'),
		buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(page)),
		hash = [...new Uint8Array(buffer)].slice(0, 4)
			.map(b => b.toString(16).padStart(2, '0'))
			.join(''),
		script = document.createElement('script');
	script.src = `./data/${lang}/pages/${hash}.js`;
	script.addEventListener('load', () => {
		const title = document.querySelector('title'),
			/** @type {HTMLAnchorElement} */ h2 = document.getElementById('article'),
			/** @type {HTMLAnchorElement} */ wiki = document.getElementById('wiki');
		title.textContent = title.textContent.replace('Wikipedia', page);
		h2.textContent = page;
		h2.href = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page)}?redirect=no`;
		wiki.textContent = `${lang}wiki`;
		wiki.href += `?lang=${lang}`;
		const tbody = document.querySelector('tbody');
		for (const entry of globalThis.data) {
			/** @type {[number, string, number, number, string]} */
			const [count, rule, startLine, startCol, excerpt] = entry,
				tr = document.createElement('tr'),
				error = document.createElement('td'),
				description = document.createElement('td'),
				line = document.createElement('td'),
				column = document.createElement('td'),
				notice = document.createElement('td'),
				descriptionLink = document.createElement('a');
			error.textContent = count;
			descriptionLink.textContent = rule;
			descriptionLink.href = `./rule.html?lang=${lang}&rule=${rule}`;
			description.className = 'excerpt';
			description.append(descriptionLink);
			line.textContent = startLine;
			column.textContent = startCol;
			notice.textContent = excerpt;
			notice.className = 'excerpt';
			tr.append(error, description, line, column, notice);
			tbody.append(tr);
		}
	});
	document.head.append(script);
})();
