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
			const buf = await fs.readFile(path.join(settings.output, file));
			const offset = 4*buf.readUInt32LE((id - interval_start)*4);
			const offset_end = id === interval_stop ? buf.length : 4*buf.readUInt32LE((id - interval_start + 1)*4);
			const slice = buf.slice(offset, offset_end);
			//const slice = Uint8Array.prototype.slice.call(buf, offset, offset_end);

			//console.log(offset, offset_end);

			//for (let off = 0; off<slice.length; off+=4)
			//	process.stdout.write(`${slice.readUInt32LE(off)} `);
			//process.stdout.write('\n');

			const ui32arr = new Uint32Array(slice.buffer, slice.byteOffset, slice.byteLength / Uint32Array.BYTES_PER_ELEMENT);
			process.stdout.write(Array.from(ui32arr).join(' '));
			process.stdout.write('\n');
			return ;
		}
	}
})();