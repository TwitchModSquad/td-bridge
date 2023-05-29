const { TextChannel } = require("discord.js");
const con = require("../../database");

const Listener = require("./LiveListener");
const TwitchUser = require("../Twitch/TwitchUser");

class LiveListener {

    /**
     * Holds all LiveListeners
     * @type {Listener[]}
     */
    listeners = [];

    init() {
        con.query("select id, guild_id, channel_id, user_id from bridge__listener__live;", async (err, res) => {
            if (err) {
                global.api.Logger.severe(err);
                return;
            }

            let listeners = [];
            for (let i = 0; i < res.length; i++) {
                try {
                    listeners.push(new Listener(
                        res[i].id,
                        await global.client.discord.guilds.fetch(res[i].guild_id),
                        await global.client.discord.channels.fetch(res[i].channel_id),
                        await global.api.Twitch.getUserById(res[i].user_id)
                    ));
                } catch(err2) {
                    global.api.Logger.severe(err2);
                }
            }
            global.api.Logger.info(`Loaded ${listeners.length} listener(s)`);
            this.listeners = listeners;
        });
    }

    /**
     * Adds a new live listener
     * @param {TextChannel} channel 
     * @param {TwitchUser} user 
     * @returns {Promise<Listener>}
     */
    addListener(channel, user) {
        return new Promise((resolve, reject) => {
            con.query("insert into bridge__listener__live (guild_id, channel_id, user_id) values (?, ?, ?);", [
                channel.guild.id,
                channel.id,
                user.id,
            ], err => {
                if (err) {
                    reject(err);
                    return;
                }
                con.query("select id from bridge__listener__live where guild_id = ? and channel_id = ? and user_id = ? order by id desc limit 1;", [
                    channel.guild.id,
                    channel.id,
                    user.id,
                ], (err2, res) => {
                    if (err2) {
                        reject(err2);
                        return;
                    }
                    if (res.length > 0) {
                        let listener = new Listener(res[0].id, channel.guild, channel, user);
                        this.listeners.push(listener);
                        resolve(listener);
                    } else {
                        reject("Unable to find added listener");
                    }
                });
            });
        });
    }

    /**
     * Retrieves listeners based on their user ID
     * @param {string|number} userId 
     * @returns {Listener[]}
     */
    getListenersByUser(userId) {
        return this.listeners.filter(x => String(x.user.id) === String(userId));
    }

    /**
     * Retrieves listeners based on their channel ID
     * @param {string} channelId 
     * @returns {Listener[]}
     */
    getListenersByChannel(channelId) {
        return this.listeners.filter(x => x.channel.id === channelId);
    }

}

module.exports = LiveListener;
