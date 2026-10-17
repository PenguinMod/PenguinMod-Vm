const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');
const pmSymbol = require('../../../util/symbol.js');

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

const classSymbol = Symbol('class');

class ClassType {
    constructor(construct = function*(){}, name = '', extension = null, proc = null) {
        this.construct = construct;
        this.name = name;
        /** @type {ClassType?} */
        this.extension = extension;
        this.proc = proc ?? {};
    }

    toString() {
        return this.name.length > 0 ? `Class<${this.name}>` : 'Class';
    }

    jwArrayHandler() {
        return escapeHTML(this.toString());
    }

    static toClass(v) {
        if (v instanceof ClassType) return v;
        return new ClassType();
    }

    createInstance = function* (thread, target) {
        if (this.proc) thread.procedures = {...this.proc, ...thread.procedures}
        if (!this.extension) {
            let object = new dogeiscutObject.Type();
            object.map.set(classSymbol, this);
            let pointer = jwPointer.Type.create();
            pointer.value = object;
            yield* this.construct(pointer, thread, target);
            return pointer;
        } else {
            let pointer = yield* this.extension.createInstance(thread, target);
            let object = pointer.value;
            if (object instanceof dogeiscutObject.Type) object.map.set(classSymbol, this);
            yield* this.construct(pointer, thread, target);
            return pointer;
        }
    }

    extend(extension) {
        return new ClassType(this.construct, this.name, extension);
    }
    
    [pmSymbol.equals](other) {
        return this === other;
    }
}

let jwClass = {
    Type: ClassType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.TICKET,
        forceOutputType: "jwClass",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.TICKET,
        check: ["jwClass"]
    },

    classSymbol,

    setProp(name, pointer, value) {
        if (!(pointer instanceof jwPointer.Type)) return;
        if (!(pointer.value instanceof dogeiscutObject.Type)) return;
        pointer.value = dogeiscutObject.Type.toObject(pointer.value); //clone
        pointer.value.map.set(name, value);
    },
    getProp(name, pointer) {
        if (!(pointer instanceof jwPointer.Type)) return null;
        if (!(pointer.value instanceof dogeiscutObject.Type)) return null;
        return pointer.value.map.get(name);
    },
    instanceOf(pointer, otherClass) {
        let __class__ = jwClass.getProp(classSymbol, pointer);
        while (__class__) {
            if (__class__ === otherClass) return true;
            __class__ = __class__.extension;
        }
        return false;
    }
};

let dogeiscutObject = {
    Type: class {},
    Block: {},
    Argument: {}
};

let jwPointer = {
    Type: class {},
    Block: {},
    Argument: {}
};

class Extension {
    constructor() {
        vm.extensionManager.addExtensionDependency("jwClass", "dogeiscutObject", () => dogeiscutObject = vm.dogeiscutObject);
        vm.extensionManager.addExtensionDependency("jwClass", "jwPointer", () => jwPointer = vm.jwPointer);

        vm.extensionManager.extendCompiler("jwClass", this.extendCompiler.bind(this));

        vm.jwClass = jwClass;
        vm.runtime.registerSerializer(
            "jwClass", 
            v => v.name, 
            v => new jwClass.Type(function*(){}, v.name)
        );
    }

