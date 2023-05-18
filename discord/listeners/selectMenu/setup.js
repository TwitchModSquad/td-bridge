const { EmbedBuilder } = require("@discordjs/builders");
const {StringSelectMenuInteraction} = require("discord.js");
const config = require("../../../config.json");

let listener = {
    name: 'setup',
    cache: {},
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.isStringSelectMenu() && interaction.component.customId === "setup";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const type = interaction.values[0];

        if (type !== "Message Stack" && type !== "Interactive") {
            interaction.error(`Unknown type \`${type}\`!`);
            return;
        }

        listener.cache[interaction.channelId] = {
            channel: await interaction.client.channels.fetch(interaction.channelId),
            type: type,
            member: interaction.member,
        };

        const embed = new EmbedBuilder()
            .setTitle("Set bridge type!")
            .setColor(0x772ce8)
            .setDescription(`Success! In order to complete the bridge, please authorize with Twitch to complete setup [here](${config.uri}authorize/setup/${encodeURIComponent(interaction.channelId)}).`);

        interaction.reply({embeds: [embed], ephemeral: true}).catch(global.api.Logger.warning);
    }
};

module.exports = listener;
