const {EmbedBuilder} = require("discord.js");
const client = global.client.discord;

const config = require("../../config.json");

const listener = {
    name: 'commandManager',
    eventName: 'interactionCreate',
    eventType: 'on',
    listener (interaction) {
        if (!interaction.isCommand()) return;
    
        if (!client.commands.has(interaction.commandName)) return;
    
        let cmd = client.commands.get(interaction.commandName);

        const success = message => {
            const embed = new EmbedBuilder()
                .setTitle("Success!")
                .setDescription(message)
                .setColor(0x772ce8);

            interaction.reply({embeds: [embed], ephemeral: true}).catch(global.api.Logger.warning)
        }

        const error = message => {
            const embed = new EmbedBuilder()
                .setTitle("Error!")
                .setDescription(message)
                .setColor(0xe83b3b);

            interaction.reply({embeds: [embed], ephemeral: true}).catch(global.api.Logger.warning)
        }

        interaction.success = success;
        interaction.error = error;

        try {
            cmd.execute(interaction);
        } catch (error) {
            global.api.Logger.warning(error);
            interaction.reply('***There was an error trying to execute that command!***').catch(global.api.Logger.warning);
        }
    }
};

module.exports = listener;
