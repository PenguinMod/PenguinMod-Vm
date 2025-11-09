const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

let arrayLimit = 2 ** 32 - 1

// credit to sharpool because i stole the for each code from his extension haha im soo evil

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

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
};

function clampIndex(x) {
    return Math.min(Math.max(Math.floor(x), 0), arrayLimit)
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

function isObject(x) {
    const fnToString = Function.prototype.toString
    const classRegex = /^class\s/
    if (typeof x === "function") {
        return !classRegex.test(fnToString.call(x))
    }
    if (x !== null && typeof x === "object") {
        const ctor = x.constructor
        return !(typeof ctor === "function" && classRegex.test(fnToString.call(ctor)))
    }
    return false
}

class ArrayType {
    customId = "jwArray"

    array = []

    constructor(array = [], safe = false) {
        this.array = safe ? array : array.map(v => {
            if (v instanceof Array) return new ArrayType([...v])
            return v
        })
    }

    static toArray(x) {
        if (x instanceof ArrayType) return new ArrayType([...x.array], true)
        if (x instanceof Array) return new ArrayType([...x])
        if (x === "" || x === null || x === undefined) return new ArrayType([], true)
        if (typeof x == "object" && typeof x.toJSON == "function") {
            let parsed = x.toJSON()
            if (parsed instanceof Array) return new ArrayType(parsed)
            if (isObject(parsed)) return new ArrayType(Object.values(parsed))
            return new ArrayType([parsed])
        }
        try {
            let parsed = JSON.parse(x)
            if (parsed instanceof Array) return new ArrayType(parsed)
        } catch {}
        return new ArrayType([x])
    }

    static forArray(x) {
        if (x instanceof ArrayType) return new ArrayType([...x.array])
        if (x instanceof Array) return new ArrayType([...x])
        if (vm.dogeiscutObject && isObject(x)) return new vm.dogeiscutObject.Type({...x})
        return x
    }

    static display(x) {
        try {
            switch (typeof x) {
                case "object":
                    if (x === null) return "null"
                    if (typeof x.jwArrayHandler == "function") {
                        return x.jwArrayHandler(false, "array")
                    }
                    return "Object"
                case "undefined":
                    return "null"
                case "number":
                    return formatNumber(x)
                case "boolean":
                    return x ? "true" : "false"
                case "string":
                    return `"${escapeHTML(Cast.toString(x))}"`
            }
        } catch {}
        return "?"
    }

    jwArrayHandler(expectsPlainString, context) {
        return `Array<${formatNumber(this.array.length)}>`
    }

    toString(pretty = false) {
        return JSON.stringify(this.toJSON(), null, pretty ? "\t" : null)
    }
    toJSON() {
        return this.array.map(v => {
            if (typeof v == "object" && v !== null) {
                if (v.toJSON && typeof v.toJSON == "function") return v.toJSON()
                if (v.toString && typeof v.toString == "function") return v.toString()
                return JSON.stringify(v)
            }
            return v
        })
    }

    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.flexDirection = 'column'
        root.style.justifyContent = 'center'

        let arrayDisplay = span(`[${this.array.slice(0, 50).map(v => ArrayType.display(v)).join(', ')}]`)
        arrayDisplay.style.overflow = "hidden"
        arrayDisplay.style.whiteSpace = "nowrap"
        arrayDisplay.style.textOverflow = "ellipsis"
        arrayDisplay.style.maxWidth = "256px"
        root.appendChild(arrayDisplay)

        root.appendChild(span(`Length: ${this.array.length}`))

        return root
    }

    flat(depth = 1) {
        depth = Math.floor(depth)
        if (depth < 1) return this
        return new ArrayType(this.array.reduce((o, v) => {
            if (v instanceof ArrayType) return [...o, ...v.flat(depth - 1).array]
            return [...o, v]
        }, []), true)
    }

    get length() {
        return this.array.length
    }
}

