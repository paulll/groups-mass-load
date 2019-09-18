const path = require('path');

module.exports = {
	redis_url: 'redis://localhost',
	redis_key: 'gml:current_user',
	output: path.join(__dirname, '../output'),
	last_block_file: path.join(__dirname, './.last_block'),
	groups_per_block: 30,
	fibers: 20,
	//proxies: []
};