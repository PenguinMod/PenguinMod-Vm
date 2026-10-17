const ArgumentType = require('../../../extension-support/argument-type');
const BlockShape = require('../../../extension-support/block-shape');
const BlockType = require('../../../extension-support/block-type');
const ImageURI = require('../../../extension-support/image-uri');

const Cast = require('../../../util/cast');

function span(text) {
    let el = document.createElement('span')
    el.innerText = text
    el.style.display = 'hidden'
    el.style.width = '100%'
    el.style.boxSizing = 'border-box'
    el.style.textAlign = 'center'
    return el
}

class LambdaType {
    customId = "jwLambda"

    constructor(func = function*() {}, thread) {
        this.func = func
        this.proc = thread ? thread.procedures : {}
        this.timesExecuted = 0
    }

    static toLambda(x) {
        if (x instanceof LambdaType) return x
        return new LambdaType()
    }

    jwArrayHandler() {
        return 'Lambda'
    }

    toString() {
        return this.func.toString()
    }

    toReporterContent() {
        let root = span(this.toString())
        root.style.display = "block";
        root.style.textAlign = "left";
        root.style.fontFamily = "monospace";
        root.style.fontSize = "1.25em";
        root.style.backgroundColor = "var(--text-primary)";
        root.style.color = "var(--ui-primary)";
        root.style.padding = "4px";
        root.style.borderRadius = "4px";
        return root;
    }

    execute = function* (arg, thread, target, runtime, stage) {
        if (this.proc) thread.procedures = {...this.proc, ...thread.procedures};
        this.timesExecuted++;
        let output = yield* this.func(arg, thread, target, runtime, stage, this);
        return output ?? null;
    }
}

const Lambda = {
    Type: LambdaType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.SQUARE,
        forceOutputType: "Lambda",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.SQUARE,
        check: ["Lambda"]
    }
}

