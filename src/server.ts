import {createServer} from 'http';
import path from 'path';
import fs from 'fs';
import Parser from 'wikilint';
import {getHash, lint, write, getTimestamp} from './common';
import type {ServerResponse} from 'http';

declare type APIResponse = {
	status: 'error';
	reason?: string;
	language: string | undefined;
	title: string;
} | {
	status: 'success';
	language: string;
	title: string;
	timestamp: string;
} | {
	status: 'success';
	language: string;
	title: string;
	errors: {rule: string, line: number, col: number, msg: string}[];
	timestamp?: string;
} | {
	status: 'success';
	languages: string[];
};
declare const data: [string, number, number, string, string][] & {timestamp?: string};

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

const getPage = (file: string): [string | undefined, string] => {
		const [,, lang, ...parts] = file.split('/');
		return [lang, parts.join('/')];
	},
	getTitle = (page: string): string => decodeURIComponent(page).replaceAll('_', ' '),
	getJS = (lang: string, title: string): string => `${getHash(lang, title)}.js`,
	getFilePath = (hash: string): string => path.join('reports', 'data', hash),
	end = (res: ServerResponse, json: APIResponse): void => {
		res.end(JSON.stringify(json), 'utf8');
	};

createServer(({url, method}, res) => {
	if (!url || url === '/') {
		url = 'index.html'; // eslint-disable-line no-param-reassign
	}
	const file = new URL(path.join('reports', url), 'http://localhost').pathname.slice(1);
	if (file.startsWith('reports/purge/')) {
		const [language, page] = getPage(file);
		(async () => {
			const title = getTitle(page);
			let json: APIResponse = {language, title, status: 'error'},
				code = 400;
			if (busy) {
				code = 503;
				json.reason = 'Server busy, try again later';
			} else if (method !== 'POST') {
				code = 405;
				json.reason = 'Only POST requests are allowed';
			} else if (language && page) {
				if (fs.existsSync(path.join('reports', 'data', language))) {
					busy = true;
					try {
						const curtimestamp = getTimestamp(new Date()),
							response = await fetch(
								`https://${language}.wikipedia.org/w/rest.php/v1/page/${page}`,
								{
									headers: {
										'User-Agent':
											'tools.lint-wiki-dumps (https://github.com/bhsd-harry/lint-wiki-dumps)',
									},
								},
							);
						code = response.status;
						console.log(`Purging ${language}wiki: ${title}; status: ${code}`);
						if (code === 200) {
							const {source, content_model: contentModel, latest: {timestamp}} = await response.json();
							if (contentModel === 'wikitext') {
								Parser.config = `${language}wiki`;
								const errors = lint(source as string, title)
										.map(({rule, startLine, startCol, message, excerpt}) => [
											rule,
											startLine + 1,
											startCol + 1,
											message,
											excerpt,
										] as const),
									hash = getJS(language, title),
									filepath = getFilePath(hash);
								console.log(`Remaining errors in ${hash}: ${errors.length}`);
								write(filepath, errors, curtimestamp);
								json = {language, title, status: 'success', timestamp};
							} else {
								code = 400;
								json.reason = `Unhandled content model: ${contentModel}`;
							}
						}
					} catch {
						code = 500;
						json = {language, title, status: 'error', reason: 'Internal server error'};
					}
					busy = false; // eslint-disable-line require-atomic-updates
				} else {
					json.reason = 'Unscanned language edition';
				}
			} else {
				json.reason = `Missing ${language ? 'page name' : 'language code'}`;
			}
			res.writeHead(code, {...headers, allow: 'POST'});
			end(res, json);
		})();
	} else if (file.startsWith('reports/api/')) {
		const [language, page] = getPage(file);
		if (language === 'available') {
			const languages = fs.readdirSync(path.join('reports', 'data'), {withFileTypes: true})
					.filter(dir => dir.isDirectory() && !dir.name.startsWith('.'))
					.map(({name}) => name),
				json: APIResponse = {status: 'success', languages};
			res.writeHead(200, jsonHeaders);
			end(res, json);
			return;
		}
		const title = getTitle(page);
		let json: APIResponse = {language, title, status: 'error'},
			code = 400;
		if (language && page) {
			if (fs.existsSync(path.join('reports', 'data', language))) {
				const filePath = getFilePath(getJS(language, title));
				code = 200;
				json = {language, title, status: 'success', errors: []};
				if (fs.existsSync(filePath)) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					require(path.resolve('.', filePath));
					json.errors = data.map(([rule, line, col, msg]) => ({rule, line, col, msg}));
					if (data.timestamp) {
						json.timestamp = data.timestamp;
					}
				}
			} else {
				json.reason = 'Unscanned language edition';
			}
		} else {
			json.reason = `Missing ${language ? 'page name' : 'language code'}`;
		}
		res.writeHead(code, jsonHeaders);
		end(res, json);
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
