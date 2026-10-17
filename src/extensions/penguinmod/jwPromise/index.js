const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');
const Timer = require('../../../util/timer');

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

const PromiseStatus = {
    REJECTED: -1,
    PENDING: 0,
    FUFILLED: 1
}

class PromiseType {
    customId = "jwPromise"

    constructor(promise = new Promise(_=>0)) {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;

            promise.then(resolve, reject);
        });
        this.status = PromiseStatus.PENDING;
        this.result = null;

        this.timer = new Timer();
        this.timer.start();
        
        this.promise.then(v => {
            this.status = PromiseStatus.FUFILLED;
            this.timer = this.timer.timeElapsed();
            this.result = v;
        }, v => {
            this.status = PromiseStatus.REJECTED;
            this.timer = this.timer.timeElapsed();
            this.result = v;
        });
    }

    static toPromise(x) {
        if (x instanceof PromiseType) return x;
        return new PromiseType();
    }

    static fromBlockID(blockID, thread) {
        let newThread = vm.runtime._pushThread(
            blockID,
            thread.target
        );

        const x = new jwPromise.Type(new Promise((resolve, reject) => {
            newThread._jwPromise = {resolve, reject};
        }));
        newThread._jwPromise.type = x;

        return x;
    }

    static fromThread(blockID, thread, func = function* () {}) {
        let newThread = vm.runtime._pushThread(
            blockID,
            thread.target
        );

        const x = new jwPromise.Type(new Promise((resolve, reject) => {
            newThread._jwPromise = {resolve, reject};
        }));
        newThread._jwPromise.type = x;

        newThread.generator = func(newThread, newThread._jwPromise);

        return x;
    }

    toString() {
        switch (this.status) {
            case PromiseStatus.REJECTED: return 'rejected';
            case PromiseStatus.PENDING: return 'pending';
            case PromiseStatus.FUFILLED: return 'fufilled';
        }
    }

    toReporterContent() {
        let text;

        switch (this.status) {
            case PromiseStatus.REJECTED:
                text = '<span style="color: #d32;">&lt;Rejected&gt;</span>';
                break;
            case PromiseStatus.PENDING:
                text = '<span style="opacity: 0.75;">&lt;Pending&gt;</span>';
                break;
            case PromiseStatus.FUFILLED:
                text = '<span style="color: #2d3;">&lt;Fufilled&gt;</span>';
                break;
        }

        return span(`Promise${text}`);
    }

    await = function*() {
        switch (this.status) {
            case PromiseStatus.REJECTED: throw this.result;
            case PromiseStatus.FUFILLED: return this.result;
        }
        
        let completed = false;
        let error = false;
        let value = null;
        this.promise.then(v => {
            value = v;
            completed = true;
        }, v => {
            value = v;
            completed = true;
            error = true;
        });

        while (!completed) yield;
        if (error) throw value;
        return value;
    }
}

const jwPromise = {
    Type: PromiseType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "jwPromise",
        disableMonitor: true
    },
    Argument: {
        check: ["jwPromise"]
    }
}

