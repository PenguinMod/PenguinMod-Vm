const log = require('./log');

/**
 * Escape a string to be safe to use in XML content.
 * CC-BY-SA: hgoebl
 * https://stackoverflow.com/questions/7918868/
 * how-to-escape-xml-entities-in-javascript
 * @param {!string | !Array.<string>} unsafe Unsafe string.
 * @return {string} XML-escaped string, for use within an XML tag.
 */
const xmlEscape = function (unsafe) {
    if (typeof unsafe !== 'string') {
        if (Array.isArray(unsafe)) {
            // This happens when we have hacked blocks from 2.0
            // See #1030
            unsafe = String(unsafe);
        } else {
            log.error(`Unexpected type ${typeof unsafe} in xmlEscape at: ${new Error().stack}`);
            return unsafe;
        }
    }
     let safe = [];

    let i = 0;

    while (true) {
        const charCode = unsafe.charCodeAt(i);
        if (isNaN(charCode)) break;
        if (!(
            (charCode < 0x20 && charCode !== 0x09 && charCode !== 0x0A && charCode !== 0x0D) ||
            (charCode > 0xD7FF && charCode < 0xE000) ||
            (charCode > 0xFFFD))
        ) {
            safe.push(charCode);
        } else {
            safe.push('H'.charCodeAt(0)) // ugly fix
        }
        i++;
    }

    safe = String.fromCharCode(...safe);

    return safe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

/**
 * creates escaped text suitible for attributes
 * @param {string} unsafe the contents to escape
 * @returns {string} escaped contents
 */
const escapeAttribute = unsafe => {
    const escaped = xmlEscape(unsafe);
    return JSON.stringify(escaped).slice(1, -1);
};

module.exports = xmlEscape;
module.exports.escapeAttribute = escapeAttribute;