    getInfo() {
        return {
            id: "jwClass",
            name: "Classes",
            color: "#4bbf56",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDYwLCAxNTMsIDY5KTsgZmlsbDogcmdiKDc1LCAxOTEsIDg2KTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOS41IiByeT0iOS41Ij48L2VsbGlwc2U+CiAgPGc+CiAgICA8cGF0aCBkPSJNIDYuOTc4IDUuNTE2IEMgNC43MzYgOC41MDUgNC43MzYgMTEuNDk0IDYuOTc4IDE0LjQ4NCIgc3Ryb2tlPSIjZmZmIiBmaWxsPSJub25lIiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2Utd2lkdGg6IDI7Ij48L3BhdGg+CiAgICA8cGF0aCBkPSJNIDE0LjcwMyAxNC40ODQgQyAxMi40NjEgMTEuNDk1IDEyLjQ2MSA4LjUwNiAxNC43MDMgNS41MTYiIHN0cm9rZT0iI2ZmZiIgZmlsbD0ibm9uZSIgc3R5bGU9InN0cm9rZS1saW5lam9pbjogcm91bmQ7IHN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAyOyB0cmFuc2Zvcm0tYm94OiBmaWxsLWJveDsgdHJhbnNmb3JtLW9yaWdpbjogNTAlIDUwJTsiIHRyYW5zZm9ybT0ibWF0cml4KC0xLCAwLCAwLCAtMSwgLTAuMDAwMDAyLCAwKSI+PC9wYXRoPgogIDwvZz4KPC9zdmc+",
            blocks: [
                {
                    opcode: "class",
                    text: "class [NAME] [SELF]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: ""
                        },
                        SELF: {
                            fillIn: "self"
                        }
                    },
                    branches: [{}],
                    ...jwClass.Block
                },
                {
                    opcode: "self",
                    text: "self",
                    hideFromPalette: true,
                    canDragDuplicate: true,
                    ...jwPointer.Block
                },
                {
                    opcode: "extend",
                    text: "[CLASS] extends [EXTENSION]",
                    arguments: {
                        CLASS: jwClass.Argument,
                        EXTENSION: jwClass.Argument
                    },
                    ...jwClass.Block
                },
                "---",
                {
                    opcode: "setProp",
                    text: "set [NAME] on [POINTER] to [VALUE]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        POINTER: jwPointer.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "bar"
                        }
                    }
                },
                {
                    opcode: "getProp",
                    text: "get [NAME] on [POINTER]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        POINTER: jwPointer.Argument
                    },
                    allowDropAnywhere: true
                },
                {
                    opcode: "getClass",
                    text: "get class of [POINTER]",
                    arguments: {
                        POINTER: jwPointer.Argument
                    },
                    ...jwClass.Block
                },
                "---",
                {
                    opcode: "new",
                    text: "new [CLASS]",
                    arguments: {
                        CLASS: jwClass.Argument
                    },
                    ...jwPointer.Block
                },
                {
                    opcode: "getName",
                    text: "name of [CLASS]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        CLASS: jwClass.Argument
                    }
                },
                "---",
                {
                    opcode: "instanceof",
                    text: "is [POINTER] instance of [CLASS]?",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POINTER: jwPointer.Argument,
                        CLASS: jwClass.Argument
                    }
                }
            ]
        };
    }
    
    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            CLASS: 'jwClass.class',
            SELF: 'jwClass.self',
            EXTEND: 'jwClass.extend',

            SET: 'jwClass.set',
            GET: 'jwClass.get',
            GETCLASS: 'jwClass.getClass',

            NEW: 'jwClass.new',
            NAME: 'jwClass.name',

            INSTANCEOF: 'jwClass.instanceof'
        };

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwClass_class':
                            return new IntermediateInput(opcodes.CLASS, InputType.CUSTOM_TYPE, {
                                name: this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING),
                                substack: this.descendSubstack(block, 'SUBSTACK')
                            }, true);
                        case 'jwClass_self':
                            return new IntermediateInput(opcodes.SELF, InputType.CUSTOM_TYPE);
                        case 'jwClass_extend':
                            return new IntermediateInput(opcodes.EXTEND, InputType.CUSTOM_TYPE, {
                                class: this.descendInputOfBlock(block, 'CLASS'),
                                extension: this.descendInputOfBlock(block, 'EXTENSION')
                            });

                        case 'jwClass_getProp':
                            return new IntermediateInput(opcodes.GET, InputType.CUSTOM_TYPE, {
                                name: this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING),
                                pointer: this.descendInputOfBlock(block, 'POINTER')
                            });
                        case 'jwClass_getClass':
                            return new IntermediateInput(opcodes.GETCLASS, InputType.CUSTOM_TYPE, {
                                pointer: this.descendInputOfBlock(block, 'POINTER')
                            });

                        case 'jwClass_new':
                            return new IntermediateInput(opcodes.NEW, InputType.CUSTOM_TYPE, {
                                class: this.descendInputOfBlock(block, 'CLASS')
                            }, true);
                        case 'jwClass_getName':
                            return new IntermediateInput(opcodes.NAME, InputType.STRING, {
                                class: this.descendInputOfBlock(block, 'CLASS')
                            });

                        case 'jwClass_instanceof':
                            return new IntermediateInput(opcodes.INSTANCEOF, InputType.BOOLEAN, {
                                pointer: this.descendInputOfBlock(block, 'POINTER'),
                                class: this.descendInputOfBlock(block, 'CLASS')
                            });
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwClass_setProp':
                            return new IntermediateStackBlock(opcodes.SET, {
                                name: this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING),
                                pointer: this.descendInputOfBlock(block, 'POINTER'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                    }
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.CLASS:
                            let source = "";
                            source += `(new vm.jwClass.Type(function*(_jwClassSelf, thread, target) {\n`;
                            source += this.descendStackInline(node.substack, {allowReturns: true, inLoop: false});
                            source += `}, ${this.descendInput(node.name)}, null, thread.procedures))`;
                            return source;
                        case opcodes.SELF:
                            return `(typeof _jwClassSelf !== "undefined" ? _jwClassSelf : new vm.jwPointer.Type(0))`;
                        case opcodes.EXTEND:
                            return `vm.jwClass.Type.toClass(${this.descendInput(node.class)}).extend(${this.descendInput(node.extension)})`;

                        case opcodes.GET:
                            return `vm.jwClass.getProp(${this.descendInput(node.name)}, ${this.descendInput(node.pointer)})`;
                        case opcodes.GETCLASS:
                            return `vm.jwClass.getProp(vm.jwClass.classSymbol, ${this.descendInput(node.pointer)})`;

                        case opcodes.NEW:
                            return `(yield* vm.jwClass.Type.toClass(${this.descendInput(node.class)}).createInstance(thread, target))`;
                        case opcodes.NAME:
                            return `vm.jwClass.Type.toClass(${this.descendInput(node.class)}).name`;

                        case opcodes.INSTANCEOF:
                            return `vm.jwClass.instanceOf(${this.descendInput(node.pointer)}, vm.jwClass.Type.toClass(${this.descendInput(node.class)}))`;
                    }
                },
                command(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.SET:
                            this.source += `vm.jwClass.setProp(${this.descendInput(node.name)}, ${this.descendInput(node.pointer)}, ${this.descendInput(node.value)});\n`;
                            return true;
                    }
                }
            }
        };
    }
}

module.exports = Extension;