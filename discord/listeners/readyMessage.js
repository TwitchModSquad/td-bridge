const client = global.client.discord;

const listener = {
    name: 'readyMessage',
    eventName: 'ready',
    eventType: 'once',
    listener () {
        global.api.Bridge.init();
        global.api.LiveListener.init();
        global.api.Logger.info(`[TDBridge] Discord bot ready! Logged in as ${client.user.tag}!`);
        global.api.Logger.info(`[TDBridge] Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    }
};

module.exports = listener;
