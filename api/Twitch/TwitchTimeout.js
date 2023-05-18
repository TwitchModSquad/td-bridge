const TwitchPunishment = require("./TwitchPunishment");
const TwitchUser = require("./TwitchUser");

class TwitchTimeout extends TwitchPunishment {
    /**
     * Duration of the time out
     * 
     * @type {number}
     */
    duration;

    /**
     * Constructor for a TwitchTimeout
     * 
     * @param {number} id 
     * @param {TwitchUser} channel 
     * @param {TwitchUser} user 
     * @param {number} time 
     * @param {number} duration 
     * @param {boolean} active 
     * @param {string} discord_message
     */
    constructor(id, channel, user, time, duration, active, discord_message) {
        super(id, channel, user, time, active, discord_message);

        this.duration = duration;
    }
}

module.exports = TwitchTimeout;