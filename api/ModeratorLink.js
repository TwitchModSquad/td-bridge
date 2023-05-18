const FullIdentity = require("./FullIdentity");

class ModeratorLink {
    /**
     * Identity of the moderator for part of the link
     * 
     * @type {FullIdentity}
     */
    modForIdentity;

    /**
     * Identity of the moderator part of the link
     * 
     * @type {FullIdentity}
     */
    modIdentity;

    /**
     * Whether or not TMS recognizes this as an active moderator link.
     * 
     * @type {boolean}
     */
    active;

    /**
     * Constructs a new ModeratorLink
     * @param {FullIdentity} modForIdentity 
     * @param {FullIdentity} modIdentity 
     * @param {boolean} active 
     */
    constructor(modForIdentity, modIdentity, active) {
        this.modForIdentity = modForIdentity;
        this.modIdentity = modIdentity;
        this.active = active;
    }
}

module.exports = ModeratorLink;