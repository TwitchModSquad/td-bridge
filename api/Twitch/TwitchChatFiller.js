class TwitchChatFiller {
    /**
     * Indicates that the log is a chat log.
     * @type {string}
     */
    type = "filler";

    /**
     * Number of messages contained in this filler
     * @type {number}
     */
    messageCount;

    /**
     * From time for this filler
     * @type {number}
     */
    fromTime;

    /**
     * To time for this filler
     * @type {number}
     */
    toTime;

    /**
     * Constructor for a new TwitchChatFiller
     * @param {number} messageCount 
     * @param {number} fromTime 
     * @param {number} toTime 
     */
    constructor(messageCount, fromTime, toTime) {
        this.messageCount = messageCount;
        this.fromTime = fromTime;
        this.toTime = toTime;
    }
}

module.exports = TwitchChatFiller;