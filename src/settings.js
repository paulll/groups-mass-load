const path = require('path');

module.exports = {
	redis_url: 'redis://:UWfQuFUq6YKxyrNqGHKuCRovhAWma3AD@redis-11760.c135.eu-central-1-1.ec2.cloud.redislabs.com:11760',
	redis_key: 'gml:current_user:v2',
	output: path.join(__dirname, '../output'),
	last_block_file: path.join(__dirname, '../.last_block'),
	stats_file: path.join(__dirname, '../.stats.json'),
	groups_per_block: 250,
	fibers: 50
};
