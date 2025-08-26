import {createServer} from 'http';
import path from 'path';
import fs from 'fs';
import Parser from 'wikilint';
import {getHash, lint, write} from './util';

declare interface APIResponse {
	status: 'success' | 'error';
	timestamp?: string;
}
declare const data: [string, number, number, string, string][];

const port = parseInt(process.env['PORT'] || '8000'),
	headers = {
		'content-type': 'application/json',
		'x-content-type-options': 'nosniff',
		'cache-control': 'max-age=5',
	},
	cacheControl = `max-age=${60 * 60 * 24}, public`,
	jsonHeaders = {
		...headers,
		'cache-control': cacheControl,
	};
let busy = false;

const getTitle = (page: string): string => decodeURIComponent(page).replaceAll('_', ' '),
	getJS = (lang: string, title: string): string => `${getHash(lang, title)}.js`,
	getFilePath = (hash: string): string => path.join('reports', 'data', hash);

createServer(({url}, res) => {
	if (!url || url === '/') {
		url = 'index.html'; // eslint-disable-line no-param-reassign
	}
	const file = new URL(path.join('reports', url), 'http://localhost').pathname.slice(1);
	if (file.startsWith('reports/purge/')) {
		const [,, lang, page] = file.split('/');
		(async () => {
			const obj: APIResponse = {status: 'error'};
			let code = 400;
			if (busy) {
				code = 503;
			} else if (lang && page) {
				busy = true;
				try {
					const response = await fetch(
							`https://${lang}.wikipedia.org/w/rest.php/v1/page/${page}`,
							{
								headers: {
									'User-Agent':
										'tools.lint-wiki-dumps (https://github.com/bhsd-harry/lint-wiki-dumps)',
								},
							},
						),
						title = getTitle(page);
					code = response.status;
					console.log(`Purging ${lang}wiki: ${title}; status: ${code}`);
					if (code === 200) {
						const {source, content_model: contentModel, latest: {timestamp}} = await response.json();
						if (contentModel === 'wikitext') {
							Parser.config = `${lang}wiki`;
							const errors = lint(source as string)
									.map(({rule, startLine, startCol, message, excerpt}) => [
										rule,
										startLine + 1,
										startCol + 1,
										message,
										excerpt,
									] as const),
								hash = getJS(lang, title),
								filepath = getFilePath(hash);
							console.log(`Remaining errors in ${hash}: ${errors.length}`);
							write(filepath, errors);
							obj.status = 'success';
							obj.timestamp = timestamp;
						} else {
							code = 400;
						}
					}
				} catch {
					code = 500;
				}
				busy = false; // eslint-disable-line require-atomic-updates
			}
			res.writeHead(code, headers);
			res.end(JSON.stringify(obj), 'utf8');
		})();
	} else if (file.startsWith('reports/api/')) {
		const [,, lang, page] = file.split('/');
		if (lang && page) {
			const title = getTitle(page),
				filePath = getFilePath(getJS(lang, title)),
				json = {language: lang, title};
			res.writeHead(200, jsonHeaders);
			if (fs.existsSync(filePath)) {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				require(path.resolve('.', filePath));
				res.end(
					JSON.stringify({
						...json,
						errors: data.map(([rule, line, col, msg]) => ({rule, line, col, msg})),
					}),
					'utf8',
				);
			} else {
				res.end(JSON.stringify({...json, errors: []}), 'utf8');
			}
		} else {
			res.writeHead(400, jsonHeaders);
			res.end(JSON.stringify({error: `Missing ${lang ? 'page name' : 'language code'}`}), 'utf8');
		}
	} else {
		let contentType: string;
		switch (path.extname(file)) {
			case '.js':
				contentType = 'text/javascript';
				break;
			case '.css':
				contentType = 'text/css';
				break;
			default:
				contentType = 'text/html';
		}
		if (fs.existsSync(file)) {
			res.writeHead(200, {
				'content-type': contentType,
				'x-content-type-options': 'nosniff',
				'cache-control': cacheControl,
			});
			res.end(fs.readFileSync(file), 'utf8');
		} else {
			res.writeHead(301, {Location: '/'});
			res.end();
		}
	}
}).listen(port);
