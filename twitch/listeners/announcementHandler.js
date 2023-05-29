const { EmbedBuilder, cleanContent } = require("discord.js");
const api = require("../../api/");

const listener = {
    name: "announcementHandler",
    eventType: "on",
    event: "raw_message",
    execute: async message => {
        if (message?.command !== "USERNOTICE" || message?.tags["msg-id"] !== "announcement" || message?.params?.length !== 2) return;
        
        const bridges = api.Bridge.getBridgesByUser(message.tags["room-id"]);
        const user = await api.Twitch.getUserById(message.tags["user-id"]);

        let color = message.tags.color;
        let paramColor = message.tags["msg-param-color"];

        if (paramColor === "BLUE") {
            color = 0x3074e3;
        } else if (paramColor === "GREEN") {
            color = 0x1fb529;
        } else if (paramColor === "ORANGE") {
            color = 0xe38b20;
        } else if (paramColor === "PURPLE") {
            color = 0x6f1fde;
        }

        const embed = new EmbedBuilder()
            .setAuthor({
                name: user.display_name,
                iconURL: user.profile_image_url,
            })
            .setTitle("🚨 Announcement 🚨")
            .setColor(color)
            .setDescription("**"+message.params[1].replace("*","\\*").replace("_", "\\_").replace("`", "\\`")+"**");

        bridges.forEach(bridge => {
            bridge.channel.send({embeds: [embed]}).catch(api.Logger.warning);
        });
    }
};

module.exports = listener;
