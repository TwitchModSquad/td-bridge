const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { ChatInputCommandInteraction, SlashCommandBuilder } = require("discord.js");

const command = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Setup a channel to send/receive Twitch messages!")
        .setDefaultMemberPermissions(0)
        .setDMPermission(false),
    /**
     * Execution function for this command
     * @param {ChatInputCommandInteraction} interaction 
     */
    execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Set up a TD Bridge!")
            .setColor(0x772ce8)
            .setDescription("Select the type of bridge you would like to set up. View the fields below for more information.")
            .addFields([
                {
                    name: "Message Stack",
                    value: "Message stack bridges are posted by the TDBridge bot, and will continue to edit the previous Discord message as more Twitch messages are received.\nOnce the message reaches the length limit, a new message will be sent.",
                },
                {
                    name: "Interactive",
                    value: "Interactive bridges creates a webhook in the channel that is utilized to send messages. This way, the message avatar and username changes inline with the Twitch account.\nEach Twitch message is a separate message.",
                }
            ]);

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("setup")
            .setPlaceholder("Select a type")
            .setOptions([
                {
                    label: "Message Stack",
                    value: "Message Stack",
                },
                {
                    label: "Interactive",
                    value: "Interactive",
                }
            ]);

        const row = new ActionRowBuilder()
            .setComponents(selectMenu);

        interaction.reply({embeds: [embed], components: [row], ephemeral: true});
    }
};

module.exports = command;