class UserData {
    constructor () {
        this._username = '';
        this._loggedIn = false;
    }

    /**
     * Handler for updating the username
     * @param {object} data Data posted to this ioDevice.
     * @property {!string} username The new username.
     */
    postData (data) {
        this._username = data.username;
        this._loggedIn = false;
        if (data.loggedIn === true) {
            this._loggedIn = true;
        }
    }

    /**
     * Getter for username. Initially empty string, until set via postData.
     * @returns {!string} The current username
     */
    getUsername () {
        return this._username;
    }

    /**
     * Getter for loggedIn. Will be false, until set via postData.
     * @returns {boolean} The current loggedIn state
     */
    getLoggedIn() {
        return this._loggedIn;
    }
}

module.exports = UserData;
