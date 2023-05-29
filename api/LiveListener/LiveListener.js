const { Guild, TextChannel } = require("discord.js");
const Listener = require("../Listener");
const TwitchUser = require("../Twitch/TwitchUser");

class LiveListener extends Listener {

    /**
     * The user the live listener is attached to
     * @type {TwitchUser}
     */
    user;

    /**
     * 
     * @param {number} id 
     * @param {Guild} guild 
     * @param {TextChannel} channel 
     * @param {TwitchUser} user 
     */
    constructor(id, guild, channel, user) {
        super(id, guild, channel);

        this.user = user;
    }

}

module.exports = LiveListener;
