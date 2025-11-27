/*
compiled blocks:
    sensing_set_of: jsgen.js@1195, irgen.js@1420
*/
const Cast = require('../util/cast');

class pmLiveTests {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            looks_setVertTransform: this.setVerticalTransform,
            looks_setHorizTransform: this.setHorizontalTransform
        };
    }

    setVerticalTransform (args, {target}) {
        const percent = Cast.toNumber(args.PERCENT);
        target.setTransform([percent, target.transform[1]]);
    }

    setHorizontalTransform (args, {target}) {
        const percent = Cast.toNumber(args.PERCENT);
        target.setTransform([target.transform[0], percent]);
    }
}

module.exports = pmLiveTests;
