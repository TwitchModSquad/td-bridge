const { Guild, TextChannel } = require("discord.js");

class Listener {

    /**
     * Surrogate ID for the listener
     * @type {number}
     */
    id;

    /**
     * Guild the listener is in
     * @type {Guild}
     */
    guild;

    /**
     * Channel the listener is in
     * @type {TextChannel}
     */
    channel;

    /**
     * Constructor for a listener
     * @param {number} id 
     * @param {Guild} guild 
     * @param {TextChannel} channel 
     */
    constructor(id, guild, channel) {
        this.id = id;
        this.guild = guild;
        this.channel = channel;
    }

}

module.exports = Listener;
