#!/usr/bin/env node

const Promise = require('bluebird');
const redis = require('redis');
const settings = require('./settings');
const {SingleBar} = require('cli-progress');

Promise.promisifyAll(redis);

(async () => {
	const redis_db = redis.createClient(settings.redis_url);
	const total_groups = 186689865;
	const start_value = await redis_db.getAsync(settings.redis_key);
	const speed_window = 60*10; // 10 minutes
	const start_time = Date.now();
	const last_values = Array(speed_window).fill(start_value);


	const progress = new SingleBar({
		format: ' {percentage}% |{bar}| {value}/{total} | g/s: {speed} | ETA: {eta_formatted}',
		barCompleteChar: '\u2588',
		barIncompleteChar: '\u2591',
		hideCursor: true
	});

	setInterval(async () => {
		const done = await redis_db.getAsync(settings.redis_key);

		last_values.shift();
		last_values.push(done);

		const dt = Math.min(Math.round((Date.now() - start_time)/1000), speed_window);
		const speed = Math.round((done - last_values[0])/dt);
		progress.update(done, {speed});
	}, 1000);

	progress.start(total_groups, start_value, {speed: 'n/a'});
})();
