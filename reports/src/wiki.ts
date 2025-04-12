import {load, update, addLink, createTd, insertRow} from './common';

declare const data: [...[string, number][], string];

const lang = new URLSearchParams(location.search).get('lang'),
	h2 = update('h2', `${lang}wiki`);
update('title', `${lang}wiki`);
load(`./data/${lang}/index.js`, () => {
	h2.textContent += ` (${data[data.length - 1] as string})`;
	for (const [rule, count] of data.slice(0, -1) as [string, number][]) {
		insertRow(
			addLink('td', rule, `./rule.html?lang=${lang}&rule=${rule}`),
			createTd(String(count)),
		);
	}
});
