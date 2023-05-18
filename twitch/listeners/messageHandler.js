const tmi = require("tmi.js");
const api = require("../../api/");

const listener = {
    name: "messageHandler",
    eventType: "on",
    event: "message",
    /**
     * 
     * @param {string} channel 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {boolean} self 
     */
    execute: async (channel, tags, message, self) => {
        const bridges = api.Bridge.getBridgesByUser(tags["room-id"]);

        if (bridges.length > 0) {
            try {
                const user = await api.Twitch.getUserById(tags["user-id"], false, true);
                for (let i = 0; i < bridges.length; i++) {
                    const bridge = bridges[i];
                    bridge.handleMessage(user, message);
                }
            } catch(err) {
                api.Logger.warning(err);
            }
        }
    }
};

module.exports = listener;
