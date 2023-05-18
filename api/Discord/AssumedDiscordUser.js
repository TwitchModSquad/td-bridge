const DiscordUser = require("./DiscordUser");

const Assumption = require("../Assumption");

class AssumedDiscordUser extends DiscordUser {

    /**
     * Contains assumptions that were used to obtain the DiscordUser.
     * 
     * @type {Assumption[]}
     */
    assumptions;

    /**
     * Constructor for a Discord user
     * @param {DiscordUser} user
     * @param {Assumption[]} assumptions
     */
     constructor(user, assumptions) {
        super("assumed-discord-user", user.id, user.identity, user.name, user.discriminator, user.avatar);

        this.assumptions = assumptions;
    }

    /**
     * Get assumptions where actual value is not the same as the query value
     * 
     * @type {Assumption[]}
     */
    getActiveAssumptions() {
        let newAssumptions = [];

        this.assumptions.forEach(assumption => {
            if (assumption.actualValue.toLowerCase() !== assumption.queryValue.toLowerCase()) {
                newAssumptions = [
                    ...newAssumptions,
                    assumption
                ];
            }
        });

        return newAssumptions;
    }

}

module.exports = AssumedDiscordUser;