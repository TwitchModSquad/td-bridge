const api = require("../../api/");
const con = require("../../database");

const listener = {
    name: "timeoutHandler",
    eventType: "on",
    event: "timeout",
    execute: async (channel, username, reason, duration, tags) => {
        con.query("select discord_id, bridge_id from bridge__chat where user_id = ? and deleted = false;", [
            tags["target-user-id"],
        ], (err, res) => {
            if (err) return api.Logger.warning(err);

            for (let i = 0; i < res.length; i++) {
                const row = res[i];
                con.query("update bridge__chat set deleted = true where user_id = ? and bridge_id = ?;", [
                    tags["target-user-id"],
                    row.bridge_id,
                ], err => {
                    if (err) api.Logger.warning(err);
                });

                const bridge = api.Bridge.getBridgeById(row.bridge_id);
                bridge.channel.messages.delete(row.discord_id).catch(api.Logger.warning);
            }
        });
    }
};

module.exports = listener;
