const tmi = require("tmi.js");

const con = require("../../database");
const config = require("../../config.json");
const TwitchUser = require("../Twitch/TwitchUser");

const Token = require("./Token");

class TokenManager {

    /**
     * Holds Tokens for users
     * @type {Token[]}
     */
    tokens;

    /**
     * Holds TMI clients for users
     */
    clients = {};

    /**
     * Initialize the TokenManager
     */
    init() {
        con.query("select id, user_id, token, scopes from twitch__token;", async (err, res) => {
            if (!err) {
                let tokens = [];
                for (let i = 0; i < res.length; i++) {
                    const token = res[i];
                    tokens.push(new Token(
                        token.id,
                        await global.api.Twitch.getUserById(token.user_id),
                        token.token,
                        token.scopes.split("-"),
                    ));
                }
                this.tokens = tokens;
            } else {
                global.api.Logger.warning(err);
            }
        });
    }

    /**
     * Returns tokens by User and Scope
     * @param {TwitchUser} user 
     * @param {string} scope 
     * @returns {Token[]}
     */
    getTokensByScope(user, scope) {
        return this.tokens.filter(x => x.user.id === user.id && x.scopes.includes(scope));
    }

    /**
     * Returns a TMI client for a user
     * @param {TwitchUser} user 
     * @returns {Promise<tmi.Client>}
     */
    getTMIClient(user) {
        return new Promise(async (resolve, reject) => {
            if (this.clients.hasOwnProperty(String(user.id))) {
                resolve(this.clients[String(user.id)]);
                return;
            }

            let accessToken = null;
            let tokens = this.getTokensByScope(user, "chat:edit");
            for (let i = 0; i < tokens.length; i++) {
                try {
                    accessToken = await tokens[i].getToken();
                    break;
                } catch(err) {
                    global.api.Logger.warning(err);
                }
            }

            if (!accessToken) {
                reject("Failed to retrieve chat:edit access token");
                return;
            }

            let client = new tmi.Client({
                options: {
                    debug: config.developer,
                },
                identity: {
                    username: user.login,
                    password: "oauth:" + accessToken,
                }
            });

            let closeTimeout;
            const resetTimeout = () => {
                if (closeTimeout) clearTimeout(closeTimeout);
                closeTimeout = setTimeout(() => {
                    client.disconnect().catch(api.Logger.warning);
                    delete this.clients[String(user.id)];
                }, 600000);
            };
            resetTimeout();

            client.on("connected", () => {
                resolve(client);
                this.clients[String(user.id)] = client;
            });

            client.on("disconnected", () => {
                delete this.clients[String(user.id)];
                clearTimeout(closeTimeout);
            });

            client.connect();
        });
    }

}

module.exports = TokenManager;
