const BlockType = require('../../../extension-support/block-type')
const BlockShape = require('../../../extension-support/block-shape')
const ArgumentType = require('../../../extension-support/argument-type')
const Cast = require('../../../util/cast')

class Extension {
    constructor() {
        vm.extensionManager.extendCompiler("jwFragment", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "jwFragment",
            name: "Fragments",
            blocks: [
                {
                    opcode: "define",
                    blockType: BlockType.COMMAND,
                    text: "define fragment [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name",
                        },
                    },
                    branches: [{}]
                },
                {
                    opcode: "use",
                    blockType: BlockType.COMMAND,
                    text: "use fragment [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name",
                        },
                    }
                }
            ]
        };
    }
    
    extendCompiler({IntermediateStackBlock, IntermediateStack, InputOpcode, StackOpcode, InputType}) {
        return {
            ir: {
                command(block) {
                    switch (block.opcode) {
                        case 'jwFragment_define': {
                            let name = this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING);
                            if (name.opcode !== InputOpcode.CONSTANT) {
                                return new IntermediateStackBlock(StackOpcode.PM_CONTROL_THROW_ERROR, {
                                    error: this.createConstantInput('Fragment names must be constants.')
                                });
                            }

                            this._jwFragments ??= {};
                            this._jwFragments[name.value] = this.descendSubstack(block, 'SUBSTACK');

                            return new IntermediateStackBlock(StackOpcode.NOP);
                        }
                        case 'jwFragment_use': {
                            let name = this.descendInputOfBlock(block, 'NAME').toType(InputType.STRING);
                            if (name.opcode !== InputOpcode.CONSTANT) {
                                return new IntermediateStackBlock(StackOpcode.PM_CONTROL_THROW_ERROR, {
                                    error: this.createConstantInput('Fragment names must be constants.')
                                });
                            }

                            let fragment = (this._jwFragments ?? {})[name.value];
                            if (!fragment) {
                                return new IntermediateStackBlock(StackOpcode.PM_CONTROL_THROW_ERROR, {
                                    error: this.createConstantInput('Fragments must be defined beforehand.')
                                });
                            }

                            return new IntermediateStackBlock(StackOpcode.CONTROL_IF_ELSE, {
                                condition: this.createConstantInput(true),
                                whenTrue: fragment,
                                whenFalse: new IntermediateStack()
                            });
                        }
                    }
                }
            }
        }
    }
}

module.exports = Extension;