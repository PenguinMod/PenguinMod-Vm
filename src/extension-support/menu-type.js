/**
 * Types of a dropdown menu
 * @enum {number}
 */
const MenuType = {
    /**
     * A dropdown that isn't typeable and does not accept reporters
     */
    STRICT: 0,

    /**
     * A dropdown that isn't typeable and but accepts reporters
     */
    ACCEPTING: 1,

    /**
     * A dropdown that is typeable and accepts reporters
     */
    TYPEABLE: 2,

    /**
     * A dropdown that is typeable only via numbers and accepts reporters
     */
    TYPEABLE_NUMERIC: 3,

    /**
     * A dropdown menu for handling variables of built-in variable types or an abitrary extension-defined type
     */
    VARIABLE: 4,
};

module.exports = MenuType;
