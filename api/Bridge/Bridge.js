const { TextChannel, WebhookClient, Webhook, Message } = require("discord.js");
const TwitchUser = require("../Twitch/TwitchUser");
const config = require("../../config.json");

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
     */
    async handleMessage(user, message) {
        if (this.type === "Interactive") {
            this.webhookClient.send({
                content: message,
                avatarURL: user.profile_image_url,
                username: user.display_name.toLowerCase() === user.login.toLowerCase() ?
                    user.display_name : `${user.display_name} (${user.login})`
            }).catch(global.api.Logger.warning);
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
