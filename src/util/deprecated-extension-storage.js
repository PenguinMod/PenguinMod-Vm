/**
 * @overview
 * Utility for creating a proxy object that warns extension authors to not use the runtime.extensionStorage
 * or target.extensionStorage APIs, as they're both deprecated.
 */

/**
 * A set of extensions that have been warned. A set is used for performance reasons.
 */
const WARNED_EXTENSIONS = new Set();

/**
 * Creates the actual proxy object.
 * @param {object.<string, any>} [default_content] Used by the deserializer to set the values of extensionStorage.
 * @return {Proxy} The extension storage proxy class
 */
const ExtensionStorage = (default_content = {}) => {
  return new Proxy(
    default_content,
    {
      set: function (target, key, value) {
        if (!WARNED_EXTENSIONS.has(key)) {
            console.warn("extensionStorage APIs are deprecated. Please avoid using them in your extensions.");
            WARNED_EXTENSIONS.add(key);
        }
        target[key] = value;
        return key in target && target[key] === value;
      },
    }
  );
};

module.exports = ExtensionStorage;
