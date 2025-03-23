declare interface Window {
	data: string[];
}

(() => {
	const container = document.getElementById('container')!,
		script = document.createElement('script');
	script.src = './data/index.js';
	script.addEventListener('load', () => {
		container.append(...window.data.map(lang => {
			const div = document.createElement('div'),
				a = document.createElement('a');
			a.href = `./wiki.html?lang=${lang}`;
			a.innerText = `${lang}.wikipedia.org`;
			div.append(a);
			return div;
		}));
	});
	document.head.append(script);
})();