class Extension {
    constructor() {
        if (!vm.jwLambda) {
            const oldRetireThread = Object.getPrototypeOf(vm.runtime.sequencer).retireThread
            Object.getPrototypeOf(vm.runtime.sequencer).retireThread = function(thread) {
                const old = thread.isCompiled
                thread.isCompiled = false
                oldRetireThread.call(this, thread)
                thread.isCompiled = old
            }
        }

        vm.jwLambda = Lambda
        vm.runtime.registerSerializer(
            "jwLambda", 
            v => null, 
            v => new Lambda.Type()
        );
        vm.extensionManager.extendCompiler("jwLambda", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "jwLambda",
            name: "Lambda",
            color: "#c71a4b",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYigxOTksIDI2LCA3NSk7IHN0cm9rZTogcmdiKDE1OSwgMjAsIDYwKTsiIGN4PSIxMCIgY3k9IjEwIiByeT0iOS41IiByeD0iOS41Ij48L2VsbGlwc2U+CiAgPHBhdGggZD0iTSA3LjIzNyA1LjI2NCBDIDEwLjM5NSA1LjI2NCAxMC4zOTUgMTQuNzM2IDEzLjU1MSAxNC43MzYgTSAxMC4wNzkgOS4wNTMgTCA2LjQ0OSAxNC43MzYiIHN0eWxlPSJmaWxsOiBub25lOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2Utd2lkdGg6IDJweDsiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: 'arg',
                    text: 'argument',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    allowDropAnywhere: true,
                    canDragDuplicate: true
                },
                {
                    opcode: 'newLambda',
                    text: 'new lambda [ARG]',
                    hideFromPalette: true,
                    arguments: {
                        ARG: {
                            fillIn: 'arg'
                        }
                    },
                    branches: [{}],
                    ...Lambda.Block
                },
                {
                    blockType: BlockType.XML,
                    xml: `
                    <block type="jwLambda_newLambda">
                        <value name="ARG">
                            <shadow type="jwLambda_arg" />
                        </value>
                        <value name="SUBSTACK">
                            <block type="procedures_return">
                                <value name="VALUE">
                                    <shadow type="text">
                                        <field name="TEXT">1</field>
                                    </shadow>
                                </value>
                            </block>
                        </value>
                    </block>
                    `
                },
                {
                    opcode: 'newLambdaR',
                    text: 'new lambda [ARG] [ARROW] [VALUE]',
                    arguments: {
                        ARG: {
                            fillIn: 'arg'
                        },
                        ARROW: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ARROW,
                            flipRTL: true
                        },
                        VALUE: {
                            type: ArgumentType.STRING
                        }
                    },
                    ...Lambda.Block
                },
                {
                    opcode: 'rawLambdaInput',
                    text: '[FIELD]',
                    hideFromPalette: true,
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE,
                    arguments: {
                        FIELD: {
                            type: ArgumentType.CUSTOM,
                            defaultValue: "function* (arg, thread, target, runtime, stage) {\n  return 1;\n}"
                        }
                    }
                },
                {
                    opcode: 'rawLambda',
                    text: 'new lambda [RAW]',
                    hideFromPalette: true,
                    arguments: {
                        RAW: {
                            fillIn: "rawLambdaInput"
                        }
                    },
                    ...Lambda.Block
                },
                "---",
                {
                    opcode: 'execute',
                    text: 'execute [LAMBDA] with [ARG]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    dualBlock: true,
                    arguments: {
                        LAMBDA: Lambda.Argument,
                        ARG: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    }
                },
                {
                    opcode: 'executeR',
                    text: 'execute [LAMBDA] with [ARG]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    hideFromPalette: true,
                    arguments: {
                        LAMBDA: Lambda.Argument,
                        ARG: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    }
                },
                "---",
                {
                    opcode: 'this',
                    text: 'this lambda',
                    ...Lambda.Block
                },
                {
                    opcode: 'timesExecuted',
                    text: 'times [LAMBDA] executed',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        LAMBDA: Lambda.Argument
                    }
                }
            ]
        };
    }

    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            ARG: 'jwLambda.arg',
            EXECUTE: 'jwLambda.execute',
            NEW: 'jwLambda.new',
            NEW_R: 'jwLambda.newR',
            THIS: 'jwLambda.this',
        };

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwLambda_arg':
                            return new IntermediateInput(opcodes.ARG, InputType.ANY);
                        case 'jwLambda_execute':
                        case 'jwLambda_executeR':
                            return new IntermediateInput(opcodes.EXECUTE, InputType.ANY, {
                                lambda: this.descendInputOfBlock(block, 'LAMBDA'),
                                arg: this.descendInputOfBlock(block, 'ARG')
                            }, true);
                        case 'jwLambda_newLambda':
                            return new IntermediateInput(opcodes.NEW, InputType.ANY, {
                                substack: this.descendSubstack(block, 'SUBSTACK')
                            }, true);
                        case 'jwLambda_newLambdaR':
                            return new IntermediateStackBlock(opcodes.NEW_R, {
                                value: this.descendInputOfBlock(block, 'VALUE')
                            }, true);
                        case 'jwLambda_this':
                            return new IntermediateInput(opcodes.THIS, InputType.ANY);
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwLambda_execute':
                            return new IntermediateStackBlock(opcodes.EXECUTE, {
                                lambda: this.descendInputOfBlock(block, 'LAMBDA'),
                                arg: this.descendInputOfBlock(block, 'ARG')
                            }, true);
                    }
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.ARG:
                            return `(typeof _jwLambdaArgument !== "undefined" ? _jwLambdaArgument : null)`;
                        case opcodes.EXECUTE:
                            return `(yield* vm.jwLambda.Type.toLambda(${this.descendInput(node.lambda)}).execute(${this.descendInput(node.arg)}, thread, target, runtime, stage))`;
                        case opcodes.NEW: {
                            let source = '';
                            source += `(new vm.jwLambda.Type(function*(_jwLambdaArgument, thread, target, runtime, stage, _jwLambdaThis) {\n`;
                            source += this.descendStackInline(node.substack, {allowReturns: true});
                            source += `}, thread))`;
                            return source;
                        }
                        case opcodes.NEW_R: {
                            let source = '';
                            source += `(new vm.jwLambda.Type(function*(_jwLambdaArgument, thread, target, runtime, stage, _jwLambdaThis) {\n`;
                            source += `return ${this.descendInput(node.value)};\n`;
                            source += `}, thread))`;
                            return source;
                        }
                        case opcodes.THIS:
                            return `(typeof _jwLambdaThis !== "undefined" ? _jwLambdaThis : (new vm.jwLambda.Type()))`;
                    }
                },
                command(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.EXECUTE:
                            this.source += `yield* vm.jwLambda.Type.toLambda(${this.descendInput(node.lambda)}).execute(${this.descendInput(node.arg)}, thread, target, runtime, stage);\n`;
                            return true;
                    }
                }
            }
        }
    }
    rawLambdaInput({FIELD}) {
        return FIELD;
    }
    rawLambda({RAW}) {
        return new Lambda.Type();
    }

    timesExecuted({LAMBDA}) {
        LAMBDA = Lambda.Type.toLambda(LAMBDA);
        return LAMBDA.timesExecuted;
    }
}

module.exports = Extension