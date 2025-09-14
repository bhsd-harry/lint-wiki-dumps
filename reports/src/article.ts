import {load, update, updateLink, addLink, insertRow, getErrorInfo} from './common';

declare const data: [string, number, number, string, string][] & {timestamp?: string};

(async () => {
	const search = new URLSearchParams(location.search),
		page = search.get('page')!,
		lang = search.get('lang')!,
		time = search.get('timestamp'),
		buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(page)),
		hash = [...new Uint8Array(buffer)].slice(0, 4)
			.map(b => b.toString(16).padStart(2, '0'))
			.join(''),
		base = `https://${
			lang === 'mediawiki' ? 'www.mediawiki.org' : `${lang}.wikipedia.org`
		}/wiki/${encodeURIComponent(page)}`,
		purge = document.getElementById('purge')!;
	update('title', page);
	updateLink('article', `${base}?redirect=no`, page);
	updateLink('edit', `${base}?action=edit`);
	updateLink('wiki', s => `${s}?lang=${lang}`, `${lang}wiki`);
	purge.addEventListener('click', () => {
		purge.style.pointerEvents = 'none';
		(async () => {
			const response = await fetch(
				`./purge/${lang}/${
					encodeURIComponent(page.replace(/ /gu, '_'))
				}`,
				{method: 'POST'},
			);
			if (response.ok) {
				const {timestamp} = await response.json();
				search.set('timestamp', timestamp as string);
				location.href = `./article.html?${search}`;
			} else {
				purge.style.pointerEvents = '';
			}
		})();
	});
	load(`./data/${lang}/pages/${hash}.js${time ? `?timestamp=${time}` : ''}`, () => {
		if (data.timestamp) {
			document.querySelector('time')!.textContent = `(${data.timestamp})`;
		}
		if (data.length === 0) {
			purge.style.display = 'none';
		} else {
			for (const [rule, startLine, startCol, message, excerpt] of data) {
				insertRow(
					addLink('td', rule, `./rule.html?lang=${lang}&rule=${rule}`, 'excerpt'),
					...getErrorInfo(startLine, startCol, message, excerpt),
				);
			}
		}
	});
})();
