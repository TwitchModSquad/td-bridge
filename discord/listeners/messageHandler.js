const { Message, EmbedBuilder } = require("discord.js");
const api = require("../../api/");

const deleteAfter = delay => {
    return message => {
        setTimeout(() => {
            message.delete().catch(api.Logger.warning);
        },delay);
    }
}

const listener = {
    name: 'messageHandler',
    eventName: 'messageCreate',
    eventType: 'on',
    /**
     * Listener
     * @param {Message} message 
     */
    async listener (message) {
        if (message.author.id === message.client.user.id) return;
        if (message.webhookId || !message.author?.id) return;

        const bridges = api.Bridge.getBridgesByChannel(message.channel.id);

        const error = () => {
            const embed = new EmbedBuilder()
                .setTitle("Unable to send message!")
                .setColor(0xe83b3b)
                .setDescription("We don't have a token under your user to utilize for chat messages.\nTo create one, use the `/connect` command.")
                .setFooter({text: "This message will expire in 6 seconds."});
            message.channel.send({embeds: [embed]}).then(deleteAfter(6000)).catch(api.Logger.warning);
            message.delete().catch(api.Logger.warning);
        }

        if (bridges.length > 0) {
            const user = await api.Discord.getUserById(message.author.id);
            if (user.identity?.id) {
                const identity = await api.getFullIdentity(user.identity.id);
                if (identity.twitchAccounts.length > 0) {
                    try {
                        const client = await identity.twitchAccounts[0].getTMIClient();
                        for (let i = 0; i < bridges.length; i++) {
                            const bridge = bridges[i];
                            let content = message.content;

                            try {
                                if (message.mentions && message.mentions.users.size > 0) {
                                    const users = Array.from(message.mentions.users.values());
                                    for (let u = 0; u < users.length; u++) {
                                        const user = users[u];
                                        const apiUser = await api.Discord.getUserById(user.id);
                                        if (apiUser.identity?.id) {
                                            const identity = await api.getFullIdentity(apiUser.identity.id);
                                            if (identity.twitchAccounts.length > 0) {
                                                content = content.replace(`<@${user.id}>`, `@${identity.twitchAccounts[0].display_name}`);
                                            }
                                        }
                                    }
                                }
                            } catch(err) {
                                api.Logger.severe(err);
                            }

                            client.say(bridge.user.login, content).then(() => {
                                message.delete().catch(api.Logger.warning);
                            }, error);
                        }
                    } catch(err) {
                        error();
                    }
                } else error();
            } else error();
        }
    }
};

module.exports = listener;
