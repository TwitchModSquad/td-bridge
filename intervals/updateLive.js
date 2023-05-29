const { EmbedBuilder, codeBlock } = require("discord.js");
const api = require("../api/");
const con = require("../database");

const {HelixStream} = require("twitch");

let count = 0;

/**
 * Generates an embed given a Stream and User
 * @param {TwitchUser} user 
 * @param {HelixStream} stream 
 * @returns {EmbedBuilder}
 */
const liveEmbed = (user, stream) => {
    return new EmbedBuilder()
        .setAuthor({name: `🔴 ${user.display_name} is now live!`})
        .setTitle(stream.title)
        .setColor(0x9147ff)
        .setURL(`https://twitch.tv/${user.login}`)
        .setImage(stream.getThumbnailUrl(256, 144) + `?nocache=${Date.now()}`)
        .addFields([
            {
                name: "Game",
                value: stream.gameName,
                inline: true,
            },
            {
                name: "Viewer Count",
                value: String(stream.viewers),
                inline: true,
            }
        ])
        .setTimestamp(stream.startDate)
        .setFooter({text: `${user.display_name} : Live 🔴`, iconURL: user.profile_image_url});
}

/**
 * Fired when a streamer goes live
 * @param {TwitchUser} user 
 * @param {HelixStream} stream 
 * @param {number} liveLogId
 */
const streamerLive = (user, stream, liveLogId) => {
    let announcementChannels = [];

    const bridges = api.Bridge.getBridgesByUser(user.id);
    bridges.forEach(bridge => {
        if (!announcementChannels.find(x => x.id === bridge.channel.id)) announcementChannels.push(bridge.channel);
    });

    const listeners = api.LiveListener.getListenersByUser(user.id);
    listeners.forEach(listener => {
        if (!announcementChannels.find(x => x.id === listener.channel.id)) announcementChannels.push(listener.channel);
    });
    
    const embed = liveEmbed(user, stream);

    announcementChannels.forEach(channel => {
        channel.send({embeds: [embed]}).then(message => {
            con.query("insert into bridge__live_message (message_id, channel_id, live_id) values (?, ?, ?);", [
                message.id,
                channel.id,
                liveLogId,
            ], err => {
                if (err) api.Logger.warning(err);
            });
        });
    });
}

/**
 * Fired when a streamer goes offline
 * @param {TwitchUser} user 
 * @param {number} liveLogId
 */
const streamerOffline = async (user, liveLogId) => {
    let averageViewership = 0;
    let minimumViewership = 0;
    let maximumViewership = 0;
    let activityCount = 1; // 1 instead of 0 to prevent / 0
    try {
        const res = await con.pquery("select avg(viewers) as avg_viewership, min(viewers) as min_viewership, max(viewers) as max_viewership, count(viewers) as activity_count from bridge__live_activity where live_id = ?;", [liveLogId]);
        if (res.length > 0) {
            averageViewership = res[0].avg_viewership;
            minimumViewership = res[0].min_viewership;
            maximumViewership = res[0].max_viewership;
            activityCount = res[0].activity_count;
        }
    } catch(err) {
        api.Logger.warning(err);
    }
    let gameViewership = [];
    try {
        gameViewership = await con.pquery("select distinct game_name, count(game_name) as activity_count, avg(viewers) as avg_viewership, min(viewers) as min_viewership, max(viewers) as max_viewership from bridge__live_activity where live_id = ?;", [liveLogId]);
    } catch(err) {
        api.Logger.warning(err);
    }

    const gameTable = api.stringTable([
        ["Game Name", "% Stream", "Avg.", "Min.", "Max."],
        ...gameViewership.map(x => [
            x.game_name,
            Math.floor(x.activity_count / activityCount * 100) + "%",
            String(Math.floor(x.avg_viewership)),
            String(x.min_viewership),
            String(x.max_viewership),
        ]),
    ]);

    const embed = new EmbedBuilder()
        .setAuthor({name: `⚫ ${user.display_name} is offline`})
        .setTitle("Stream Overview")
        .setURL(`https://twitch.tv/${user.login}`)
        .setDescription(codeBlock(`Average Viewership: ${Math.floor(averageViewership)}\nMinimum Viewership: ${minimumViewership}\nMaximum Viewership: ${maximumViewership}`))
        .setFields([
            {
                name: "Game Overview",
                value: codeBlock(gameTable),
                inline: false,
            }
        ])
        .setFooter({text: `${user.display_name} : Offline ⚫`, iconURL: user.profile_image_url});

    con.query("select message_id, channel_id from bridge__live_message where live_id = ?;", [
        liveLogId
    ], async (err, res) => {
        if (err) {
            api.Logger.warning(err);
            return;
        }
        for (let i = 0; i < res.length; i++) {
            const row = res[i];
            try {
                const channel = await global.client.discord.channels.fetch(row.channel_id);
                const message = await channel.messages.fetch(row.message_id);
                await message.edit({embeds: [embed]});
            } catch(err2) {
                api.Logger.warning(err2);
            }
        }
    });
}

