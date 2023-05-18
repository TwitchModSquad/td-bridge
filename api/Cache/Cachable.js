/**
 * Indicates an object that may be cached.
 */
class Cachable {

    /**
     * Time that the instance was retrieved (defaults to when the object was created)
     * 
     * @type {number}
     */
    retrieved = new Date().getTime();

}

module.exports = Cachable;