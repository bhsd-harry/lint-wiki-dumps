'use strict';

const script = document.createElement('script');
script.src = './data/index.js';
script.addEventListener('load', () => {
	const container = document.getElementById('container');
	container.append(...globalThis.data.map(lang => {
		const a = document.createElement('a');
		a.href = `./wiki.html?lang=${lang}`;
		a.innerText = `${lang}.wikipedia.org`;
		return a;
	}));
});
document.head.append(script);
