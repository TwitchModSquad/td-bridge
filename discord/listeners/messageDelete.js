const api = require("../../api/");
const con = require("../../database");

const listener = {
    name: 'messageDelete',
    eventName: 'messageDelete',
    eventType: 'on',
    listener (message) {
        con.query("delete from bridge__live_message where message_id = ?;", [message.id], err => {
            if (err) api.Logger.warning(err);
        });
    }
};

module.exports = listener;
