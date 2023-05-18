/**
 * Represents a generic Punishment
 */
 class Punishment {
    /**
     * ID of the punishment
     * 
     * @type {number}
     */
    id;

    /**
     * Time of the punishment
     * 
     * @type {number}
     */
    time;

    /**
     * Discord Message associated with the punishment in TMS
     * 
     * @type {string}
     */
    discord_message;

    /**
     * Constructor for Punishment
     * 
     * @param {number} id 
     * @param {number} time 
     * @param {string} discord_message 
     */
    constructor(id, time, discord_message) {
        this.id = id;
        this.time = time;
        this.discord_message = discord_message;
    }
}

module.exports = Punishment;