const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

const jwScope = {
    create(array, name) {
        array[array.length-1][name] ??= null
    },

    delete(array, name) {
        for (let i = array.length-1; i >= 0; i--) {
            if (name in array[i]) {
                delete array[i][name]
                return
            }
        }
    },

    set(array, name, value) {
        for (let i = array.length-1; i >= 0; i--) {
            if (name in array[i]) {
                array[i][name] = value
                return
            }
        }
        array[array.length-1][name] = value
    },

    change(array, name, value) {
        for (let i = array.length-1; i >= 0; i--) {
            if (name in array[i]) {
                array[i][name] = Cast.toNumber(array[i][name]) + value
                return
            }
        }
        array[array.length-1][name] = value
    },

    get(array, name) {
        for (let i = array.length-1; i >= 0; i--) {
            if (name in array[i]) {
                return array[i][name]
            }
        }
        return null
    },

    has(array, name) {
        for (let i = array.length-1; i >= 0; i--) {
            if (name in array[i]) {
                return true
            }
        }
        return false
    },

    reset(array) {
        for (let i = array.length-1; i >= 0; i--) {
            array[i] = Object.create(null);
        }
    },

    depth(array) {
        return array.length
    },

    current(array) {
        let set = new Set()
        for (let i = 0; i < array.length; i++) {
            Object.keys(array[i]).forEach(v => {set.delete(v); set.add(v)})
        }
        return new vm.jwArray.Type(Array.from(set))
    },

    all(array) {
        return new vm.jwArray.Type(array.map(v => Object.keys(v)).filter(v => v.length > 0).map(v => new vm.jwArray.Type(v)))
    }
}

class Extension {
    constructor() {
        if (!vm.jwScope) {
            const oldCompile = vm.exports.JSGenerator.prototype.compile
            vm.exports.JSGenerator.prototype.compile = function() {
                this.source += "let jwScope = [];\n"
                return oldCompile.call(this)
            }

            const oldDescendStack = vm.exports.JSGenerator.prototype.descendStack
            vm.exports.JSGenerator.prototype.descendStack = function(nodes, frame) {
                if (frame.parent == 'control.switch') return oldDescendStack.call(this, nodes, frame)
                this.source += "var jwScopeT = [...jwScope, Object.create(null)];\n"
                this.source += "{\n" //create scope
                this.source += "let jwScope = jwScopeT;\n"
                const result = oldDescendStack.call(this, nodes, frame)
                this.source += "};\n"
                return result
            }
        }
        vm.jwScope = jwScope

        vm.runtime.registerCompiledExtensionBlocks('jwScope', this.getCompileInfo());
    }

