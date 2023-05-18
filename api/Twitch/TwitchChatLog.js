class TwitchChatLog {
    /**
     * Indicates that the log is a chat log.
     * @type {string}
     */
    type = "chatlog";

    /**
     * Represents a string UUID set by twitch for messages
     * 
     * @type {string}
     */
    id;

    /**
     * Represents a streamer ID
     * 
     * @type {number}
     */
    streamer_id;

    /**
     * Represents a user ID
     * 
     * @type {number}
     */
    user_id;

    /**
     * Represents the message sent
     * 
     * @type {string}
     */
    message;

    /**
     * Whether the message was deleted or not
     * 
     * @type {boolean}
     */
    deleted;

    /**
     * Color code for the message
     * 
     * @type {string}
     */
    color;

    /**
     * Time the message was sent
     * 
     * @type {number}
     */
    timesent;

    /**
     * Constructor for a TwitchChatLog
     * @param {string} id 
     * @param {number} streamer_id 
     * @param {number} user_id 
     * @param {string} message 
     * @param {boolean} deleted 
     * @param {string} color 
     * @param {number} timesent 
     */
    constructor(id, streamer_id, user_id, message, deleted, color, timesent) {
        this.id = id;
        this.streamer_id = streamer_id;
        this.user_id = user_id;
        this.message = message;
        this.deleted = deleted;
        this.color = color;
        this.timesent = timesent;
    }
}

module.exports = TwitchChatLog;