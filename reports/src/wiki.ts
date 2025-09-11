import {load, update, addLink, createTd, insertRow} from './common';

declare const data: [string, number][] & {timestamp?: string};

const lang = new URLSearchParams(location.search).get('lang'),
	h2 = update('h2', `${lang}wiki`);
update('title', `${lang}wiki`);
load(`./data/${lang}/index.js`, () => {
	if (data.timestamp) {
		h2.textContent += ` (${data.timestamp})`;
	}
	for (const [rule, count] of data) {
		insertRow(
			addLink('td', rule, `./rule.html?lang=${lang}&rule=${rule}`),
			createTd(String(count)),
		);
	}
});
