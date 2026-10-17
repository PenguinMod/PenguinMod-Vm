/**
 * TODO: implement on port
 * Types of argument alignments
 * @enum {string?}
 */
const ArgumentAlignment = {
    /**
     * Default alignment
     */
    DEFAULT: null,

    /**
     * Left alignment (usually default)
     */
    LEFT: 'LEFT',

    /**
     * Center alignment (used by the variable getter blocks)
     */
    CENTER: 'CENTRE',

    /**
     * Right alignment (used by loop indicators)
     */
    RIGHT: 'RIGHT',
};

module.exports = ArgumentAlignment;