    getInfo() {
        return {
            id: "jwScope",
            name: "Scope",
            color1: "#4f85f3",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS1saW5lam9pbjogcm91bmQ7IHBhaW50LW9yZGVyOiBmaWxsOyBzdHJva2U6IHJnYig3MSwgMTE5LCAyMTkpOyBmaWxsOiByZ2IoNzksIDEzMywgMjQzKTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOS41IiByeT0iOS41Ij48L2VsbGlwc2U+CiAgPHJlY3Qgc3R5bGU9InBhaW50LW9yZGVyOiBzdHJva2U7IGZpbGw6IG5vbmU7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDJweDsiIHg9IjUiIHk9IjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjMiIHJ5PSIzIj48L3JlY3Q+Cjwvc3ZnPg==",
            docsURI: 'https://docs.penguinmod.com/extensions/jwScope/',
            blocks: [
                {
                    opcode: "set",
                    blockType: BlockType.COMMAND,
                    text: "set [NAME] to [VALUE]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var",
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "apple",
                            exemptFromNormalization: true
                        }
                    },
                },
                {
                    opcode: "change",
                    blockType: BlockType.COMMAND,
                    text: "change [NAME] by [VALUE]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var",
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "1"
                        }
                    },
                },
                "---",
                {
                    opcode: "get",
                    blockType: BlockType.REPORTER,
                    text: "get [NAME]",
                    allowDropAnywhere: true,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var"
                        }
                    },
                },
                {
                    opcode: "has",
                    blockType: BlockType.BOOLEAN,
                    text: "is [NAME] defined?",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var"
                        }
                    },
                },
                "---",
                {
                    opcode: "create",
                    blockType: BlockType.COMMAND,
                    text: "init [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var",
                        }
                    },
                },
                {
                    opcode: "delete",
                    blockType: BlockType.COMMAND,
                    text: "remove [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "var",
                        }
                    },
                },
                {
                    opcode: "reset",
                    blockType: BlockType.COMMAND,
                    text: "reset scope"
                },
                "---",
                {
                    opcode: "depth",
                    blockType: BlockType.REPORTER,
                    text: "depth of scope",
                    disableMonitor: true
                },
                "---",
                {
                    opcode: "current",
                    text: "current scope",
                    hideFromPalette: !vm.runtime.ext_jwArray,
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE,
                    ...(vm.jwArray ? vm.jwArray.Block : {})
                },
                {
                    opcode: "all",
                    text: "all scopes",
                    hideFromPalette: !vm.runtime.ext_jwArray,
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE,
                    ...(vm.jwArray ? vm.jwArray.Block : {})
                }
            ]
        };
    }

    getCompileInfo() {
        return {
            ir: {
                create: (generator, block) => ({
                    kind: 'stack',
                    name: generator.descendInputOfBlock(block, 'NAME')
                }),
                delete: (generator, block) => ({
                    kind: 'stack',
                    name: generator.descendInputOfBlock(block, 'NAME')
                }),
                set: (generator, block) => ({
                    kind: 'stack',
                    name: generator.descendInputOfBlock(block, 'NAME'),
                    value: generator.descendInputOfBlock(block, 'VALUE')
                }),
                change: (generator, block) => ({
                    kind: 'stack',
                    name: generator.descendInputOfBlock(block, 'NAME'),
                    value: generator.descendInputOfBlock(block, 'VALUE')
                }),
                get: (generator, block) => ({
                    kind: 'input',
                    name: generator.descendInputOfBlock(block, 'NAME')
                }),
                has: (generator, block) => ({
                    kind: 'input',
                    name: generator.descendInputOfBlock(block, 'NAME')
                }),
                reset: (generator, block) => ({
                    kind: 'stack'
                }),
                depth: (generator, block) => ({
                    kind: 'input'
                }),
                current: (generator, block) => ({
                    kind: 'input'
                }),
                all: (generator, block) => ({
                    kind: 'input'
                })
            },
            js: {
                create: (node, compiler, imports) => {
                    compiler.source += `vm.jwScope.create(jwScope, ${compiler.descendInput(node.name).asString()});\n`
                },
                delete: (node, compiler, imports) => {
                    compiler.source += `vm.jwScope.delete(jwScope, ${compiler.descendInput(node.name).asString()});\n`
                },
                set: (node, compiler, imports) => {
                    compiler.source += `vm.jwScope.set(jwScope, ${compiler.descendInput(node.name).asString()}, ${compiler.descendInput(node.value).asUnknown()});\n`
                },
                change: (node, compiler, imports) => {
                    compiler.source += `vm.jwScope.change(jwScope, ${compiler.descendInput(node.name).asString()}, ${compiler.descendInput(node.value).asNumber()});\n`
                },
                get: (node, compiler, imports) => {
                    return new imports.TypedInput(`vm.jwScope.get(jwScope, ${compiler.descendInput(node.name).asString()})`, imports.TYPE_UNKNOWN)
                },
                has: (node, compiler, imports) => {
                    return new imports.TypedInput(`vm.jwScope.has(jwScope, ${compiler.descendInput(node.name).asString()})`, imports.TYPE_BOOLEAN)
                },
                reset: (node, compiler, imports) => {
                    compiler.source += `vm.jwScope.reset(jwScope);\n`
                },
                depth: (node, compiler, imports) => {
                    return new imports.TypedInput(`vm.jwScope.depth(jwScope)`, imports.TYPE_NUMBER)
                },
                current: (node, compiler, imports) => {
                    return new imports.TypedInput(!!vm.jwArray ? 'vm.jwScope.current(jwScope)' : '0', imports.TYPE_UNKNOWN)
                },
                all: (node, compiler, imports) => {
                    return new imports.TypedInput(!!vm.jwArray ? 'vm.jwScope.all(jwScope)': '0', imports.TYPE_UNKNOWN)
                }
            }
        }
    }

    create() {
        return 'noop'
    }

    delete() {
        return 'noop'
    }

    set() {
        return 'noop'
    }

    get() {
        return 'noop'
    }

    has() {
        return 'noop'
    }

    reset() {
        return 'noop'
    }

    depth() {
        return 'noop'
    }

    current() {
        return 'noop'
    }

    all() {
        return 'noop'
    }
}

module.exports = Extension