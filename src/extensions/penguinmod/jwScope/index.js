const BlockType = require('../../../extension-support/block-type')
const BlockShape = require('../../../extension-support/block-shape')
const ArgumentType = require('../../../extension-support/argument-type')
const Cast = require('../../../util/cast')

const jwScope = {
    create(scope, name) {
        scope.vars[name] ??= null
    },

    delete(scope, name) {
        for (let s = scope; s; s = s.parent) {
            if (name in s.vars) {
                delete s.vars[name]
                return
            }
        }
    },

    set(scope, name, value) {
        for (let s = scope; s; s = s.parent) {
            if (name in s.vars) {
                s.vars[name] = value
                return
            }
        }
        scope.vars[name] = value
    },

    change(scope, name, value) {
        for (let s = scope; s; s = s.parent) {
            if (name in s.vars) {
                s.vars[name] = Cast.toNumber(s.vars[name]) + value
                return
            }
        }
        scope.vars[name] = value
    },

    get(scope, name) {
        for (let s = scope; s; s = s.parent)
            if (name in s.vars) return s.vars[name]
        return null
    },

    has(scope, name) {
        for (let s = scope; s; s = s.parent)
            if (name in s.vars) return true
        return false
    },

    reset(scope) {
        for (let s = scope; s; s = s.parent)
            s.vars = Object.create(null);
    },

    depth(scope) {
        return scope.depth
    },

    current(scope) {
        let set = new Set()
        this.all(scope).array.forEach(scope => 
            scope.array.forEach(v => {set.delete(v); set.add(v)})
        )
        return new vm.jwArray.Type(Array.from(set))
    },

    all(scope) {
        let scopes = []
        for (let s = scope; s; s = s.parent) scopes.push(s.vars)
        return new vm.jwArray.Type(
            scopes.map(v => Object.keys(v))
            .filter(v => v.length > 0)
            .map(v => new vm.jwArray.Type(v))
            .reverse()
        )
    }
}

class Extension {
    constructor() {
        vm.jwScope = jwScope

        vm.extensionManager.extendCompiler("jwScope", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "jwScope",
            name: "Scope",
            color: "#4f85f3",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS1saW5lam9pbjogcm91bmQ7IHBhaW50LW9yZGVyOiBmaWxsOyBmaWxsOiByZ2IoNzksIDEzMywgMjQzKTsgc3Ryb2tlLXdpZHRoOiAxOyBzdHJva2U6IHJnYig2MywgMTA2LCAxOTQpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cmVjdCBzdHlsZT0icGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogbm9uZTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IHN0cm9rZS1saW5lam9pbjogcm91bmQ7IHN0cm9rZS13aWR0aDogMjsiIHg9IjUiIHk9IjUiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgcng9IjMiIHJ5PSIzIj48L3JlY3Q+Cjwvc3ZnPg==",
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

    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            ALL: 'jwScope.all',
            CHANGE: 'jwScope.change',
            CREATE: 'jwScope.create',
            CURRENT: 'jwScope.current',
            DELETE: 'jwScope.delete',
            DEPTH: 'jwScope.depth',
            GET: 'jwScope.get',
            HAS: 'jwScope.has',
            RESET: 'jwScope.reset',
            SET: 'jwScope.set',
        };

        return {
            ir: {
                reporter(block) {
                    const generate = (opcode, type, name = false, array = false) => {
                        if (array && !vm.jwArray) return this.createConstantInput(null);
                        return new IntermediateInput(opcode, type, {
                            ...(name ? {name: this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING)} : {})
                        });
                    };

                    switch (block.opcode) {
                        case 'jwScope_all': return generate(opcodes.ALL, InputType.CUSTOM_TYPE, false, true);
                        case 'jwScope_current': return generate(opcodes.CURRENT, InputType.CUSTOM_TYPE, false, true);
                        case 'jwScope_depth': return generate(opcodes.DEPTH, InputType.NUMBER_POS_INT);
                        case 'jwScope_get': return generate(opcodes.GET, InputType.ANY, true);
                        case 'jwScope_has': return generate(opcodes.HAS, InputType.BOOLEAN, true);
                    }
                },
                command(block) {
                    const generate = (opcode, name = false, value = false, valueNumber = false) => {
                        value = value ? this.descendInputOfBlock(block, 'VALUE') : null;
                        if (valueNumber) value = value.toType(InputType.NUMBER);
                        return new IntermediateStackBlock(opcode, {
                            ...(name ? {name: this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING)} : {}),
                            value
                        });
                    };

                    switch (block.opcode) {
                        case 'jwScope_change': return generate(opcodes.CHANGE, true, true, true);
                        case 'jwScope_create': return generate(opcodes.CREATE, true);
                        case 'jwScope_delete': return generate(opcodes.DELETE, true);
                        case 'jwScope_reset': return generate(opcodes.RESET);
                        case 'jwScope_set': return generate(opcodes.SET, true, true);
                    }
                }
            },
            js: {
                scriptStart() {
                    this.source += "let jwScope = null;\n"
                },
                stackStart() {
                    this.source += "var jwScopeT = {parent: jwScope, vars: Object.create(null), depth: (jwScope?.depth ?? 0)+1};\n"
                    this.source += "{\n" // create scope
                    this.source += "let jwScope = jwScopeT;\n"
                },
                stackEnd() {
                    this.source += "}\n" // end scope
                },
                reporter(block) {
                    const node = block.inputs;

                    const generate = (funcName, name = false) => {
                        return `vm.jwScope.${funcName}(jwScope${name ? `, ${this.descendInput(node.name)}` : ''})`;
                    }

                    switch (block.opcode) {
                        case opcodes.ALL: return generate('all');
                        case opcodes.CURRENT: return generate('current');
                        case opcodes.DEPTH: return generate('depth');
                        case opcodes.GET: return generate('get', true);
                        case opcodes.HAS: return generate('has', true);
                    }
                },
                command(block) {
                    const node = block.inputs;

                    const generate = (funcName, name = false, value = false) => {
                        this.source += `vm.jwScope.${funcName}(jwScope${name ? `, ${this.descendInput(node.name)}` : ''}${value ? `, ${this.descendInput(node.value)}` : ''});\n`;
                        return true;
                    }

                    switch (block.opcode) {
                        case opcodes.CHANGE: return generate('change', true, true);
                        case opcodes.CREATE: return generate('create', true);
                        case opcodes.DELETE: return generate('delete', true);
                        case opcodes.RESET: return generate('reset');
                        case opcodes.SET: return generate('set', true, true);
                    }
                }
            }
        }
    }
}

module.exports = Extension
