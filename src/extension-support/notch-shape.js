// Use the constants instead of manually redefining them again
const ScratchBlocksConstants = require('../engine/scratch-blocks-constants');

/**
 * Types of block notch/nub shapes
 * @enum {string}
 */
const NotchShape = {
    /**
     * Notch shape: switchCase (switch-case).
     */
    SWITCH: ScratchBlocksConstants.NOTCH_SHAPE_SWITCH_CASE,

    /**
     * Notch shape: hexagonal (booleans/predicates).
     */
    HEXAGON: ScratchBlocksConstants.NOTCH_SHAPE_HEXAGON,

    /**
     * Notch shape: rounded (numbers/strings).
     */
    ROUND: ScratchBlocksConstants.NOTCH_SHAPE_ROUND,

    /**
     * Notch shape: squared (arrays/array buffers/uint arrays).
     */
    SQUARE: ScratchBlocksConstants.NOTCH_SHAPE_SQUARE,

    /**
     * pm: Notch shape: leaf-ed (vectors).
     */
    LEAF: ScratchBlocksConstants.NOTCH_SHAPE_LEAF,

    /**
     * pm: Notch shape: plus (objects/classes or class instances).
     */
    PLUS: ScratchBlocksConstants.NOTCH_SHAPE_PLUS,

    /**
     * pm: Notch shape: octagonal (Scratch targets).
     */
    OCTAGONAL: ScratchBlocksConstants.NOTCH_SHAPE_OCTAGONAL,

    /**
     * pm: Notch shape: bumped (BigInt).
     */
    BUMPED: ScratchBlocksConstants.NOTCH_SHAPE_BUMPED,

    /**
     * pm: Notch shape: indented (Symbols).
     */
    INDENTED: ScratchBlocksConstants.NOTCH_SHAPE_INDENTED,

    /**
     * pm: Notch shape: scrapped (Maps).
     */
    SCRAPPED: ScratchBlocksConstants.NOTCH_SHAPE_SCRAPPED,

    /**
     * pm: Notch shape: arrow (Sets).
     */
    ARROW: ScratchBlocksConstants.NOTCH_SHAPE_ARROW,

    /**
     * pm: Notch shape: ticket (Dates).
     */
    TICKET: ScratchBlocksConstants.NOTCH_SHAPE_TICKET,

    /**
     * these notches dont really coresspond to any data type
     */
    JIGSAW: ScratchBlocksConstants.NOTCH_SHAPE_JIGSAW,
    INVERTED: ScratchBlocksConstants.NOTCH_SHAPE_INVERTED,
    PINCER: ScratchBlocksConstants.NOTCH_SHAPE_PINCER,
};

module.exports = NotchShape;