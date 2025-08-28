import {load, addLink} from './common';

declare const data: string[];

if (location.hostname !== 'lint-wiki-dumps.toolforge.org') {
	document.getElementById('api')!.style.display = 'none';
}

load('./data/index.js', () => {
	document.getElementById('container')!.append(...data.map(
		lang => addLink('div', `${lang}wiki`, `./wiki.html?lang=${lang}`),
	));
});
