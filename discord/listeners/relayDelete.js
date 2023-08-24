const api = require("../../api/");
const con = require("../../database");

const listener = {
    name: 'relayDelete',
    eventName: 'messageDelete',
    eventType: 'on',
    listener (message) {
        const bridges = api.Bridge.getBridgesByChannel(message.channel.id);

        if (bridges.length > 0) {
            con.query("update bridge__chat set deleted = true where discord_id = ?;", [
                message.id,
            ], err => { 
                if (err) return api.Logger.warning(err);
            });
            
            con.query("select id, bridge_id from bridge__chat where discord_id = ?;", [
                message.id,
            ], async (err, res) => {
                if (err) return api.Logger.warning(err);

                for (let i = 0; i < res.length; i++) {
                    const row = res[i];
                    const bridge = api.Bridge.getBridgeById(row.bridge_id);
                    const tokens = api.Token.getTokensByScope(bridge.user, "moderator:manage:banned_users");
                    if (tokens.length > 0) {
                        try {
                            const accessToken = await api.Token.getAccessToken(tokens);
                            await api.Authentication.Twitch.deleteMessage(accessToken, bridge.user.id, bridge.user.id, row.id);
                        } catch(err) {
                            api.Logger.warning("An error occurred: " + err);
                        }
                    }
                }
            });
        }
    }
};

module.exports = listener;
