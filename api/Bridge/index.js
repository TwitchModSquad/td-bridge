const { TextChannel, WebhookClient } = require("discord.js");
const con = require("../../database");
const TwitchUser = require("../Twitch/TwitchUser");
const Bridge = require("./Bridge");

class BridgeManager {

    /**
     * Holds all Bridges
     * @type {Bridge[]}
     */
    bridges = [];

    /**
     * Initialize the BridgeManager
     */
    init() {
        con.query("select id, type, user_id, channel_id, webhook_id, webhook_token from bridge;", async (err, res) => {
            if (err) {
                global.api.Logger.severe(err);
                return;
            }

            let bridges = [];
            for (let i = 0; i < res.length; i++) {
                try {
                    bridges.push(new Bridge(
                        res[i].id,
                        res[i].type,
                        await global.api.Twitch.getUserById(res[i].user_id),
                        await global.client.discord.channels.fetch(res[i].channel_id),
                        res[i].type === "Interactive" ? new WebhookClient({id: res[i].webhook_id, token: res[i].webhook_token}) : null
                    ));
                } catch(err2) {
                    global.api.Logger.severe(err2);
                }
            }
            global.api.Logger.info(`Loaded ${bridges.length} bridge(s)`);
            this.bridges = bridges;
        });
    }

    /**
     * Creates a new Bridge
     * @param {TwitchUser} user 
     * @param {"Interactive"|"Message Stack"} type
     * @param {TextChannel} channel 
     * @returns {Promise<Bridge>}
     */
    addBridge(user, type, channel) {
        return new Promise(async (resolve, reject) => {
            if (this.getBridgesByChannel(channel.id).length > 0) {
                reject("A bridge already exists in this channel!");
                return;
            }

            let webhook;
            if (type === "Interactive") {
                webhook = await channel.createWebhook({
                    name: "TDBridge - " + user.display_name,
                    avatar: "https://tms.to/assets/images/logos/logo_guy.png",
                });
            }

            con.query("insert into bridge (user_id, type, channel_id, webhook_id, webhook_token) values (?, ?, ?, ?, ?);", [
                user.id,
                type,
                channel.id,
                webhook ? webhook.id : null,
                webhook ? webhook.token : null
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }
                con.query("select id from bridge where user_id = ? and type = ? and channel_id = ? order by id desc;", [
                    user.id,
                    type,
                    channel.id,
                ], (err2, res) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }

                    if (res.length > 0) {
                        const bridge = new Bridge(
                            res[0].id,
                            type,
                            user,
                            channel,
                            webhook ? new WebhookClient({id: webhook.id, token: webhook.token}) : null
                        );
                        this.bridges.push(bridge);
                        global.client.twitch.join(user.login).catch(global.api.Logger.warning);
                        resolve(bridge);
                    } else {
                        reject("Failed to retrieve Bridge ID");
                    }
                });
            });
        })
    }

    /**
     * Retrieves a Bridge based on the Bridge ID
     * @param {number} id
     * @returns {Bridge}
     */
    getBridgeById(id) {
        return this.bridges.find(x => x.id === id);
    }

    /**
     * Retrieves Bridges based on the user ID
     * @param {string|number} userId 
     * @returns {Bridge[]}
     */
    getBridgesByUser(userId) {
        return this.bridges.filter(x => String(x.user.id) === String(userId));
    }

    /**
     * Retreives Bridges based on their Channel ID
     * @param {string} channelId 
     * @returns {Bridge[]}
     */
    getBridgesByChannel(channelId) {
        return this.bridges.filter(x => x.channel.id === channelId);
    }

}

module.exports = BridgeManager;
