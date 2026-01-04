/**
 * @fileoverview
 * General ScratchX-related utilities used in multiple places.
 * Changing these functions may break projects.
 */

/**
 * @param {string} scratchXName The name the scratchx extension uses
 * @returns {string} The name that should be used in the runtime
 */
const generateExtensionId = scratchXName => {
    const sanitizedName = scratchXName.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return `sbx${sanitizedName}`;
};

/**
 * @param {number} i 0-indexed index of argument in list
 * @returns {string} Scratch 3 argument name
 */
const argumentIndexToId = i => i.toString();

module.exports = {
    generateExtensionId,
    argumentIndexToId
};