const jwArray = {
    Type: ArrayType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.SQUARE,
        forceOutputType: "Array",
        //allowDropAnywhere: true,
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.SQUARE,
        exemptFromNormalization: true,
        check: ["Array"],
        compilerInfo: {
            jwArrayUnmodified: true
        }
    },
    compilerModification: function* (func, node) {
        node = {...node}
        function* recurse(x) {
            for (let [i, v] of Object.entries(x)) {
                if (v instanceof jwArray.Type) {
                    const array = v.array
                    let output = []
                    for (let v of array) {
                        x[i] = v
                        output.push(yield* jwArray.compilerModification(func, node))
                    }
                    return jwArray.Type.toArray(output)
                } else if (v instanceof Array) {
                    return yield* recurse(v)
                }
            }
            return yield* func(node)
        }
        return yield* recurse(node)
    }
}

class Extension {
    constructor() {
        vm.jwArray = jwArray
        vm.runtime.registerSerializer( //this basically copies variable serialization
            "jwArray",
            v => v.array.map(w => {
                if (typeof w == "object" && w != null && w.customId) {
                    return {
                        customType: true,
                        typeId: w.customId,
                        serialized: vm.runtime.serializers[w.customId].serialize(w)
                    };
                }
                return w
            }), 
            v => new jwArray.Type(v.map(w => {
                if (typeof w == "object" && w != null && w.customType) {
                    return vm.runtime.serializers[w.typeId].deserialize(w.serialized)
                }
                return w
            }), true)
        );
        vm.runtime.registerCompiledExtensionBlocks('jwArray', this.getCompileInfo());

        if (vm.flags && vm.flags.jwArrayCompilerModifications == true) {
            const goodThing = v => typeof v == "object" && v !== null && !(v instanceof Array) && v.kind && typeof v.kind == "string" && !(v.compilerInfo && v.compilerInfo.jwArrayUnmodified)

            function recurse(v, t, path = []) {
                if (v instanceof Array) return recurseArray(v, t, path)
                return recurseObject(v, t, path)
            }
            function recurseObject(v, t, path) {
                const descendInput = (...x) => {
                    try {
                        return vm.exports.JSGenerator.prototype.descendInput.call(t, ...x).asUnknown()
                    } catch (e) {}
                }
                
                const descends = Object.fromEntries(Object.entries(v).filter(x => typeof x[1] === "object" && x[1] !== null).map(x => [x[0], goodThing(x[1]) && descendInput(x[1])]))
                return [
                    "{" + Object.entries(v).filter(x => typeof x[1] === "object" && x[1] !== null).map(x => {
                        let insideValue
                        if (descends[x[0]]) {
                            insideValue = descends[x[0]]
                        } else if (!goodThing(x[1])) {
                            let out = recurse(x[1], t, [...path, x[0]])
                            insideValue = out[0]
                            v[x[0]] = out[1]
                        }
                        return `${JSON.stringify(x[0])}: ${insideValue}`
                    }).join(", ") + "}",
                    Object.fromEntries(Object.entries(v).map(x => [x[0], descends[x[0]] ? ["node", ...path, x[0]].join(".") : x[1]]))
                ]
            }
            function recurseArray(v, t, path) {
                const descendInput = (...x) => {
                    try {
                        return vm.exports.JSGenerator.prototype.descendInput.call(t, ...x).asUnknown()
                    } catch (e) {}
                }
                const goods = v.filter(x => goodThing(x))
                const descends = Object.fromEntries(goods.map((x, i) => [i, descendInput(x)]))
                //im not gonna make this recurse because i cant be bothered and nothing does this yet
                return [
                    "[" + goods.map((x, i) => descends[i] ?? "null").join(", ") + "]",
                    goods.map((x, i) => descends[i] ? ["node", ...path].join(".") + `[${i}]` : x)
                ]
            }

            const oldDescendInput = vm.exports.JSGenerator.prototype.descendInput
            vm.exports.JSGenerator.prototype.descendInput = function(node, visualReport) {
                const TypedInput = vm.exports.JSGenerator.getExtensionImports().TypedInput

                if (typeof node == 'string' && node.startsWith("node.")) return new TypedInput(node, vm.exports.JSGenerator.getExtensionImports().TYPE_UNKNOWN)
                if (node.compilerInfo && node.compilerInfo.jwArrayUnmodified === true) return oldDescendInput.call(this, node, visualReport)

                let out = recurse(structuredClone(node), this)
                let nodeArg = out[0]

                let output = oldDescendInput.call(this, out[1], visualReport)
                return (output instanceof TypedInput) ? new TypedInput(`(yield* vm.jwArray.compilerModification(function*(node){return ${output.source}}, ${nodeArg}))`, output.type) : output
            }

            const oldDescendStackedBlock = vm.exports.JSGenerator.prototype.descendStackedBlock
            vm.exports.JSGenerator.prototype.descendStackedBlock = function(node) {
                if (node.kind === "visualReport") return oldDescendStackedBlock.call(this, node)
                if (node.compilerInfo && node.compilerInfo.jwArrayUnmodified === true) return oldDescendStackedBlock.call(this, node)

                const oldSource = this.source
                this.source = ""

                let out = recurse(structuredClone(node), this)
                let nodeArg = out[0]

                oldDescendStackedBlock.call(this, out[1])
                this.source = oldSource + `yield* vm.jwArray.compilerModification(function*(node){${this.source}}, ${nodeArg});\n`
            }
        }
    }

