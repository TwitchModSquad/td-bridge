const api = require("../../api/");
const con = require("../../database");

const listener = {
    name: "updateDeletedMessages",
    eventType: "on",
    event: "messagedeleted",
    execute: async (channel, username, deletedMessage, userstate) => {
        let id = userstate["target-msg-id"];
    
        con.query("update bridge__chat set deleted = true where id = ?;", [id]);

        con.query("select discord_id, bridge_id from bridge__chat where id = ?;", [id], (err, res) => {
            if (err) return api.Logger.warning(err);

            for (let i = 0; i < res.length; i++) {
                const row = res[i];
                const bridge = api.Bridge.getBridgeById(row.bridge_id);
                bridge.channel.messages.delete(row.discord_id).catch(api.Logger.warning);
            }
        });
    }
};

module.exports = listener;
