const armorLink = (a: HTMLAnchorElement, href: string): void => {
	a.href = href;
	if (href.startsWith('https://')) {
		a.target = '_blank';
		a.rel = 'noopener';
	}
};

export const load = (src: string, callback: () => void): void => {
	const script = document.createElement('script');
	script.src = src;
	script.addEventListener('load', callback);
	document.head.append(script);
};

export const update = (tag: string, replace: string): Element => {
	const ele = document.querySelector(tag)!;
	ele.textContent = ele.textContent!.replace('Wikipedia', replace);
	return ele;
};

export const updateLink = (id: string, href: string | ((s: string) => string) | false, text?: string): void => {
	const a = document.getElementById(id) as HTMLAnchorElement;
	if (typeof href === 'function') {
		a.href = href(a.href);
	} else if (href) {
		armorLink(a, href);
	} else {
		a.removeAttribute('href');
	}
	if (text !== undefined) {
		a.textContent = text;
	}
};

export const addLink = (tag: string, text: string, href: string, className?: string): HTMLElement => {
	const container = document.createElement(tag),
		a = document.createElement('a');
	a.textContent = text;
	armorLink(a, href);
	container.append(a);
	if (className) {
		container.className = className;
	}
	return container;
};

export const createTd = (text: string, className?: string): HTMLTableCellElement => {
	const td = document.createElement('td');
	td.textContent = text;
	if (className) {
		td.className = className;
	}
	return td;
};

export const insertRow = (...tds: HTMLElement[]): void => {
	const tr = document.createElement('tr');
	tr.append(...tds);
	document.querySelector('tbody')!.append(tr);
};

export const getErrorInfo = (
	startLine: number,
	startCol: number,
	message: string,
	excerpt: string,
): [HTMLTableCellElement, HTMLTableCellElement, HTMLTableCellElement, HTMLTableCellElement] => [
	createTd(String(startLine)),
	createTd(String(startCol)),
	createTd(message, 'excerpt'),
	createTd(excerpt, 'excerpt mono'),
];
