const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const ArgumentAlignment = require('../../extension-support/argument-alignment');
const Cast = require('../../util/cast');
const AsyncIcon = require('./async.svg');

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px
const pathToMedia = 'static/blocks-media'; // ScratchBlocks.mainWorkspace.options.pathToMedia

const blocks = `
<block type="control_repeatForSeconds">
    <value name="TIMES">
        <shadow type="math_number">
            <field name="NUM">1</field>
        </shadow>
    </value>
</block>
<block type="control_inline_stack_output">
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
<block type="control_waittick"/>
%block3>
${blockSeparator}
%block2>
%block4>
%block5>
${blockSeparator}
<block type="control_get_counter"/>
<block type="control_incr_counter"/>
<block type="control_decr_counter"/>
<block type="control_set_counter">
    <value name="VALUE">
        <shadow type="math_whole_number">
            <field name="NUM">10</field>
        </shadow>
    </value>
</block>
<block type="control_clear_counter"/>
${blockSeparator}
<block type="control_if">
    <value name="CONDITION">
        <shadow type="checkbox" />
    </value>
</block>
<block type="control_if_else">
    <value name="CONDITION">
        <shadow type="checkbox" />
    </value>
</block>
%block0>
%block1>
`;

/**
 * Class of idk
 * @constructor
 */
class pmControlsExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        // register compiled blocks
        this.runtime.registerCompiledExtensionBlocks('pmControlsExpansion', this.getCompileInfo());
    }

    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace(`%block${idx}>`, block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for extension category NOT blocks
     * this extension only contains blocks defined elsewhere,
     * since we just want to seperate them rather than create
     * slow versions of them
     */
    getInfo() {
        return {
            id: 'pmControlsExpansion',
            name: 'Controls Expansion',
            color1: '#FFAB19',
            color2: '#EC9C13',
            color3: '#CF8B17',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'ifElseIf',
                    text: [
                        'if [CONDITION1] then',
                        'else if [CONDITION2] then'
                    ],
                    branchCount: 2,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        CONDITION1: { type: ArgumentType.BOOLEAN },
                        CONDITION2: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'ifElseIfElse',
                    text: [
                        'if [CONDITION1] then',
                        'else if [CONDITION2] then',
                        'else'
                    ],
                    branchCount: 3,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        CONDITION1: { type: ArgumentType.BOOLEAN },
                        CONDITION2: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'asNewBroadcast',
                    text: [
                        'new thread',
                        '[ICON]'
                    ],
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    alignments: [
                        null, // text
                        null, // SUBSTACK
                        ArgumentAlignment.RIGHT // ICON
                    ],
                    arguments: {
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: AsyncIcon
                        }
                    }
                },
                {
                    opcode: 'restartFromTheTop',
                    text: 'restart from the top [ICON]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    arguments: {
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: `${pathToMedia}/repeat.svg`
                        }
                    }
                },
                {
                    opcode: 'asNewBroadcastArgs',
                    text: [
                        'new thread with data [DATA]',
                        '[ICON]'
                    ],
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    alignments: [
                        null, // text
                        null, // SUBSTACK
                        ArgumentAlignment.RIGHT // ICON
                    ],
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc",
                            exemptFromNormalization: true
                        },
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: AsyncIcon
                        }
                    }
                },
                {
                    opcode: 'asNewBroadcastArgBlock',
                    text: 'thread data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true
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
                ifElseIf: (generator, block) => ({
                    kind: 'stack',
                    condition1: generator.descendInputOfBlock(block, 'CONDITION1'),
                    condition2: generator.descendInputOfBlock(block, 'CONDITION2'),
                    whenTrue1: generator.descendSubstack(block, 'SUBSTACK'),
                    whenTrue2: generator.descendSubstack(block, 'SUBSTACK2')
                }),
                ifElseIfElse: (generator, block) => ({
                    kind: 'stack',
                    condition1: generator.descendInputOfBlock(block, 'CONDITION1'),
                    condition2: generator.descendInputOfBlock(block, 'CONDITION2'),
                    whenTrue1: generator.descendSubstack(block, 'SUBSTACK'),
                    whenTrue2: generator.descendSubstack(block, 'SUBSTACK2'),
                    whenTrue3: generator.descendSubstack(block, 'SUBSTACK3')
                }),
                restartFromTheTop: () => ({
                    kind: 'stack'
                })
            },
            js: {
                ifElseIf: (node, compiler, imports) => {
                    compiler.source += `if (${compiler.descendInput(node.condition1).asBoolean()}) {\n`;
                    compiler.descendStack(node.whenTrue1, new imports.Frame(false));
                    compiler.source += `} else if (${compiler.descendInput(node.condition2).asBoolean()}) {\n`;
                    compiler.descendStack(node.whenTrue2, new imports.Frame(false));
                    compiler.source += `}\n`;
                },
                ifElseIfElse: (node, compiler, imports) => {
                    compiler.source += `if (${compiler.descendInput(node.condition1).asBoolean()}) {\n`;
                    compiler.descendStack(node.whenTrue1, new imports.Frame(false));
                    compiler.source += `} else if (${compiler.descendInput(node.condition2).asBoolean()}) {\n`;
                    compiler.descendStack(node.whenTrue2, new imports.Frame(false));
                    compiler.source += `} else {\n`;
                    compiler.descendStack(node.whenTrue3, new imports.Frame(false));
                    compiler.source += `}\n`;
                },
                restartFromTheTop: (_, compiler) => {
                    compiler.source += `runtime._restartThread(thread);`;
                    compiler.source += `return;`;
                }
            }
        };
    }

    ifElseIf (args, util) {
        const condition1 = Cast.toBoolean(args.CONDITION1);
        const condition2 = Cast.toBoolean(args.CONDITION2);
        if (condition1) {
            util.startBranch(1, false);
        } else if (condition2) {
            util.startBranch(2, false);
        }
    }
    
    ifElseIfElse (args, util) {
        const condition1 = Cast.toBoolean(args.CONDITION1);
        const condition2 = Cast.toBoolean(args.CONDITION2);
        if (condition1) {
            util.startBranch(1, false);
        } else if (condition2) {
            util.startBranch(2, false);
        } else {
            util.startBranch(3, false);
        }
    }
    
    restartFromTheTop() {
        return; // doesnt work in compat mode
    }

    // CubesterYT code probably
    asNewBroadcast(_, util) {
        if (util.thread.target.blocks.getBranch(util.thread.peekStack(), 0)) {
            util.sequencer.runtime._pushThread(
                util.thread.target.blocks.getBranch(util.thread.peekStack(), 0),
                util.target,
                {}
            );
        }
    }
    asNewBroadcastArgs(args, util) {
        const data = args.DATA;
        if (util.thread.target.blocks.getBranch(util.thread.peekStack(), 0)) {
            const thread = util.sequencer.runtime._pushThread(
                util.thread.target.blocks.getBranch(util.thread.peekStack(), 0),
                util.target,
                {}
            );

            thread.__controlx_asNewBroadcastArgs_data = data;
        }
    }
    asNewBroadcastArgBlock(_, util) {
        return util.thread.__controlx_asNewBroadcastArgs_data;
    }
}

module.exports = pmControlsExpansion;
