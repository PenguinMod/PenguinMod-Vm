const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');

class jwProto {
    constructor() {
        vm.extensionManager.extendCompiler("jwProto", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: 'jwProto',
            name: 'Labels',
            color: '#969696',
            menuIconURI: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDEyMCwgMTIwLCAxMjApOyBmaWxsOiByZ2IoMTUwLCAxNTAsIDE1MCk7IiBjeD0iMTAiIGN5PSIxMCIgcng9IjkuNSIgcnk9IjkuNSI+PC9lbGxpcHNlPgogIDxsaW5lIHN0eWxlPSJzdHJva2UtbGluZWNhcDogcm91bmQ7IHN0cm9rZS1saW5lam9pbjogcm91bmQ7IHN0cm9rZS13aWR0aDogMjsgZmlsbDogbm9uZTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IiB4MT0iOS44ODQiIHkxPSI2LjIzMiIgeDI9IjYuMTE2IiB5Mj0iMTMuNzY4Ij48L2xpbmU+CiAgPGxpbmUgc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAyOyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiIHgxPSIxMy44ODQiIHkxPSI2LjIzMiIgeDI9IjEwLjExNiIgeTI9IjEzLjc2OCI+PC9saW5lPgo8L3N2Zz4=',
            blocks: [
                {
                    opcode: 'labelHat',
                    text: '// [LABEL]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        }
                    }
                },
                {
                    opcode: 'labelFunction',
                    text: '// [LABEL]',
                    blockType: BlockType.COMMAND,
                    branchCount: 1,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        }
                    }
                },
                {
                    opcode: 'labelCommand',
                    text: '// [LABEL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        }
                    }
                },
                {
                    opcode: 'labelReporter',
                    text: '[VALUE] // [LABEL]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "value"
                        }
                    }
                },
                {
                    opcode: 'labelBoolean',
                    text: '[VALUE] // [LABEL]',
                    blockType: BlockType.BOOLEAN,
                    hideFromPalette: true,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        },
                        VALUE: {
                            type: ArgumentType.BOOLEAN
                        }
                    }
                },
                "---",
                {
                    opcode: 'placeholderCommand',
                    text: '...',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true
                },
                {
                    opcode: 'placeholderReporter',
                    text: '...',
                    blockType: BlockType.REPORTER,
                    dualBlock: true,
                    allowDropAnywhere: true,
                    disableMonitor: true,
                },
                {
                    opcode: 'placeholderBoolean',
                    text: '...',
                    blockType: BlockType.BOOLEAN,
                    hideFromPalette: true
                },
            ]
        };
    }
    
    extendCompiler({IntermediateStackBlock, IntermediateStack, StackOpcode}) {
        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwProto_labelReporter':
                        case 'jwProto_labelBoolean':
                            return this.descendInputOfBlock(block, 'VALUE');
                        case 'jwProto_placeholderReporter':
                            return this.createConstantInput(null);
                        case 'jwProto_placeholderBoolean':
                            return this.createConstantInput(false);
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwProto_labelFunction':
                            return new IntermediateStackBlock(StackOpcode.CONTROL_IF_ELSE, {
                                condition: this.createConstantInput(true),
                                whenTrue: this.descendSubstack(block, 'SUBSTACK'),
                                whenFalse: new IntermediateStack()
                            });
                        case 'jwProto_labelCommand':
                        case 'jwProto_placeholderCommand':
                        case 'jwProto_placeholderReporter':
                            return new IntermediateStackBlock(StackOpcode.NOP);
                    }
                }
            }
        };
    }
}

module.exports = jwProto;