class Extension {
    constructor() {
        vm.jwPromise = jwPromise;
        vm.runtime.registerSerializer(
            "jwPromise", 
            v => null, 
            v => new jwPromise.Type()
        );
        
        vm.extensionManager.extendCompiler("jwPromise", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "jwPromise",
            name: "Promises",
            color: "#25d8c0",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYigzNywgMjE2LCAxOTIpOyBzdHJva2U6IHJnYigzMCwgMTczLCAxNTQpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDcuNTE1IDQuNTE1IEwgMTIuNDg1IDQuNTE1IEMgMTQuMTQyIDQuNTE1IDE1LjQ4NSA1Ljg1OCAxNS40ODUgNy41MTUgTCAxNS40ODUgMTIuNDg1IEMgMTUuNDg1IDE0LjE0MiAxNC4xNDIgMTUuNDg1IDEyLjQ4NSAxNS40ODUgTCA3LjUxNSAxNS40ODUgQyA1Ljg1OCAxNS40ODUgNC41MTUgMTQuMTQyIDQuNTE1IDEyLjQ4NSBMIDQuNTE1IDcuNTE1IEMgNC41MTUgNS44NTggNS44NTggNC41MTUgNy41MTUgNC41MTUgWiBNIDEyLjY3NyA3LjY1OCBDIDEyLjY3NyA2LjkxOSAxMi4wNzggNi4zMTkgMTEuMzM4IDYuMzE5IEwgOC42NjIgNi4zMTkgQyA3LjkyMyA2LjMxOSA3LjMyMyA2LjkxOSA3LjMyMyA3LjY1OCBMIDcuMzIzIDEzLjAxMSBDIDcuMzIzIDEzLjUyNiA3Ljg4MSAxMy44NDkgOC4zMjcgMTMuNTkxIEMgOC41MzUgMTMuNDcxIDguNjYyIDEzLjI1MSA4LjY2MiAxMy4wMTEgTCA4LjY2MiAxMC4zMzQgTCAxMS4zMzggMTAuMzM0IEMgMTIuMDc4IDEwLjMzNCAxMi42NzcgOS43MzUgMTIuNjc3IDguOTk2IFogTSAxMS4zMzggNy42NTggTCAxMS4zMzggOC45OTYgTCA4LjY2MiA4Ljk5NiBMIDguNjYyIDcuNjU4IFoiIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: "simplePromise",
                    text: "new promise",
                    ...jwPromise.Block
                },
                {
                    opcode: "newPromise",
                    text: "new promise [THIS]",
                    arguments: {
                        THIS: {
                            fillIn: "thisPromise"
                        }
                    },
                    branches: [{}],
                    ...jwPromise.Block
                },
                {
                    opcode: "thisPromise",
                    text: "this promise",
                    hideFromPalette: true,
                    canDragDuplicate: true,
                    ...jwPromise.Block
                },
                {
                    opcode: "resolve",
                    text: "resolve [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    }
                },
                {
                    opcode: "reject",
                    text: "reject [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    }
                },
                "---",
                {
                    opcode: "await",
                    text: "await [PROMISE]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    dualBlock: true,
                    arguments: {
                        PROMISE: jwPromise.Argument
                    }
                },
                {
                    opcode: "awaitR",
                    text: "await [PROMISE]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    hideFromPalette: true,
                    arguments: {
                        PROMISE: jwPromise.Argument
                    }
                },
                "---",
                {
                    opcode: "resolveExternal",
                    text: "resolve [PROMISE] with [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PROMISE: jwPromise.Argument,
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    }
                },
                {
                    opcode: "rejectExternal",
                    text: "reject [PROMISE] with [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PROMISE: jwPromise.Argument,
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    }
                },
                "---",
                {
                    opcode: "getStatus",
                    text: "status of [PROMISE]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        PROMISE: jwPromise.Argument
                    }
                },
                {
                    opcode: "getTimer",
                    text: "time pending on [PROMISE]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        PROMISE: jwPromise.Argument
                    }
                }
            ]
        };
    }

    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            AWAIT: 'jwPromise.await',
            AWAIT_R: 'jwPromise.awaitR',
            NEW: 'jwPromise.new',
            REJECT: 'jwPromise.reject',
            RESOLVE: 'jwPromise.resolve'
        };

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwPromise_newPromise':
                            return new IntermediateInput(opcodes.NEW, InputType.CUSTOM_TYPE, {
                                blockID: block.inputs.SUBSTACK?.block,
                                substack: this.descendSubstack(block, 'SUBSTACK')
                            });
                        case 'jwPromise_await':
                        case 'jwPromise_awaitR':
                            return new IntermediateInput(opcodes.AWAIT_R, InputType.ANY, {
                                promise: this.descendInputOfBlock(block, 'PROMISE')
                            }, true);
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwPromise_await':
                            return new IntermediateStackBlock(opcodes.AWAIT, {
                                promise: this.descendInputOfBlock(block, 'PROMISE')
                            }, true);
                        case 'jwPromise_reject':
                            return new IntermediateStackBlock(opcodes.REJECT, {
                                data: this.descendInputOfBlock(block, 'DATA')
                            })
                        case 'jwPromise_resolve':
                            return new IntermediateStackBlock(opcodes.RESOLVE, {
                                data: this.descendInputOfBlock(block, 'DATA')
                            })
                    }
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.NEW: {
                            if (!node.blockID) {
                                return "(new vm.jwPromise.Type())";
                            } else {
                                let stack = this.descendStackInline(node.substack, {allowReturns: false, jwPromise: true});
                                return `vm.jwPromise.Type.fromThread("${node.blockID}", thread, function*(thread, _jwPromise) {\n${stack}\nruntime.sequencer.retireThread(thread);\n})`;
                            }
                        }
                        case opcodes.AWAIT_R:
                            return `(yield* (vm.jwPromise.Type.toPromise(${this.descendInput(node.promise)})).await())`;
                    }
                },
                command(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.AWAIT:
                            this.source += `yield* (vm.jwPromise.Type.toPromise(${this.descendInput(node.promise)})).await();\n`;
                            return true;
                        case opcodes.REJECT:
                            if (this.jwPromise) {
                                this.source += `_jwPromise.reject(${this.descendInput(node.data)});\n`;
                            } else {
                                this.source += `if (thread._jwPromise) thread._jwPromise.reject(${this.descendInput(node.data)});\n`;
                            }
                            return true;
                        case opcodes.RESOLVE:
                            if (this.jwPromise) {
                                this.source += `_jwPromise.resolve(${this.descendInput(node.data)});\n`;
                            } else {
                                this.source += `if (thread._jwPromise) thread._jwPromise.resolve(${this.descendInput(node.data)});\n`;
                            }
                            return true;
                    }
                }
            }
        }
    }

    simplePromise() {
        return new jwPromise.Type();
    }

    thisPromise({}, util) {
        return util.thread._jwPromise ? util.thread._jwPromise.type : new jwPromise.Type();
    }

    resolveExternal({DATA, PROMISE}) {
        PROMISE = jwPromise.Type.toPromise(PROMISE);
        PROMISE.resolve(DATA);
    }

    rejectExternal({DATA, PROMISE}) {
        PROMISE = jwPromise.Type.toPromise(PROMISE);
        PROMISE.reject(DATA);
    }

    getStatus({PROMISE}) {
        PROMISE = jwPromise.Type.toPromise(PROMISE);
        return PROMISE.toString();
    }

    getTimer({PROMISE}) {
        PROMISE = jwPromise.Type.toPromise(PROMISE);
        return Cast.toNumber(PROMISE.timer) / 1000;
    }
}

module.exports = Extension