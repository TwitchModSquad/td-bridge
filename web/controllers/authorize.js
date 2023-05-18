const express = require("express");
const router = express.Router();
const api = require("../../api/");
const con = require("../../database");
const {cache} = require("../../discord/listeners/selectMenu/setup");
const FullIdentity = require("../../api/FullIdentity");

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
                await api.Token.addToken(await api.Twitch.getUserById(), oauthData.refresh_token, oauthData.scope);
            } catch(err) {
                api.Logger.warning(err);
                console.log('add token')
            }
        }catch(err) {
            res.send("Failed to get user");
            return;
        }

        if (cookies && cookies.hasOwnProperty("setup_channel") && cache.hasOwnProperty(cookies.setup_channel)) {
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
                res.send("Created bridge: " + bridge.id);
                delete cache[cookies.setup_channel];
            } catch(err) {
                api.Logger.warning(err);
                res.send("An unexpected error occurred while creating the bridge!");
            }
        } else {
            res.send("Success!");
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

module.exports = router;
