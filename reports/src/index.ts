import {load, addLink} from './common';

declare const data: string[];

load('./data/index.js', () => {
	document.getElementById('container')!.append(...data.map(
		lang => addLink('div', `${lang}wiki`, `./wiki.html?lang=${lang}`),
	));
});