    getInfo() {
        return {
            id: "jwArray",
            name: "Arrays",
            color1: "#ff513d",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIj4KICA8Y2lyY2xlIHN0eWxlPSJzdHJva2Utd2lkdGg6IDJweDsgcGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogcmdiKDI1NSwgODEsIDYxKTsgc3Ryb2tlOiByZ2IoMjA1LCA1OSwgNDQpOyIgY3g9IjEwIiBjeT0iMTAiIHI9IjkiPjwvY2lyY2xlPgogIDxwYXRoIGQ9Ik0gOC4wNzMgNC4yMiBMIDYuMTQ3IDQuMjIgQyA1LjA4MyA0LjIyIDQuMjIgNS4wODMgNC4yMiA2LjE0NyBMIDQuMjIgMTMuODUzIEMgNC4yMiAxNC45MTkgNS4wODMgMTUuNzggNi4xNDcgMTUuNzggTCA4LjA3MyAxNS43OCBMIDguMDczIDEzLjg1MyBMIDYuMTQ3IDEzLjg1MyBMIDYuMTQ3IDYuMTQ3IEwgOC4wNzMgNi4xNDcgTCA4LjA3MyA0LjIyIFogTSAxMS45MjcgMTMuODUzIEwgMTMuODUzIDEzLjg1MyBMIDEzLjg1MyA2LjE0NyBMIDExLjkyNyA2LjE0NyBMIDExLjkyNyA0LjIyIEwgMTMuODUzIDQuMjIgQyAxNC45MTcgNC4yMiAxNS43OCA1LjA4MyAxNS43OCA2LjE0NyBMIDE1Ljc4IDEzLjg1MyBDIDE1Ljc4IDE0LjkxOSAxNC45MTcgMTUuNzggMTMuODUzIDE1Ljc4IEwgMTEuOTI3IDE1Ljc4IEwgMTEuOTI3IDEzLjg1MyBaIiBmaWxsPSIjZmZmIiBzdHlsZT0iIj48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: 'blank',
                    text: 'blank array',
                    ...jwArray.Block
                },
                {
                    opcode: 'blankLength',
                    text: 'blank array of length [LENGTH]',
                    arguments: {
                        LENGTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'fromList',
                    text: 'array from list [LIST]',
                    arguments: {
                        LIST: {
                            menu: "list"
                        }
                    },
                    hideFromPalette: true, //doesn't work for some reason
                    ...jwArray.Block
                },
                {
                    opcode: 'parse',
                    text: 'parse [INPUT] as array',
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: '["a", "b", "c"]',
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'split',
                    text: 'split [STRING] by [DIVIDER]',
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        DIVIDER: {
                            type: ArgumentType.STRING
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'builder',
                    text: 'array builder [SHADOW]',
                    branches: [{}],
                    arguments: {
                        SHADOW: {
                            fillIn: 'builderCurrent'
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'builderCurrent',
                    text: 'current array',
                    hideFromPalette: true,
                    canDragDuplicate: true,
                    ...jwArray.Block
                },
                {
                    opcode: 'builderAppend',
                    text: 'append [VALUE] to builder',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    }
                },
                {
                    opcode: 'builderSet',
                    text: 'set builder to [ARRAY]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'get',
                    text: 'get [INDEX] in [ARRAY]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'items',
                    text: 'items [X] to [Y] in [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'index',
                    text: 'index of [VALUE] in [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    }
                },
                {
                    opcode: 'has',
                    text: '[ARRAY] has [VALUE]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    }
                },
                {
                    opcode: 'length',
                    text: 'length of [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'set',
                    text: 'set [INDEX] in [ARRAY] to [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'append',
                    text: 'append [VALUE] to [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'concat',
                    text: 'merge [ONE] with [TWO]',
                    arguments: {
                        ONE: jwArray.Argument,
                        TWO: jwArray.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'fill',
                    text: 'fill [ARRAY] with [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true,
                            compilerInfo: {
                                jwArrayUnmodified: true
                            }
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'reverse',
                    text: 'reverse [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'splice',
                    text: 'splice [ARRAY] at [INDEX] with [ITEMS] items',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        ITEMS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'repeat',
                    text: 'repeat [ARRAY] [TIMES] times',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        TIMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'flat',
                    text: 'flat [ARRAY] with depth [DEPTH]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        DEPTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'toString',
                    text: 'stringify [ARRAY] [FORMAT]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        FORMAT: {
                            menu: "stringifyFormat",
                            defaultValue: "compact"
                        }
                    }
                },
                {
                    opcode: 'join',
                    text: 'join [ARRAY] with [DIVIDER]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        DIVIDER: {
                            type: ArgumentType.STRING,
                            defaultValue: ""
                        }
                    }
                },
                {
                    opcode: 'sum',
                    text: 'sum of [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'forEachI',
                    text: 'index',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    canDragDuplicate: true
                },
                {
                    opcode: 'forEachV',
                    text: 'value',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    allowDropAnywhere: true,
                    canDragDuplicate: true
                },
                {
                    opcode: 'forEach',
                    text: 'for [I] [V] of [ARRAY]',
                    blockType: BlockType.LOOP,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        }
                    }
                },
                {
                    opcode: 'basicSort',
                    text: 'sort [ARRAY] [I] [V] > [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                }
            ],
            menus: {
                list: {
                    acceptReporters: false,
                    items: "getLists",
                },
                stringifyFormat: {
                    acceptReporters: false,
                    items: [
                        "compact",
                        "pretty"
                    ]
                }
            }
        };
    }

    getCompileInfo() {
        return {
            ir: {
                builder: (generator, block) => {
                    generator.script.yields = true
                    return {
                        kind: 'input',
                        substack: generator.descendSubstack(block, 'SUBSTACK')
                    }
                },
                forEach: (generator, block) => {
                    generator.script.yields = true
                    return {
                        kind: 'stack',
                        substack: generator.descendSubstack(block, 'SUBSTACK'),
                        array: generator.descendInputOfBlock(block, 'ARRAY'),
                    }
                },
                basicSort: (generator, block) => {
                    generator.script.yields = true
                    return {
                        kind: 'input',
                        array: generator.descendInputOfBlock(block, 'ARRAY'),
                        value: generator.descendInputOfBlock(block, 'VALUE'),
                    }
                }
            },
            js: {
                builder: (node, compiler, imports) => {
                    const originalSource = compiler.source;
                    compiler.source = 'vm.jwArray.Type.toArray(yield* (function*() {';
                    compiler.source += `thread._jwArrayBuilderIndex ??= [];`
                    compiler.source += `thread._jwArrayBuilderIndex.push([]);`
                    compiler.descendStack(node.substack, new imports.Frame(false, undefined, true));
                    compiler.source += `return thread._jwArrayBuilderIndex.pop();`
                    compiler.source += '})())';
                    // save edited
                    const stackSource = compiler.source;
                    compiler.source = originalSource;
                    return new imports.TypedInput(stackSource, imports.TYPE_UNKNOWN);
                },
                forEach: (node, compiler, imports) => {
                    compiler.source += `thread._jwArrayForEach ??= [];\n`
                    const forIndex = compiler.localVariables.next();
                    compiler.source += `let ${forIndex} = thread._jwArrayForEach.push([]) - 1;\n`
                    const index = compiler.localVariables.next();
                    const array = compiler.localVariables.next();
                    compiler.source += `let ${array} = vm.jwArray.Type.toArray(${compiler.descendInput(node.array).asUnknown()}).array;\n`
                    const output = compiler.localVariables.next();
                    compiler.source += `let ${output} = yield* (function* () {for (let ${index} in ${array}) {\n`
                    compiler.source += `thread._jwArrayForEach[${forIndex}] = [Number(${index}) + 1, ${array}[${index}]];\n`
                    compiler.descendStack(node.substack, new imports.Frame(true, undefined, true));
                    compiler.yieldLoop()
                    compiler.source += '}})();\n'
                    compiler.source += `thread._jwArrayForEach.pop();\n`
                    compiler.source += `if (${output} !== undefined) {\n`
                    if (node.isDefineClicked) this.retire();
                    compiler.source += `return ${output};\n`
                    compiler.source += `};\n`
                },
                basicSort: (node, compiler, imports) => {
                    const originalSource = compiler.source;
                    compiler.source = '(yield* (function*() {';
                    compiler.source += `thread._jwArrayForEach ??= [];\n`
                    const forIndex = compiler.localVariables.next();
                    compiler.source += `let ${forIndex} = thread._jwArrayForEach.push([]) - 1;\n`
                    const og = compiler.localVariables.next();
                    const out = compiler.localVariables.next();
                    compiler.source += `let ${og} = vm.jwArray.Type.toArray(${compiler.descendInput(node.array).asUnknown()}).array;\n`
                    compiler.source += `let ${out} = [];\n`
                    const i = compiler.localVariables.next();
                    compiler.source += `for (let ${i} = 0; ${i} < ${og}.length; ${i}++) {\n`
                    compiler.source += `thread._jwArrayForEach[${forIndex}] = [${i} + 1, ${og}[${i}]];\n`
                    compiler.source += `${out}.push([${i}, ${compiler.descendInput(node.value).asNumber()}]);\n`
                    compiler.source += `};\n`
                    compiler.source += `thread._jwArrayForEach.pop();\n`
                    compiler.source += `${out}.sort((a, b) => a[1] - b[1]);\n`
                    compiler.source += `return new vm.jwArray.Type(${out}.map(v => ${og}[v[0]]));\n`
                    compiler.source += '})())';
                    // save edited
                    const stackSource = compiler.source;
                    compiler.source = originalSource;
                    return new imports.TypedInput(stackSource, imports.TYPE_UNKNOWN);
                }
            }
        };
    }
    
    getLists() {
        const globalLists = Object.values(vm.runtime.getTargetForStage().variables)
            .filter((x) => x.type == "list");
        const localLists = Object.values(vm.editingTarget.variables)
            .filter((x) => x.type == "list");
        const uniqueLists = [...new Set([...globalLists, ...localLists])];
        if (uniqueLists.length === 0) return [{ text: "", value: "" }];
        return uniqueLists.map((v) => ({ text: v.name, value: new jwArray.Type(v.value) }));
    }

    blank() {
        return new jwArray.Type([], true)
    }

    blankLength({LENGTH}) {
        LENGTH = clampIndex(Cast.toNumber(LENGTH))

        return new jwArray.Type(Array(LENGTH).fill(null), true)
    }

    fromList({LIST}) {
        return jwArray.Type.toArray(LIST)
    }

    parse({INPUT}) {
        return jwArray.Type.toArray(INPUT)
    }

    split({STRING, DIVIDER}) {
        STRING = Cast.toString(STRING)
        DIVIDER = Cast.toString(DIVIDER)

        return new jwArray.Type(STRING.split(DIVIDER), true)
    }

    builder() {
        return 'noop'
    }

    builderCurrent({}, util) {
        let bi = util.thread._jwArrayBuilderIndex ?? []
        return bi[bi.length-1] ? new jwArray.Type(bi[bi.length-1]) : new jwArray.Type([], true)
    }

    builderAppend({VALUE}, util) {
        let bi = util.thread._jwArrayBuilderIndex ?? []
        if (bi[bi.length-1]) {
            bi[bi.length-1].push(VALUE)
        }
    }

    builderSet({ARRAY}, util) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        let bi = util.thread._jwArrayBuilderIndex ?? []
        if (bi[bi.length-1]) {
            bi[bi.length-1] = [...ARRAY.array]
        }
    }

    get({ARRAY, INDEX}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        return jwArray.Type.forArray(ARRAY.array[Cast.toNumber(INDEX)-1] === undefined ? "" : ARRAY.array[Cast.toNumber(INDEX)-1])
    }

    index({ARRAY, VALUE}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        return ARRAY.array.map(v => Cast.toString(v)).indexOf(Cast.toString(VALUE)) + 1
    }

    has({ARRAY, VALUE}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        return ARRAY.array.map(v => Cast.toString(v)).includes(Cast.toString(VALUE))
    }

    length({ARRAY}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        return ARRAY.length
    }

    set({ARRAY, INDEX, VALUE}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        INDEX = Cast.toNumber(INDEX)

        ARRAY.array[clampIndex(Cast.toNumber(INDEX)-1)] = jwArray.Type.forArray(VALUE)
        ARRAY.array = [...ARRAY.array] // no sparse arrays
        return ARRAY
    }

    append({ARRAY, VALUE}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        ARRAY.array.push(jwArray.Type.forArray(VALUE))
        return ARRAY
    }

    concat({ONE, TWO}) {
        ONE = jwArray.Type.toArray(ONE)
        TWO = jwArray.Type.toArray(TWO)

        return new jwArray.Type(ONE.array.concat(TWO.array), true)
    }

    fill({ARRAY, VALUE}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        ARRAY.array.fill(jwArray.Type.forArray(VALUE))
        return ARRAY
    }

    items({ARRAY, X, Y}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        X = clampIndex(Cast.toNumber(X))
        Y = clampIndex(Cast.toNumber(Y))

        return new jwArray.Type(ARRAY.array.slice(X - 1, Y), true)
    }

    splice({ARRAY, INDEX, ITEMS}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        INDEX = Cast.toNumber(INDEX)
        ITEMS = Cast.toNumber(ITEMS)

        ARRAY.array.splice(INDEX - 1, ITEMS)
        return ARRAY
    }

    repeat({ARRAY, TIMES}) {
        TIMES = clampIndex(Cast.toNumber(TIMES))
        if (TIMES === 0) return new jwArray.Type([], true)
        ARRAY = jwArray.Type.toArray(ARRAY)
        if (TIMES === 1 || ARRAY.array.length == 0) return ARRAY
        return new jwArray.Type(Array(TIMES).fill(ARRAY.array).flat(), true)
    }

    reverse({ARRAY}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        ARRAY.array.reverse()
        return ARRAY
    }

    flat({ARRAY, DEPTH}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        DEPTH = Cast.toNumber(DEPTH)

        return ARRAY.flat(DEPTH)
    }

    toString({ARRAY, FORMAT}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        
        return ARRAY.toString(FORMAT === "pretty")
    }

    join({ARRAY, DIVIDER}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        DIVIDER = Cast.toString(DIVIDER)

        return ARRAY.array.map(v => Cast.toString(v)).join(DIVIDER)
    }

    sum({ARRAY}) {
        ARRAY = jwArray.Type.toArray(ARRAY)

        return ARRAY.array.reduce((o, v) => o + Cast.toNumber(v), 0)
    }

    forEachI({}, util) {
        return util.thread._jwArrayForEach ? util.thread._jwArrayForEach[util.thread._jwArrayForEach.length-1][0] : 0
    }

    forEachV({}, util) {
        return util.thread._jwArrayForEach ? util.thread._jwArrayForEach[util.thread._jwArrayForEach.length-1][1] : ""
    }

    forEach({ARRAY}, util) {
        return 'noop'
    }

    forEachBreak({}, util) {
        util.stackFrame.entry = []
    }
}

module.exports = Extension