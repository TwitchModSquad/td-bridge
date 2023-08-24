const { TextChannel, WebhookClient, Message } = require("discord.js");
const TwitchUser = require("../Twitch/TwitchUser");
const config = require("../../config.json");

const con = require("../../database");

const MENTION_REGEX = /@\w+/g

class Bridge {

    /**
     * Surrogate ID for the bridge
     * @type {number}
     */
    id;

    /**
     * Type of bridge
     * @type {"Interactive"|"Message Stack"}
     */
    type;

    /**
     * Twitch user where the bridge is
     * @type {TwitchUser}
     */
    user;

    /**
     * Discord Channel where the bridge is
     * @type {TextChannel}
     */
    channel;

    /**
     * Last message sent by the bot in the channel, if type is Message Stack
     * @type {Message}
     */
    lastMessage;

    /**
     * Webhook client for the Bridge
     * @type {WebhookClient?}
     */
    webhookClient;

    /**
     * Constructor for a Bridge
     * @param {number} id 
     * @param {"Interactive"|"Message Stack"} type
     * @param {TwitchUser} user 
     * @param {TextChannel} channel 
     * @param {WebhookClient?} webhookClient
     */
    constructor(id, type, user, channel, webhookClient) {
        this.id = id;
        this.type = type;
        this.user = user;
        this.channel = channel;
        this.webhookClient = webhookClient;
    }

    /**
     * Handles a message sent in Twitch by a user
     * @param {TwitchUser} user
     * @param {string} message
     * @param {string} messageId
     * @param {string} badges
     */
    async handleMessage(user, message, messageId, badges = "") {
        const isPartner = user.affiliation === "partner";

        if (!badges) badges = "";
        const isBroadcaster = badges.indexOf("broadcaster/") !== -1;
        const isModerator = badges.indexOf("moderator/") !== -1;
        const isSubscriber = badges.indexOf("subscriber/") !== -1;

        let mentionSearch = message.match(MENTION_REGEX);
        if (mentionSearch) {
            for (let i = 0; i < mentionSearch.length; i++) {
                const mention = mentionSearch[i];
                try {
                    const user = (await global.api.Twitch.getUserByName(mention.substring(1)))[0];
                    if (user.identity?.id) {
                        const identity = await global.api.getFullIdentity(user.identity.id);
                        if (identity.discordAccounts.length > 0) {
                            message = message.replace(mention, `<@${identity.discordAccounts[0].id}>`);
                        }
                    }
                } catch(err) {}
            }
        }

        if (this.type === "Interactive") {
            this.webhookClient.send({
                content: message,
                avatarURL: user.profile_image_url,
                username: 
                    (isBroadcaster ? "🎥 " : "") +
                    (isModerator ? "⚔ " : "") +
                    (isSubscriber ? "✪ " : "") +
                    (user.display_name.toLowerCase() === user.login.toLowerCase() ?
                        user.display_name : `${user.display_name} (${user.login})`) +
                    (isPartner ? " ☑️" : "")
            }).then(message => {
                con.query("insert into bridge__chat (id, discord_id, bridge_id, user_id) values (?, ?, ?, ?);", [
                    messageId,
                    message.id,
                    this.id,
                    user.id,
                ], err => {
                    if (err) global.api.Logger.warning(err);
                });
            }, global.api.Logger.warning);
        } else if (this.type === "Message Stack") {
            let lastMessage = this.lastMessage;
            if (!lastMessage) {
                const message = (await this.channel.messages.fetch({limit: 1})).first();
                if (message && message.author.id === config.discord.application) {
                    this.lastMessage = message;
                    lastMessage = message;
                }
            }

            let edited = false;
            if (lastMessage) {
                try {
                    await lastMessage.edit({content: lastMessage.content + `\n**${user.display_name}:** ${message}`});
                    edited = true;
                } catch(err) {}
            }
            
            if (!edited) this.channel.send(`**${user.display_name}:** ${message}`).then(message => {this.lastMessage = message}, global.api.Logger.warning);
        }
    }
    
}

module.exports = Bridge;
