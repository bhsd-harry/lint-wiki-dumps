'use strict';

(async () => {
	const /** @type {string[]} */ summary = await (await fetch('./summary.json')).json(),
		container = document.getElementById('container');
	container.append(...summary.map(s => {
		const a = document.createElement('a'),
			lang = s.slice(0, -4);
		a.href = `./wiki.html?lang=${lang}`;
		a.innerText = `${lang}.wikipedia.org`;
		return a;
	}));
})();
