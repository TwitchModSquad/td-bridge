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
        con.query("select id, user_id, token, scopes from twitch__token where type = 'tdbridge';", async (err, res) => {
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
     * Adds a token to the database and cache
     * @param {TwitchUser} user 
     * @param {string} token 
     * @param {string[]} scopes
     * @returns {Promise<Token>}
     */
    addToken(user, token, scopes) {
        return new Promise((resolve, reject) => {
            con.query("insert into twitch__token (user_id, token, scopes, type) values (?, ?, ?, 'tdbridge');", [
                user.id,
                token,
                scopes.join("-"),
            ], err => {
                if (!err) {
                    con.query("select id from twitch__token where user_id = ? and token = ? and scopes = ? and type = 'tdbridge' order by id desc;", [
                        user.id,
                        token,
                        scopes.join("-"),
                    ], (err, res) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (res.length > 0) {
                            const newToken = new Token(
                                res[0].id,
                                user,
                                token,
                                scopes
                            );

                            resolve(newToken);

                            this.tokens = this.tokens.filter(x => !(x.user.id === user.id && x.scopes.join("-") === scopes.join("-")));
                            this.tokens.push(newToken);

                            con.query("delete from twitch__token where user_id = ? and scopes = ? and created < date_sub(now(), interval 1 minute) and type = 'tdbridge';", [
                                user.id,
                                scopes.join("-"),
                            ], err => {
                                if (err) global.api.Logger.warning(err);
                            });
                        } else
                            reject("Unable to retrieve token");
                    });
                } else reject(err);
            });
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

            client.connect().catch(err => {
                reject(err);
            });
        });
    }

}

module.exports = TokenManager;
