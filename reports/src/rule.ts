import {load, update, addLink, insertRow, getErrorInfo, updateLink} from './common';

declare const data: {
	articles: [string, number, number, string, string][];
	batches: number;
	timestamp: string;
};

const search = new URLSearchParams(location.search),
	lang = search.get('lang'),
	rule = search.get('rule'),
	batch = Math.floor(Number(search.get('start') || 0) / 200),
	h2 = update('h2', `${lang}wiki: ${rule}`);
update('title', `${lang}wiki`);
updateLink('wiki', s => `${s}?lang=${lang}`, `${lang}wiki`);
search.set('start', String((batch - 1) * 200));
updateLink('prev', batch !== 0 && `${location.pathname}?${search}`);
document.getElementById('start')!.textContent = String(batch * 200 + 1);
load(`./data/${lang}/${rule}-${batch}.js`, () => {
	const endStr = String(batch * 200 + data.articles.length);
	h2.textContent += ` (${data.timestamp})`;
	document.getElementById('end')!.textContent = endStr;
	search.set('start', endStr);
	updateLink('next', data.batches !== batch + 1 && `${location.pathname}?${search}`);
	document.querySelector('table')!
		.after(document.getElementById('nav')!.cloneNode(true));
	for (const [page, startLine, startCol, message, excerpt] of data.articles) {
		const title = encodeURIComponent(page);
		insertRow(
			addLink('td', page, `./article.html?lang=${lang}&page=${title}`, 'excerpt'),
			...getErrorInfo(startLine, startCol, message, excerpt),
		);
	}
});
