const fs = require("fs");
const tmi = require('tmi.js');
const config = require("../config.json");
const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const listenerFiles = grabFiles('./twitch/listeners');

const client = new tmi.Client({
	options: { debug: config.developer },
	identity: {
		username: config.twitch.username,
		password: config.twitch.oauth,
	},
	channels: [],
});

global.client.twitch = client;

for (const file of listenerFiles) {
    const listener = require(`./listeners/${file}`);
	if ("name" in listener && "eventType" in listener && "event" in listener && "execute" in listener) {
		client[listener.eventType](listener.event, listener.execute);
	} else {
		global.api.Logger.warning(`Listener ${file} is missing a required attribute`);
	}
}

client.connect();
