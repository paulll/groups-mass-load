#!/usr/bin/env node

const fs = require('promise-fs');
const settings = require('./settings');
const path = require('path');
const {API} = require('@paulll/vklib');
const delay = duration => new Promise(resolve => setTimeout(resolve, duration));
const {SingleBar} = require('cli-progress');

const api = new API({
	access_token: false,
	service_token: 'c8dbb40ac8dbb40ac8dbb40a64c8ebf155cc8dbc8dbb40a92df9d61ae3e1068cf1fa8e9',
	threads: settings.fibers
});

const loadGroup = async (group) => {
	try {
		const members = await api.fetch('groups.getMembers',
			{v: 5.92, group_id: group, count: 1000}, {limit: Infinity, parallel: true});
		if (members)
			return members;
		return [];
	} catch (e) {
		console.log(e);
		return [];
	}
};

const queue = [];
for (let i = 0; i < 50; ++i) {
	(async () => {
		while(!queue.length)
			await delay(100);
		while(queue.length)
			await queue.shift()();
	})();
}

const progress = new SingleBar({
	format: ' {percentage}% {bar}| {value}/{total} | failed: ${failed}',
	barCompleteChar: '\u2588',
	barIncompleteChar: '\u2591',
	hideCursor: true
});


(async () => {
	const dir = (await fs.readdir(settings.output)).sort((a,b) => parseInt(b) - parseInt(a));
	let failed = 0;
	progress.start(dir.length, 0, {failed});
	for (const file of dir) {
		if (!file.endsWith('.db2'))
			continue;
		const [interval_start, interval_stop] = file.split('.')[0].split('-').map(x=>+x);
		queue.push(async () => {
			const size = interval_stop - interval_start;
			const to_check = Math.floor(Math.random() * size) + interval_start;
			const buf = await fs.readFile(path.join(settings.output, file));
			const offset = 4*buf.readUInt32LE((to_check - interval_start)*4);
			const offset_end = to_check === interval_stop ? buf.length : 4*buf.readUInt32LE((to_check - interval_start + 1)*4);
			const slice = buf.slice(offset, offset_end);
			const ui32arr = new Uint32Array(slice.buffer, slice.byteOffset, slice.byteLength / Uint32Array.BYTES_PER_ELEMENT);

			const actual = new Set(await loadGroup(to_check));
			const stored = new Set(ui32arr);
			const sum = new Set([...actual, ...stored]);
			const diff = new Set(Array.from(sum).filter(x => actual.has(x) ^ stored.has(x) ));
			const k = sum.size && diff.size/sum.size;

			progress.increment(1, {failed: failed+=(k>0.2)});
			if (k > 0.2)
				console.log(`\nsignificant difference. gid: ${to_check}, diff: ${diff.size}, k: ${k}`);
		});
	}
})();