import {createServer} from 'http';
import path from 'path';
import fs from 'fs';
import Parser from 'wikilint';
import {getHash, lint, write} from './util';

declare interface APIResponse {
	status: 'success' | 'error';
	timestamp?: string;
}

const port = parseInt(process.env['PORT'] || '8000'),
	headers = {
		'content-type': 'application/json',
		'x-content-type-options': 'nosniff',
		'cache-control': 'max-age=5',
	};
let busy = false;

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
							`https://${
								lang === 'mediawiki' ? 'www.mediawiki.org' : `${lang}.wikipedia.org`
							}/w/rest.php/v1/page/${page}`,
							{
								headers: {
									'Api-User-Agent':
										'tools.lint-wiki-dumps (https://github.com/bhsd-harry/lint-wiki-dumps)',
								},
							},
						),
						title = decodeURIComponent(page).replaceAll('_', ' ');
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
								hash = `${getHash(lang, title)}.js`,
								filepath = path.join('reports', 'data', hash);
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
				'cache-control': `max-age=${60 * 60 * 24}, public`,
			});
			res.end(fs.readFileSync(file), 'utf8');
		} else {
			res.writeHead(301, {Location: '/'});
			res.end();
		}
	}
}).listen(port);
