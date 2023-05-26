const express = require("express");
const router = express.Router();
const api = require("../../api/");
const con = require("../../database");
const {cache} = require("../../discord/listeners/selectMenu/setup");
const FullIdentity = require("../../api/FullIdentity");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

router.get("/", async (req, res) => {
    const {query, cookies} = req;
    const {code, scope} = query;

    if (code) {
        const oauthData = await api.Authentication.Twitch.getToken(code);

        if (oauthData.hasOwnProperty("status") && oauthData.status === 400) {
            if (scope) {
                res.redirect(api.Authentication.Twitch.getURL(scope));
            } else {
                res.send("OAuth failed and no scopes were provided to relay");
            }
            return;
        }

        let user;
        try {
            user = await api.Authentication.Twitch.getUser(oauthData.access_token);
        } catch (err) {
            api.Logger.warning(err);
            res.send("Failed to get user. Try again");
        }
        
        let twitchUser = null;
        try {
            twitchUser = await api.Twitch.getUserById(user.id, false, true);
            try {
                await api.Token.addToken(twitchUser, oauthData.refresh_token, oauthData.scope);
            } catch(err) {
                api.Logger.warning(err);
            }
        }catch(err) {
            res.send("Failed to get user");
            return;
        }
        
        if (cookies?.setup_channel && cache.hasOwnProperty(cookies.setup_channel)) {
            let foundChannel = cache[cookies.setup_channel];

            if (foundChannel.type !== "Interactive" && foundChannel.type !== "Message Stack") {
                res.send("Invalid type provided: " + foundChannel.type);
                return;
            }

            let discordUser = null;
            let identity = null;
            try {
                discordUser = await api.Discord.getUserById(foundChannel.member.id, false, true);
            } catch(err) {
                api.Logger.severe(err);
                res.send("We failed to retrieve your user from the TMS database. Please ask for support https://support.tms.to");
                return;
            }

            if (twitchUser.identity?.id) {
                identity = twitchUser.identity;
            }
            if (discordUser.identity?.id) {
                if (identity && discordUser.identity?.id !== identity?.id) {
                    res.send("Identity mismatch! We already have both your Discord and Twitch account correlated to different accounts. Please ask for support https://support.tms.to/");
                    return;
                } else {
                    identity = discordUser.identity;
                }
            }

            if (!identity) {
                identity = new FullIdentity(null, twitchUser.display_name, false, false, false, [twitchUser], [discordUser]);
            } else {
                identity = await api.getFullIdentity(identity.id);
                if (!identity.twitchAccounts.find(x => x.id === twitchUser.id))
                    identity.twitchAccounts.push(twitchUser);
                if (!identity.discordAccounts.find(x => x.id === discordUser.id))
                    identity.discordAccounts.push(discordUser);
            }

            await identity.post();

            if (oauthData.scope.includes("moderation:read")) {
                api.Authentication.Twitch.getMods(oauthData.access_token).then(mods => {
                    mods.forEach(mod => {
                        con.query("insert into twitch__role (user_id, streamer_id, role) values (?, ?, 'moderator') on duplicate key update updated = now();", [
                            mod.id,
                            twitchUser.id,
                        ], err => {
                            if (err) api.Logger.warning(err);
                        });
                    });
                }, api.Logger.warning);
            }

            try {
                const bridge = await api.Bridge.addBridge(twitchUser, foundChannel.type, foundChannel.channel);
                res.render("pages/authorize/createdBridge", {bridge: bridge});

                const embed = new EmbedBuilder()
                    .setTitle("Bridge created!")
                    .setColor(0x772ce8)
                    .setDescription(`This channel is setup as a bridge to the Twitch channel \`${bridge.user.display_name}\`!`)
                    .addFields({
                        name: "Chatting",
                        value: "In order to chat, you must connect your Twitch account using the `/connect` command or clicking [here](" + api.Authentication.Twitch.getURL("chat:read chat:edit") + ")."
                    });

                bridge.channel.send({embeds: [embed]}).then(message => {
                    message.pin({reason: "Pin connection details"}).catch(err => {
                        api.Logger.warning(err);
                    });
                }, err => {
                    api.Logger.warning(err);
                });

                try {
                    await bridge.channel.guild.roles.fetch();
                } catch(err) {
                    api.Logger.warning(err);
                }

                bridge.channel.edit({
                    topic: `TDBridge to ${bridge.user.display_name}! Use the /connect command to connect your account and chat!`,
                    reason: "Edit permission overwrites and topic",
                }).catch(api.Logger.warning);

                bridge.channel.permissionOverwrites.set([
                    [
                        {
                            id: bridge.channel.guild.roles.everyone,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                            ],
                            deny: [
                                PermissionsBitField.Flags.SendMessagesInThreads,
                                PermissionsBitField.Flags.CreatePublicThreads,
                                PermissionsBitField.Flags.CreatePrivateThreads,
                                PermissionsBitField.Flags.EmbedLinks,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.UseExternalEmojis,
                                PermissionsBitField.Flags.UseExternalStickers,
                                PermissionsBitField.Flags.SendTTSMessages,
                                PermissionsBitField.Flags.SendVoiceMessages,
                            ],
                        },
                        {
                            id: bridge.channel.guild.roles.botRoleFor(bridge.channel.client.user),
                            allow: [
                                PermissionsBitField.Flags.ManageMessages,
                            ],
                        },
                    ]
                ]).catch(api.Logger.warning);

                delete cache[cookies.setup_channel];
            } catch(err) {
                api.Logger.warning(err);
                res.send("An unexpected error occurred while creating the bridge!");
            }
        } else {
            res.render("pages/authorize/connected", {user: twitchUser});
        }
    } else {
        res.send("No code provided");
    }
});

router.get("/setup/:setup", (req, res) => {
    if (cache.hasOwnProperty(req.params.setup)) {
        let foundChannel = cache[req.params.setup];
        res.cookie("setup_channel", foundChannel.channel.id);
        res.render("pages/authorize/channel", {channel: foundChannel, twitchURI: api.Authentication.Twitch.getURL("moderation:read moderator:manage:announcements moderator:manage:chat_messages chat:edit chat:read")});
    } else {
        res.send("Invalid setup ID")
    }
});

router.get("/connect/:streamer/:connect", async (req, res) => {
    try {
        const streamer = await api.Twitch.getUserById(req.params.streamer);
        const user = await api.Discord.getUserById(req.params.connect);
        const roles = await streamer.getRoles();
        if (roles.find(x => x.role === "moderator" && x.streamer.id))
        res.render("pages/authorize/connect", {user: user, twitchURI: api.Authentication.Twitch.getURL("chat:read chat:edit moderator:manage:chat_messages moderator:manage:banned_users moderator:manage:announcements")});
    } catch(err) {
        res.send("Unable to get Discord user or streamer!");
    }
});

router.get("/connect/:connect", async (req, res) => {
    try {
        const user = await api.Discord.getUserById(req.params.connect);
        res.render("pages/authorize/connect", {user: user, twitchURI: api.Authentication.Twitch.getURL("chat:read chat:edit")});
    } catch(err) {
        res.send("Unable to get Discord user!");
    }
});

module.exports = router;
