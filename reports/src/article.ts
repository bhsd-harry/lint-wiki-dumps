import {load, getHost, update, updateLink, addLink, insertRow, getErrorInfo} from './common';

declare const data: [string, number, number, string, string][];

(async () => {
	const search = new URLSearchParams(location.search),
		page = search.get('page')!,
		lang = search.get('lang')!,
		buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(page)),
		hash = [...new Uint8Array(buffer)].slice(0, 4)
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');
	update('title', page);
	updateLink('article', `https://${getHost(lang)}/wiki/${encodeURIComponent(page)}?redirect=no`, page);
	updateLink('wiki', s => `${s}?lang=${lang}`, `${lang}wiki`);
	load(`./data/${lang}/pages/${hash}.js`, () => {
		for (const [rule, startLine, startCol, message, excerpt] of data) {
			insertRow(
				addLink('td', rule, `./rule.html?lang=${lang}&rule=${rule}`, 'excerpt'),
				...getErrorInfo(startLine, startCol, message, excerpt),
			);
		}
	});
})();
