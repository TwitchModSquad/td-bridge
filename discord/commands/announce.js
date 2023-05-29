const { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } = require("discord.js");
const api = require("../../api/");

const command = {
    data: new SlashCommandBuilder()
        .setName("announce")
        .setDescription("Send an announcement in a channel!")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("message")
                .setDescription("The message to send")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("color")
                .setDescription("The announcement color")
                .setRequired(false)
                .setChoices(
                    {
                        name: "Primary (Channel accent color)",
                        value: "primary",
                    },
                    {
                        name: "Blue",
                        value: "blue",
                    },
                    {
                        name: "Green",
                        value: "green",
                    },
                    {
                        name: "Orange",
                        value: "orange",
                    },
                    {
                        name: "Purple",
                        value: "purple",
                    }
                )
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const bridges = api.Bridge.getBridgesByChannel(interaction.channelId);

        const message = interaction.options.getString("message", true);
        let color = interaction.options.getString("color", false);

        if (!color) color = "primary";

        if (bridges.length > 0) {
            try {
                const discordUser = await api.Discord.getUserById(interaction.user.id, false, true);
                if (discordUser.identity?.id) {
                    const identity = await api.getFullIdentity(discordUser.identity.id);
                    if (identity.twitchAccounts.length > 0) {
                        const twitchUser = identity.twitchAccounts[0];
                        const tokens = api.Token.getTokensByScope(twitchUser, "moderator:manage:announcements");
                        if (tokens.length > 0) {
                            try {
                                const accessToken = await api.Token.getAccessToken(tokens);
                                await api.Authentication.Twitch.announce(accessToken, bridges[0].user.id, twitchUser.id, message, color);
                                interaction.success("The announcement was sent!");
                            } catch(err) {
                                interaction.error("An error occurred: " + err);
                            }
                        } else {
                            interaction.error(`You have not authorized with the proper \`moderator:manage:announcements\` scope. Click [here](${api.Authentication.Twitch.getURL("chat:read chat:edit moderator:manage:chat_messages moderator:manage:banned_users moderator:manage:announcements")}) to authorize`)
                        }
                    } else {
                        interaction.error("You must connect your account using `/connect` to utilize this command!");
                    }
                } else {
                    interaction.error("You must connect your account using `/connect` to utilize this command!");
                }
            } catch(err) {
                api.Logger.warning(err);
                interaction.error("An error occurred while executing the command!");
            }
        } else {
            interaction.error("You must send this command in a Bridge channel!");
        }
    }
};

module.exports = command;