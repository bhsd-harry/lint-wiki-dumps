import {normalize} from './util';
import {createConnection, existTable, updateMetadata, dropTable} from './util-db';
import {ProcessorDB} from './processor-db';
import {parse} from './parser-common';

const [,, site,, refresh] = process.argv,
	lang = normalize(site!);

(async () => {
	const connection = await createConnection(),
		exist = await existTable(connection, lang);
	if (exist) {
		await connection.query(`RENAME TABLE ${lang} TO temp_${lang}`);
	}
	const processor = new ProcessorDB(site!, connection, exist, refresh);
	await processor.init();

	parse(processor, async () => {
		await updateMetadata(connection, lang, processor.latest!);
		await dropTable(connection, `temp_${lang}`);
		await connection.end();
	});
})();
