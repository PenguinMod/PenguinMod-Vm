// @ts-check

const BlockUtility = require('../engine/block-utility');

class CompatibilityLayerBlockUtility extends BlockUtility {
    constructor () {
        super();
        this._stackFrame = {};
        this._startedBranch = null;
    }

    get stackFrame () {
        return this.thread?.compatibilityStackFrame;
    }

    startBranch (branchNumber, isLoop = false) {
        this._startedBranch = [branchNumber, isLoop];
    }

    startProcedure () {
        throw new Error('startProcedure is not supported by this BlockUtility');
    }

    // Parameters are not used by compiled scripts.
    initParams () {
        throw new Error('initParams is not supported by this BlockUtility');
    }
    pushParam () {
        throw new Error('pushParam is not supported by this BlockUtility');
    }
    getParam () {
        throw new Error('getParam is not supported by this BlockUtility');
    }

    init (thread, fakeBlockId, stackFrame) {
        this.thread = thread;
        this.sequencer = thread.target.runtime.sequencer;
        this._startedBranch = null;
        thread.stack[0] = fakeBlockId;
        thread.compatibilityStackFrame = stackFrame;
    }
}

// Export a single instance to be reused.
module.exports = new CompatibilityLayerBlockUtility();
