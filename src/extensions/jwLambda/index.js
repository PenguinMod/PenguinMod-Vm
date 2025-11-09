const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

/**
 * @param {number} x
 * @returns {string}
 */
function formatNumber(x) {
    if (x >= 1e6) {
        return x.toExponential(4)
    } else {
        x = Math.floor(x * 1000) / 1000
        return x.toFixed(Math.min(3, (String(x).split('.')[1] || '').length))
    }
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.width = '100%'
    el.style.boxSizing = 'border-box'
    el.style.textAlign = 'center'
    return el
}

function getFunction(x) {
    try {
        let func = (new Function(`return ${x}`))()
        if (Object.getPrototypeOf(func) == Object.getPrototypeOf(function*() {})) return func
    } catch {}
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

    jwArrayHandler(expectsPlainString, context) {
        return 'Lambda'
    }

    toString() {
        return this.func.toString()
    }

    toReporterContent() {
        let root = span(this.toString())
        root.style.display = "block"
        root.style.textAlign = "left"
        root.style.fontFamily = "monospace"
        root.style.fontSize = "14px"
        return root
    }

    execute = function* (arg, thread, target, runtime, stage) {
        try {
            thread._jwLambdaArgument ??= []
            thread._jwLambdaArgument.push(arg)
            if (this.proc) thread.procedures = {...this.proc, ...thread.procedures}
            this.timesExecuted++
            let output = (yield* this.func(arg, thread, target, runtime, stage, this) ?? "")
            thread._jwLambdaArgument.pop()
            return output
        } catch (e) {
            console.warn("Lambda failed", e)
            return ""
        }
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
        vm.runtime.registerCompiledExtensionBlocks('jwLambda', this.getCompileInfo());
    }

    get rawLambdaAvailable() {
        return vm.runtime.ext_SPjavascriptV2?.isEditorUnsandboxed
    }

    getInfo() {
        return {
            id: "jwLambda",
            name: "Lambda",
            color1: "#c71a4b",
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
                                <value name="return">
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
                    opcode: 'rawLambdaInput',
                    text: '[FIELD]',
                    hideFromPalette: true,
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE,
                    arguments: {
                        FIELD: {
                            type: ArgumentType.CUSTOM, id: "SPjavascriptV2-codeEditor",
                            defaultValue: "function* (arg, thread, target, runtime, stage) {\n  return 1;\n}"
                        }
                    }
                },
                {
                    opcode: 'rawLambda',
                    text: 'new lambda [RAW]',
                    hideFromPalette: true/*!this.rawLambdaAvailable || !(typeof ScratchBlocks === "object")*/,
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

    getCompileInfo() {
        return {
            ir: {
                newLambda: (generator, block) => ({
                    kind: 'input',
                    substack: generator.descendSubstack(block, 'SUBSTACK')
                }),
                this: (generator, block) => ({
                    kind: 'input'
                }),
                execute: (generator, block) => {
                    generator.script.yields = true
                    return {
                        kind: 'stack',
                        lambda: generator.descendInputOfBlock(block, 'LAMBDA'),
                        arg: generator.descendInputOfBlock(block, 'ARG')
                    }
                },
                executeR: (generator, block) => {
                    generator.script.yields = true
                    return {
                        kind: 'input',
                        lambda: generator.descendInputOfBlock(block, 'LAMBDA'),
                        arg: generator.descendInputOfBlock(block, 'ARG')
                    }
                },
            },
            js: {
                newLambda: (node, compiler, imports) => {
                    const temp = compiler.source;
                    compiler.source = '(new runtime.vm.jwLambda.Type(function*(arg, thread, target, runtime, stage, lambda) {\n';
                    compiler.descendStack(node.substack, new imports.Frame(false, undefined, true));
                    compiler.source += '}, thread))';
                    const returns = compiler.source;
                    compiler.source = temp;
                    return new imports.TypedInput(returns, imports.TYPE_UNKNOWN);
                },
                this: (node, compiler, imports) => {
                    return new imports.TypedInput('(typeof lambda === "undefined" ? new runtime.vm.jwLambda.Type() : lambda)', imports.TYPE_UNKNOWN)
                },
                execute: (node, compiler, imports) => {
                    compiler.source += `yield* runtime.vm.jwLambda.Type.toLambda(${compiler.descendInput(node.lambda).asUnknown()}).execute(${compiler.descendInput(node.arg).asUnknown()}, thread, target, runtime, stage);\n`
                },
                executeR: (node, compiler, imports) => {
                    return new imports.TypedInput(`(yield* runtime.vm.jwLambda.Type.toLambda(${compiler.descendInput(node.lambda).asUnknown()}).execute(${compiler.descendInput(node.arg).asUnknown()}, thread, target, runtime, stage))`)
                }
            }
        }
    }

    arg({}, util) {
        return util.thread._jwLambdaArgument ? util.thread._jwLambdaArgument[util.thread._jwLambdaArgument.length-1] : ""
    }

    newLambda() {
        return 'noop'
    }

    rawLambdaInput({FIELD}) {
        return FIELD
    }
    rawLambda({RAW}) {
        if (!this.rawLambdaAvailable) return new Lambda.Type()
        let func = getFunction(Cast.toString(RAW))
        return new Lambda.Type(func)
    }

    this() {
        return 'noop'
    }

    execute() {
        return 'noop'
    }
    executeR() {
        return 'noop'
    }

    timesExecuted({LAMBDA}) {
        LAMBDA = Lambda.Type.toLambda(LAMBDA)
        return LAMBDA.timesExecuted
    }
}

module.exports = Extension