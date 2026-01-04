module.exports = {
    /**
     * Parse a json into an object. if the json is invalid return an empty object
     * @param {string} json the json to parse.
     * @returns {object} The parsed object
     */
    validateJSON: json => {
        let valid = false;
        let object = {};
        try {
            if (!json.startsWith('{')) throw new Error('error lol');
            object = JSON.parse(json);
            valid = true;
        } catch {}

        return {
            object: object,
            json: json,
            isValid: valid
        };
    },

    /**
     * Parse a json array into an array object. if the json is invalid return an empty array
     * @param {string} array the array to parse.
     * @returns {Array} The parsed array
     */
    validateArray: array => {
        let valid = false;
        let allay = [];
        try {
            if (!array.startsWith('[')) throw new Error('error lol');
            allay = JSON.parse(array);
            valid = true;
        } catch {}

        return {
            array: allay,
            json: array,
            isValid: valid
        };
    },

    /**
     * Convert a string to a value that is equal to it when made into a string
     * @param {string} value the the string to convert.
     * @returns {any} The parsed result
     */
    stringToEqivalint: value => {
        // is the value a valid json? if so convert to one else do nothing
        try {
            if (!(value.startsWith('{') || value.startsWith('['))) throw new Error('not actualy a json!!!!!!!!!!');
            value = JSON.parse(value);
        } catch {
            // well its not a json so what is it?
            if (String(Number(value)) === value) {
                value = Number(value);
            } else if (value.toLowerCase() === 'true') {
                value = true;
            } else if (value.toLowerCase() === 'false') {
                value = false;
            } else if (value === 'undefined') {
                value = undefined;
            } else if (value === 'null') {
                value = null;
            }
        }

        return value;
    },

    /**
     * Convert a value to a string (pretty much entirly pointless)
     * @param {any} value the value to convert.
     * @returns {string} The stringified object
     */
    valueToString: value => {
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        } else {
            value = String(value);
        }

        return value;
    },

    /**
     * Check if a regex is valid or not
     * @param {string} value the value to convert.
     * @param {string} regrule the regexp's ruleset
     * @returns {boolean} If the regexp is valid
     */
    validateRegex: (value, regrule) => {
        let valid = false;
        try {
            new RegExp(value, regrule);
            valid = true;
        } catch {}

        return valid;
    }
};
