/**
 * Types of block notch/nub shapes
 * @enum {string}
 */
const NotchShape = {
    /**
     * Notch shape: switchCase (switch-case).
     */
    SWITCH: "switchCase",

    /**
     * Notch shape: hexagonal (booleans/predicates).
     */
    HEXAGON: "hexagon",

    /**
     * Notch shape: rounded (numbers/strings).
     */
    ROUND: "round",

    /**
     * Notch shape: squared (arrays/array buffers/uint arrays).
     */
    SQUARE: "square",

    /**
     * pm: Notch shape: leaf-ed (vectors).
     */
    LEAF: "leaf",

    /**
     * pm: Notch shape: plus (objects/classes or class instances).
     */
    PLUS: "plus",

    /**
     * pm: Notch shape: octagonal (Scratch targets).
     */
    OCTAGONAL: "octagonal",

    /**
     * pm: Notch shape: bumped (BigInt).
     */
    BUMPED: "bumped",

    /**
     * pm: Notch shape: indented (Symbols).
     */
    INDENTED: "indented",

    /**
     * pm: Notch shape: scrapped (Maps).
     */
    SCRAPPED: "scrapped",

    /**
     * pm: Notch shape: arrow (Sets).
     */
    ARROW: "arrow",

    /**
     * pm: Notch shape: ticket (Dates).
     */
    TICKET: "ticket",

    /**
     * these notches dont really coresspond to any data type
     */
    JIGSAW: "jigsaw",
    INVERTED: "inverted",
    PINCER: "pincer",
};

module.exports = NotchShape;
