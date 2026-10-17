const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

const template = {
    extensions: ["colours_control"]
}

class Extension {
    getInfo() {
        return {
            id: "pmControlsExpansion",
            name: "Controls Expansion",
            color: "#ffab19",
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: `
                    <block type="control_repeatForSeconds">
                        <value name="TIMES">
                            <shadow type="math_number" />
                        </value>
                    </block>
                    <block type="control_waittick" />
                    `
                },
                "---",
                {
                    opcode: 'asNewBroadcast',
                    text: "new thread",
                    blockType: BlockType.COMMAND,
                    branches: [{}],
                    ...template
                    /*alignments: [
                        null, // text
                        null, // SUBSTACK
                        ArgumentAlignment.RIGHT // ICON
                    ],
                    arguments: {
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: AsyncIcon
                        }
                    }*/
                },
                {
                    opcode: 'asNewBroadcastArgs',
                    text: "new thread with data [DATA] [SHADOW]",
                    blockType: BlockType.COMMAND,
                    branches: [{}],
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        SHADOW: {
                            fillIn: 'asNewBroadcastArgBlock'
                        }
                    },
                    ...template
                },
                {
                    opcode: 'asNewBroadcastArgBlock',
                    text: 'thread data',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    allowDropAnywhere: true,
                    canDragDuplicate: true,
                    ...template
                },
                "---",
                {
                    blockType: BlockType.XML,
                    xml: `
                    <block type="control_get_counter" />
                    <block type="control_incr_counter" />
                    <block type="control_decr_counter" />
                    <block type="control_set_counter">
                        <value name="VALUE">
                            <shadow type="math_integer">
                                <field name="NUM">1</field>
                            </shadow>
                        </value>
                    </block>
                    <block type="control_clear_counter" />
                    `
                },
                "---",
                {
                    opcode: 'void',
                    text: "void [INPUT]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INPUT: {}
                    },
                    ...template
                }
            ]
        };
    }

    // CubesterYT code probably
    asNewBroadcast(_, util) {
        if (util.thread.target.blocks.getBranch(util.thread.peekStack(), 0)) {
            util.sequencer.runtime._pushThread(
                util.thread.target.blocks.getBranch(util.thread.peekStack(), 0),
                util.target,
                {fromThread: util.thread}
            );
        }
    }

    asNewBroadcastArgs(args, util) {
        const data = args.DATA;
        if (util.thread.target.blocks.getBranch(util.thread.peekStack(), 0)) {
            const thread = util.sequencer.runtime._pushThread(
                util.thread.target.blocks.getBranch(util.thread.peekStack(), 0),
                util.target,
                {fromThread: util.thread}
            );

            thread._pmControlsExpansionThreadData = data;
        }
    }

    asNewBroadcastArgBlock(_, util) {
        return util.thread._pmControlsExpansionThreadData ?? null;
    }

    void(args, util) {
        // do nothing
    }
}

module.exports = Extension