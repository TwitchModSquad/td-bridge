const fs = require("fs");
const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

global.client = {};

const api = require("./api/");

// Start discord.js app
require("./discord/");

// Start TMI client
require("./twitch/")

// Start Express
require("./web/");

const intervalFiles = grabFiles("./intervals");

for (const file of intervalFiles) {
    const interval = require(`./intervals/${file}`);
    if ("time" in interval && "execute" in interval) {
        setInterval(interval.execute, interval.time);
    } else {
        api.Logger.severe(`Interval ${file} is missing a required attribute`);
    }
}
