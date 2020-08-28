#!/usr/bin/env node

const fs = require('promise-fs');
const settings = require('./settings');

(async () => {
	let sum = 0;
	const dir = (await fs.readdir(settings.output)).sort((a,b) => parseInt(a) - parseInt(b));
	let last = 0;
	for (const file of dir) {
		if (!file.endsWith('.db2'))
			continue;
		const [interval_start, interval_stop] = file.split('.')[0].split('-').map(x=>+x);
		sum += (interval_stop - interval_start);
		if (interval_start !== last)
			console.log(`[${Math.floor(sum/interval_stop*100)}%] MISSING ${last}-${interval_start}`);
		last = interval_stop;
	}
})();