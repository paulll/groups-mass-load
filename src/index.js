const Promise = require('bluebird');
const redis = require('redis');
const fs = require('promise-fs');
const settings = require('./settings');
const {API} = require('@paulll/vklib');
const {SingleBar} = require('cli-progress');

Promise.promisifyAll(redis);

const api = new API({
	access_token: false,
	service_token: 'c8dbb40ac8dbb40ac8dbb40a64c8ebf155cc8dbc8dbb40a92df9d61ae3e1068cf1fa8e9'
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

(async () => {
	const redis_db = redis.createClient(settings.redis_url);
	const start_time = Date.now();

	let stat_groups_loaded = 0;
	let stat_groups_size = 0;

	let keep_running = true;
	let force_exit = false;

	const progress = new SingleBar({
		format: 'chunk {chunk} |{bar}| {percentage}% | {value}/{total} | rps: {rps} | avg: {avg} | queue: {queue}',
		barCompleteChar: '\u2588',
		barIncompleteChar: '\u2591',
		hideCursor: true
	});

	let lastBlock;
	try {
		lastBlock = JSON.parse(await fs.readFile(settings.last_block_file, {encoding: 'utf8'}));
	} catch (e) {
		lastBlock = null;
	}

	const exit = () => {
		if (force_exit) {
			progress.stop();
			process.exit();
		}
		console.log(`\n[!] Ждем завершения последнего блока. Нажмите ^C повторно для принудительного завершения`);
		keep_running = false;
		force_exit = true;
	};

	const getTasks = async (amount) => {
		if (lastBlock) {
			const tempBlock = lastBlock;
			lastBlock = null;
			return tempBlock;
		}
		const offset = await redis_db.incrbyAsync(settings.redis_key, amount);
		if (offset > 500000000) {
			console.log('Дело сделано. Вроде');
			progress.stop();
			process.exit();
		}
		return {start: offset-amount, amount};
	};

	process.on('SIGTERM', exit);
	process.on('SIGINT', exit);

	const get_payload = () => ({
		rps: Math.round(api.stats.requests() / ((Date.now() - start_time)/1000)),
		avg: Math.round(stat_groups_size / stat_groups_loaded),
		queue: api.stats.queue()
	});

	setInterval(() => {
		progress.update(progress.value, get_payload())
	}, 40);

	for(let chunk= 0; keep_running; ++chunk) {
		const task = await getTasks(settings.groups_per_block);
		await fs.writeFile(settings.last_block_file, JSON.stringify(task));
		const index = new Uint32Array(task.amount);
		progress.start(task.amount, 0, {chunk: `${chunk}#${task.start}`, ...get_payload()});
		const block = await Promise.all(Array(task.amount).fill(0).map(async (_, i) => {
			const group = new Uint32Array(await loadGroup(task.start + i));
			stat_groups_loaded++;
			stat_groups_size += group.length;
			progress.increment(1, get_payload());
			return group;
		}));
		let cursor = index.length;
		block.map((g,i) => {
			index[i] = cursor;
			cursor += g.length;
		});
		const buffer = Buffer.concat([
			Buffer.from(index.buffer, index.byteOffset, index.byteLength),
			...block.map(g =>
				Buffer.from(g.buffer, g.byteOffset, g.byteLength)
			)
		]);
		await fs.writeFile(`${settings.output}/${task.start}-${task.start+task.amount}.db2`, buffer);
		await fs.unlink(settings.last_block_file);
	}

	progress.stop();
	redis_db.quit();
	process.exit(0);
})();
