import {createServer} from 'http';
import path from 'path';
import fs from 'fs';

const port = parseInt(process.env['PORT'] || '8000');

createServer(({url}, res) => {
	if (!url || url === '/') {
		url = 'index.html'; // eslint-disable-line no-param-reassign
	}
	const file = new URL(`http://localhost/${path.join('reports', url)}`).pathname.slice(1),
		ext = path.extname(file);
	let contentType: string;
	switch (ext) {
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
}).listen(port);
