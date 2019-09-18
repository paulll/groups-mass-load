const path = require('path');

module.exports = {
	redis_url: 'redis://:UWfQuFUq6YKxyrNqGHKuCRovhAWma3AD@redis-11760.c135.eu-central-1-1.ec2.cloud.redislabs.com:11760',
	redis_key: 'gml:current_user',
	output: path.join(__dirname, '../output'),
	last_block_file: path.join(__dirname, '../.last_block'),
	groups_per_block: 30,
	fibers: 20,
	//proxies: []
};