/**
 * Block argument types
 * @enum {string}
 */
const ArgumentType = {
    /**
     * Numeric value with angle picker
     */
    ANGLE: 'angle',

    /**
     * Boolean value with hexagonal placeholder
     */
    BOOLEAN: 'Boolean',

    /**
     * Numeric value with color picker
     */
    COLOR: 'color',

    /**
     * Numeric value with text field
     */
    NUMBER: 'number',

    /**
     * String value with text field
     */
    STRING: 'string',

    /**
     * String value with matrix field
     */
    MATRIX: 'matrix',

    /**
     * MIDI note number with note picker (piano) field
     */
    NOTE: 'note',

    /**
     * Inline image on block (as part of the label)
     */
    IMAGE: 'image',

    /**
     * Name of costume in the current target
     */
    COSTUME: 'costume',

    /**
     * Name of sound in the current target
     */
    SOUND: 'sound',

    /**
     * pm: Variable menu
     */
    VARIABLE: 'variable',

    /**
     * pm: List menu
     */
    LIST: 'list',

    /**
     * pm: Broadcast menu
     */
    BROADCAST: 'broadcast',

    /**
     * pm: custom fields
     */
    CUSTOM: 'custom',

    /**
     * pm: expandables
     */
    EXPANDABLE: 'expandable'
};

module.exports = ArgumentType;