/**
 * Fired when a streamers activity should be updated, per ACTIVITY_INTERVAL
 * @param {TwitchUser} user 
 * @param {HelixStream} stream 
 * @param {number} liveLogId
 */
const activityUpdate = async (user, stream, liveLogId) => {
    con.query("select message_id, channel_id from bridge__live_message where live_id = ?;", [
        liveLogId
    ], async (err, res) => {
        if (err) {
            api.Logger.warning(err);
            return;
        }
        for (let i = 0; i < res.length; i++) {
            const row = res[i];
            try {
                const channel = await global.client.discord.channels.fetch(row.channel_id);
                const message = await channel.messages.fetch(row.message_id);
                const embed = liveEmbed(user, stream);
                await message.edit({embeds: [embed]});
            } catch(err2) {
                api.Logger.warning(err2);
            }
        }
    });
}

const ACTIVITY_INTERVAL = 10;

const interval = {
    time: 15000,
    execute: async () => {
        let users = [];
        api.Bridge.bridges.forEach(bridge => {
            if (!users.includes(bridge.user.id)) users.push(bridge.user.id);
        });
        api.LiveListener.listeners.forEach(listener => {
            if (!users.includes(listener.user.id)) users.push(listener.user.id);
        });

        let userList = [];
        let streams = [];

        const getStreams = async () => {
            try {
                const retrievedStreams = await api.Twitch.Direct.helix.streams.getStreams({
                    limit: 100,
                    userId: userList,
                });

                streams = [
                    ...streams,
                    ...retrievedStreams.data,
                ];

                userList = [];
            } catch (err) {
                api.Logger.severe(err);
            }
        }

        for (let i = 0; i < users.length; i++) {
            userList = [
                ...userList,
                users[i]
            ];

            if (userList.length === 100) await getStreams();
        }

        if (userList.length > 0) await getStreams();

        const recordedStreams = await con.pquery("select id, user_id from bridge__live where end_time is null;");

        const recordActivity = async (stream, user, liveId, fireEvent = true) => {
            let gameBoxArt = null;
            try {
                gameBoxArt = (await stream.getGame())?.boxArtUrl;
            } catch(err) {
                api.Logger.warning(err);
            }
            await con.pquery("insert into bridge__live_activity (live_id, game_name, game_boxart, viewers) values (?, ?, ?, ?);", [
                liveId,
                stream.gameName,
                gameBoxArt,
                stream.viewers,
            ]);
            if (fireEvent) activityUpdate(user, stream, liveId);
        }

        for (let i = 0; i < streams.length; i++) {
            const stream = streams[i];
            const recordedStream = recordedStreams.find(x => x.user_id == stream.userId);
            if (!recordedStream) {
                const user = await api.Twitch.getUserById(stream.userId, false, true);
                con.query("insert into bridge__live (user_id) values (?);", [
                    user.id,
                ], err => {
                    if (!err) {
                        con.query("select id from bridge__live where user_id = ? order by id desc limit 1;", [
                            user.id,
                        ], async (err2, res) => {
                            if (!err2) {
                                if (res.length > 0) {
                                    streamerLive(user, stream, res[0].id);
                                    recordActivity(stream, user, res[0].id, false);
                                } else api.Logger.warning("Unable to retrieve found live entry");
                            } else api.Logger.warning(err2);
                        });
                    } else api.Logger.warning(err);
                });
            } else if (count % ACTIVITY_INTERVAL === 0) {
                recordActivity(stream, await api.Twitch.getUserById(stream.userId, false, true), recordedStream.id);
            }
        }

        for (let i = 0; i < recordedStreams.length; i++) {
            const stream = recordedStreams[i];
            if (!streams.find(x => x.userId == stream.user_id)) {
                con.query("update bridge__live set end_time = now() where id = ?;", [stream.id], async err => {
                    if (err) api.Logger.warning(err);
                    streamerOffline(await api.Twitch.getUserById(stream.user_id), stream.id);
                });
            }
        }
        
        count++;
    },
}

module.exports = interval;
