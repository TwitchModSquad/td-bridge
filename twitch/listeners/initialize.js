const api = require("../../api/");

const sleep = time => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

const listener = {
    name: "initialize",
    eventType: "once",
    event: "connected",
    execute: async () => {
        while (api.Bridge.bridges.length === 0) {
            await sleep(100);
        }
        api.Logger.info("[Twitch] Connecting to Bridge channels");
        let joined = [];
        api.Bridge.bridges.forEach(bridge => {
            if (!joined.includes(bridge.user.login)) {
                global.client.twitch.join(bridge.user.login).catch(api.Logger.warning);
                joined.push(bridge.user.login);
            }
        });
    }
};

module.exports = listener;
