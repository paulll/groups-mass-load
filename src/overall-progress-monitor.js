#!/usr/bin/env node

const Promise = require('bluebird');
const redis = require('redis');
const settings = require('./settings');
const {SingleBar} = require('cli-progress');
const movingAverages = require('moving-averages');
const fs = require('promise-fs');

Promise.promisifyAll(redis);

(async () => {
	let activityByClient = new Map; // client_id : [[time, r], [time, r], ...]

	try {
		const activity = JSON.parse(await fs.readFile(settings.stats_file, {encoding: 'utf-8'}));
		activityByClient = new Map(activity);
	} catch (e) {
		activityByClient = new Map;
	}

	const redis_db = redis.createClient(settings.redis_url);
	const total_groups = 186689865;
	const start_value = +(await redis_db.getAsync(settings.redis_key));
	const speed_window = 60*10*1000; // 10 minutes
	const start_time = Date.now();
	const last_values = Array(speed_window/1000).fill(start_value);

	let current_value = start_value;

	const progress = new SingleBar({
		format: ' {percentage}% |{bar}| {value}/{total} | g/s: {speed} | online: {online}',
		barCompleteChar: '\u2588',
		barIncompleteChar: '\u2591',
		hideCursor: true
	});

	await redis_db.monitor();
	redis_db.on("monitor", (t, c, raw_reply) => {
		const [time, _, client, command, ...args] = raw_reply.split(' ');
		if (command === '"incrby"') {
			const delta = 1*args[1].slice(1, -1);
			const client_id = client.split(':')[0];
			if (!activityByClient.has(client_id)) {
				activityByClient.set(client_id, [[Date.now(), delta]]);
			} else {
				const list = activityByClient.get(client_id);
				list.push([Date.now(), delta]);
				while(list[0][0] + speed_window < Date.now())
					list.unshift();
			}
			current_value += delta;
			progress.update(current_value, {online: activityByClient.size})
		}
	});

	setInterval(() => {
		for (const [clid, activity] of activityByClient) {
			while (activity[0][0] + speed_window < Date.now())
				activity.unshift();
			if (!activity.length)
				activityByClient.delete(clid);
		}
	}, 500);

	setInterval(async () => {
		last_values.shift();
		last_values.push(current_value);
		const dt = Math.min(Math.round((Date.now() - start_time)/1000), speed_window);
		const avg = movingAverages.ema(last_values.map((x,i)=>((x-last_values[0])/(i))).slice(-dt), 2).pop();
		//const speed = Math.round((done - last_values[0])/dt);1
		progress.update(current_value, {speed: Math.round(avg)});
		await fs.writeFile(settings.stats_file, JSON.stringify(Array.from(activityByClient), null, '\t'));
	}, 1000);
	progress.start(total_groups, start_value, {speed: 'n/a', online: 'n/a'});
})();
