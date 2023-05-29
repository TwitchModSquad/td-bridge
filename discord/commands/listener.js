const { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandSubcommandGroupBuilder, SlashCommandSubcommandBuilder, SlashCommandStringOption } = require("discord.js");

const api = require("../../api/");

const command = {
    data: new SlashCommandBuilder()
        .setName("listener")
        .setDescription("Create and delete Listeners!")
        .addSubcommandGroup(
            new SlashCommandSubcommandGroupBuilder()
                .setName("live")
                .setDescription("Create and delete Live Listeners!")
                .addSubcommand(
                    new SlashCommandSubcommandBuilder()
                        .setName("create")
                        .setDescription("Create a Live Listener!")
                        .addStringOption(
                            new SlashCommandStringOption()
                                .setName("user")
                                .setDescription("Twitch name of the channel to listen")
                                .setRequired(true)
                        )
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

        if (bridges.length > 0) {
            interaction.error("You can't set up a listener in a Bridge channel!");
            return;
        }

        if (interaction.options.getSubcommandGroup() === "live") {
            if (interaction.options.getSubcommand() === "create") {
                const name = interaction.options.getString("user", true);
                try {
                    const user = (await api.Twitch.getUserByName(name, true))[0];
                    let channel = interaction.channel;
                    if (!channel) {
                        channel = await interaction.client.channels.fetch(interaction.channelId);
                    }

                    api.LiveListener.addListener(channel, user).then(listener => {
                        interaction.success(`Successfully created listener! \`ID: ${listener.id}\``);
                    }, err => {
                        api.Logger.warning(err);
                        interaction.error("An error occurred while creating the listener!");
                    })
                } catch(err) {
                    interaction.error(`Unable to find user ${name}!`);
                }
            }
        }
    }
};

module.exports = command;