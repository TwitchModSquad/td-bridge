const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");

const api = require("../../api/");

const command = {
    data: new SlashCommandBuilder()
        .setName("connect")
        .setDescription("Connect your Discord to your Twitch account to utilize chat features")
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const bridges = api.Bridge.getBridgesByChannel(interaction.channelId);

        let isMod = false;
        if (bridges.length > 0) {
            try {
                const discordUser = await api.Discord.getUserById(interaction.user.id);
                if (discordUser.identity?.id) {
                    const identity = await api.getFullIdentity(discordUser.identity.id);
                    for (let i = 0; i < bridges.length; i++) {
                        const bridge = bridges[i];
                        const roles = await bridge.user.getRoles();
                        if (roles.find(x => x.role === "moderator" && identity.twitchAccounts.find(y => y.id === x.user.id))) {
                            isMod = true;
                        }
                    }
                }
            } catch(err) {
                api.Logger.warning(err);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("Connect your Twitch account")
            .setColor(0x772ce8)
            .setDescription("Authorize your account with Twitch below to utilize chat features.\n[Connect your account](" +
                (isMod ? api.Authentication.Twitch.getURL("chat:read chat:edit moderator:manage:chat_messages moderator:manage:banned_users moderator:manage:announcements") : api.Authentication.Twitch.getURL("chat:read chat:edit")) +
            ")");

        interaction.reply({embeds: [embed], ephemeral: true}).catch(api.Logger.warning);
    }
};

module.exports = command;