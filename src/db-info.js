#!/usr/bin/env node

const fs = require('promise-fs');
const settings = require('./settings');
const path = require('path');

(async () => {
	const id = +process.argv.pop();
	if (!id)
		return console.log(`usage: ${process.argv[0]} GROUP_ID`);

	const dir = await fs.readdir(settings.output);

	for (const file of dir) {
		const [interval_start, interval_stop] = file.split('.')[0].split('-').map(x=>+x);
		if (id >= interval_start && id <= interval_stop) {
			const size = interval_stop - interval_start;
			const buf = await fs.readFile(path.join(settings.output, file));
			const offset = 4*buf.readUInt32LE((id - interval_start)*4);
			const offset_end = id === interval_stop ? buf.length : 4*buf.readUInt32LE((id - interval_start + 1)*4);

			console.log(`db: ${file}`);
			console.log(`size: ${size}`);
			console.log(`blocks: `, Array(size).fill(0).map((_,i) => 4*buf.readUInt32LE(i*4)));
			console.log(`g offset: `, offset);
			console.log(`g end: `, offset_end);
			console.log(`g length: ${(offset_end-offset)/4}`);

			return;
		}
	}
})();