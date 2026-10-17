/**
 * These constants are copied from scratch-blocks/core/constants.js
 * @TODO find a way to require() these straight from scratch-blocks... maybe make a scratch-blocks/dist/constants.js?
 * @readonly
 * @enum {int}
 */
const ScratchBlocksConstants = {
    /**
     * ENUM for output shape: hexagonal (booleans/predicates).
     * @const
     */
    OUTPUT_SHAPE_HEXAGONAL: 1,

    /**
     * ENUM for output shape: rounded (numbers/strings/any).
     * @const
     */
    OUTPUT_SHAPE_ROUND: 2,

    /**
     * ENUM for output shape: squared (arrays).
     * @const
     */
    OUTPUT_SHAPE_SQUARE: 3,

    /**
     * ENUM for output shape: leaf (vectors).
     * @const
     */
    OUTPUT_SHAPE_LEAF: 4,

    /**
     * ENUM for output shape: plus (objects/classes or class instances).
     * @const
     */
    OUTPUT_SHAPE_PLUS: 5,

    /**
     * ENUM for output shape: octagonal (scratch targets).
     * @const
     */
    OUTPUT_SHAPE_OCTAGONAL: 6,

    /**
     * ENUM for output shape: bumped (BigInt).
     * @const
     */
    OUTPUT_SHAPE_BUMPED: 7,

    /**
     * ENUM for output shape: indented (XML / html elements).
     * @const
     */
    OUTPUT_SHAPE_INDENTED: 8,

    /**
     * ENUM for output shape: scrapped (maps).
     */
    OUTPUT_SHAPE_SCRAPPED: 9,

    /**
     * ENUM for output shape: arrow (sets).
     * @const
     */
    OUTPUT_SHAPE_ARROW: 10,

    /**
     * ENUM for output shape: ticket (dates).
     * @const
     */
    OUTPUT_SHAPE_TICKET: 11,

    /**
     * ENUM for output shape: slanted (regex).
     * @const
     */
    OUTPUT_SHAPE_SLANTED: 12,

    /**
     * ENUM for notch shape: switch case (switch case)
     * @const
     */
    NOTCH_SHAPE_SWITCH_CASE: 'switchCase',

    /**
     * ENUM for notch shape: hexagon (booleans/predicates)
     * @const
     */
    NOTCH_SHAPE_HEXAGON: 'hexagon',

    /**
     * ENUM for notch shape: rounded (numbers/strings).
     * @const
     */
    NOTCH_SHAPE_ROUND: 'round',

    /**
     * ENUM for notch shape: square (arrays/array buffers/uint arrays).
     * @const
     */
    NOTCH_SHAPE_SQUARE: 'square',

    /**
     * ENUM for notch shape: leaf (vectors).
     * @const
     */
    NOTCH_SHAPE_LEAF: 'leaf',

    /**
     * ENUM for notch shape: plus (objects/classes or class instances).
     * @const
     */
    NOTCH_SHAPE_PLUS: 'plus',

    /**
     * ENUM for notch shape: octagonal (Scratch targets).
     * @const
     */
    NOTCH_SHAPE_OCTAGONAL: 'octagonal',

    /**
     * ENUM for notch shape: bumped (BigInt).
     * @const
     */
    NOTCH_SHAPE_BUMPED: 'bumped',

    /**
     * ENUM for notch shape: indented (Symbols).
     * @const
     */
    NOTCH_SHAPE_INDENTED: 'indented',

    /**
     * ENUM for notch shape: scrapped (Maps).
     * @const
     */
    NOTCH_SHAPE_SCRAPPED: 'scrapped',

    /**
     * ENUM for notch shape: arrow (Sets).
     * @const
     */
    NOTCH_SHAPE_ARROW: 'arrow',

    /**
     * ENUM for notch shape: ticket (Dates).
     * @const
     */
    NOTCH_SHAPE_TICKET: 'ticket',

    /**
     * ENUM for notch shape: pincer.
     * @const
     */
    NOTCH_SHAPE_PINCER: 'pincer',

    /**
     * ENUM for notch shape: inverted.
     * @const
     */
    NOTCH_SHAPE_INVERTED: 'inverted',

    /**
     * ENUM for notch shape: jigsaw.
     * @const
     */
    NOTCH_SHAPE_JIGSAW: 'jigsaw',
};

module.exports = ScratchBlocksConstants;
