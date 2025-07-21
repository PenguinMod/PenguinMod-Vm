/**
 * Types of block shapes
 * @enum {number}
 */
const BlockShape = {
    /**
     * Output shape: hexagonal (booleans/predicates).
     */
    HEXAGONAL: 1,

    /**
     * Output shape: rounded (numbers/strings).
     */
    ROUND: 2,

    /**
     * Output shape: squared (arrays).
     */
    SQUARE: 3,

    /**
     * pm: Output shape: leaf-ed (vectors).
     */
    LEAF: 4,

    /**
     * pm: Output shape: plus (objects/classes or class instances).
     */
    PLUS: 5,

    /**
     * pm: Output shape: octagonal (Scratch targets).
     */
    OCTAGONAL: 6,

    /**
     * pm: Output shape: bumped (BigInt).
     */
    BUMPED: 7,

    /**
     * pm: Output shape: indented (Symbols).
     */
    INDENTED: 8,

    /**
     * pm: Output shape: scrapped (Maps).
     */
    SCRAPPED: 9,

    /**
     * pm: Output shape: arrow (Sets).
     */
    ARROW: 10,

    /**
     * pm: Output shape: ticket (Dates).
     */
    TICKET: 11,
};

module.exports = BlockShape;
