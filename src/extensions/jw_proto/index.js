const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');

/**
 * Class for Proto blocks
 * @constructor
 */
class jwProto {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        // register compiled blocks
        this.runtime.registerCompiledExtensionBlocks('jwProto', this.getCompileInfo());
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            autoLoad: true,
            id: 'jwProto',
            // ok at this point, just make a new extension if you add more stuff
            // its been so long that it just wouldnt make sense for this to have other stuff
            name: 'Labels',
            // blockIconURI: blockIconURI,
            color1: '#969696',
            color2: '#6e6e6e',
            blocks: [
                {
                    opcode: 'labelHat',
                    text: formatMessage({
                        id: 'jwProto.blocks.labelHat',
                        default: '// [LABEL]',
                        description: 'Label for some unused blocks.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.HAT,
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: "label"
                        }
                    }
                },
                {
                    opcode: 'labelFunction',
                    text: formatMessage({
                        id: 'jwProto.blocks.labelFunction',
                        default: '// [LABEL]',
                        description: 'Label for some blocks.'
                    }),
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
                    text: formatMessage({
                        id: 'jwProto.blocks.labelCommand',
                        default: '// [LABEL]',
                        description: 'Label for labeling.'
                    }),
                    disableMonitor: true,
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
                    text: formatMessage({
                        id: 'jwProto.blocks.labelReporter',
                        default: '[VALUE] // [LABEL]',
                        description: 'Label for a value.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
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
                    text: formatMessage({
                        id: 'jwProto.blocks.labelBoolean',
                        default: '[VALUE] // [LABEL]',
                        description: 'Label for a boolean.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
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
                {
                    blockType: BlockType.LABEL,
                    text: "Placeholders"
                },
                {
                    opcode: 'placeholderCommand',
                    text: formatMessage({
                        id: 'jwProto.blocks.placeholderCommand',
                        default: '...',
                        description: 'Placeholder for stack blocks.'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'placeholderReporter',
                    text: formatMessage({
                        id: 'jwProto.blocks.placeholderReporter',
                        default: '...',
                        description: 'Placeholder for a value.'
                    }),
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'placeholderBoolean',
                    text: formatMessage({
                        id: 'jwProto.blocks.placeholderBoolean',
                        default: '...',
                        description: 'Placeholder for a boolean.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN
                },
            ]
        };
    }
    /**
     * This function is used for any compiled blocks in the extension if they exist.
     * Data in this function is given to the IR & JS generators.
     * Data must be valid otherwise errors may occur.
     * @returns {object} functions that create data for compiled blocks.
     */
    getCompileInfo() {
        return {
            ir: {
                labelFunction: (generator, block) => ({
                    kind: 'stack',
                    branch: generator.descendSubstack(block, 'SUBSTACK')
                })
            },
            js: {
                labelFunction: (node, compiler, imports) => {
                    compiler.descendStack(node.branch, new imports.Frame(false));
                }
            }
        };
    }

    labelHat() {
        return false;
    }
    labelFunction(_, util) {
        util.startBranch(1, false);
    }
    labelCommand() {
        return;
    }
    labelReporter(args) {
        return args.VALUE;
    }
    labelBoolean(args) {
        return args.VALUE;
    }

    placeholderCommand() {
        return;
    }
    placeholderReporter() {
        return '';
    }
    placeholderBoolean() {
        return false;
    }
}

module.exports = jwProto;
