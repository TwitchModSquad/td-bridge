const { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandStringOption } = require("discord.js");
const api = require("../../api/");

const command = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user in this channel")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("user")
                .setDescription("The Twitch username to ban")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("reason")
                .setDescription("The reason for the ban")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction) {
        const bridges = api.Bridge.getBridgesByChannel(interaction.channelId);

        const username = interaction.options.getString("user", true);
        let reason = interaction.options.getString("reason", false);

        let user;
        try {
            user = (await api.Twitch.getUserByName(username, true))[0];
        } catch {
            interaction.error(`Unable to find Twitch user \`${username}\``);
            return;
        }
        if (!reason) reason = "";

        if (bridges.length > 0) {
            let bridge = bridges[0];
            try {
                const discordUser = await api.Discord.getUserById(interaction.user.id, false, true);
                if (discordUser.identity?.id) {
                    const identity = await api.getFullIdentity(discordUser.identity.id);
                    if (identity.twitchAccounts.length > 0) {
                        const twitchUser = identity.twitchAccounts[0];
                        const tokens = api.Token.getTokensByScope(twitchUser, "moderator:manage:banned_users");
                        if (tokens.length > 0) {
                            try {
                                const accessToken = await api.Token.getAccessToken(tokens);
                                await api.Authentication.Twitch.ban(accessToken, bridge.user.id, twitchUser.id, user.id, null, reason);
                                interaction.success(`User \`${user.display_name}\` was banned in channel \`${bridge.user.display_name}\`!${reason ? `\n\`\`\`Reason: ${reason}\`\`\`` : ""}`);
                            } catch(err) {
                                interaction.error("An error occurred: " + err);
                            }
                        } else {
                            interaction.error(`You have not authorized with the proper \`moderator:manage:banned_users\` scope. Click [here](${api.Authentication.Twitch.getURL("chat:read chat:edit moderator:manage:chat_messages moderator:manage:banned_users moderator:manage:announcements")}) to authorize`)
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