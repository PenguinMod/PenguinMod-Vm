const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px

const blocks = `
<!-- %b4 > nah -->
<block type="event_whenbroadcastreceived"></block>
<block type="pmEventsExpansion_sendWithData">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="DATA">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
<block type="pmEventsExpansion_isBroadcastReceived">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
%b5>
${blockSeparator}
<!-- %b6 > -->
<block type="pmEventsExpansion_broadcastToSprite">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastFunction">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastFunctionArgs">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="ARGS">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
%b8>
${blockSeparator}
%b2>
%b0>
%b1>
${blockSeparator}
<block type="pmEventsExpansion_broadcastThreadCount">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
`

/**
 * Class of idk
 * @constructor
 */
class pmEventsExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        // every other frame block
        this._otherFrame = false;
        this.runtime.on('RUNTIME_STEP_START', () => {
            this._everyOtherFrame();
        });
    }

    // stepUpdates
    _everyOtherFrame() {
        if (this._otherFrame) {
            this.runtime.startHats('pmEventsExpansion_everyOtherFrame');
            this._otherFrame = false;
        } else {
            this._otherFrame = true;
        }
    }

    // order
    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace('%b' + idx + '>', block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for extension
     */
    getInfo() {
        return {
            id: 'pmEventsExpansion',
            name: 'Events Expansion',
            color1: '#FFBF00',
            color2: '#E6AC00',
            color3: '#CC9900',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'everyOtherFrame',
                    text: 'every other frame',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    switches: [
                        { isNoop: true },
                        'neverr'
                    ]
                },
                {
                    opcode: 'neverr',
                    text: 'never',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    switches: [
                        'everyOtherFrame',
                        { isNoop: true },
                    ]
                },
                {
                    opcode: 'whenSpriteClicked',
                    text: 'when [SPRITE] clicked',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: "spriteName"
                        }
                    }
                },
                {
                    opcode: 'sendWithData',
                    text: 'broadcast [BROADCAST] with data [DATA]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    }
                },
                {
                    opcode: 'receivedData',
                    text: 'when I receive [BROADCAST] with data',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            menu: "broadcastMenu"
                        }
                    }
                },
                {
                    opcode: 'isBroadcastReceived',
                    text: 'is message [BROADCAST] received?',
                    blockType: BlockType.BOOLEAN,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    }
                },
                {
                    opcode: 'recievedDataReporter',
                    text: 'recieved data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true
                },
                {
                    opcode: 'broadcastToSprite',
                    text: 'broadcast [BROADCAST] to [SPRITE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: "spriteName"
                        }
                    }
                },
                {
                    opcode: 'broadcastFunction',
                    text: 'broadcast [BROADCAST] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    },
                    switches: [
                        { isNoop: true },
                        'broadcastFunctionArgs',
                        'broadcastThreadCount'
                    ],
                    switchText: 'broadcast and wait'
                },
                {
                    opcode: 'returnFromBroadcastFunc',
                    text: 'return [VALUE]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    disableMonitor: true,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "1"
                        }
                    }
                },
                {
                    opcode: 'broadcastThreadCount',
                    text: 'broadcast [BROADCAST] and get # of blocks started',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    },
                    switches: [
                        'broadcastFunction',
                        'broadcastFunctionArgs',
                        { isNoop: true },
                    ],
                    switchText: 'broadcast and get blocks started'
                },
                {
                    opcode: 'broadcastFunctionArgs',
                    text: 'broadcast [BROADCAST] with data [ARGS] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        ARGS: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    },
                    switches: [
                        'broadcastFunction',
                        { isNoop: true },
                        'broadcastThreadCount'
                    ],
                    switchText: 'broadcast with data'
                },
            ],
            menus: {
                spriteName: "_spriteName",
                broadcastMenu: "_broadcastMenu"
            }
        };
    }

    // menus
    _spriteId() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: target.id
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.id
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }
    _spriteName() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: "_stage_"
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.sprite.name
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }
    _broadcastMenu() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: target.id
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.id
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }

    // blocks
    sendWithData(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const data = Cast.toString(args.DATA);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const threads = util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        });
        for (const thread of threads) {
            thread.__evex_recievedDataa = data;
        }
    }
    broadcastToSprite(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const sprite = Cast.toString(args.SPRITE);
        const target = sprite === "_stage_" ?
            this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(sprite);
        util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        }, target);
    }
    broadcastThreadCount(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const threads = util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        });
        return threads.length;
    }
    recievedDataReporter(_, util) {
        return util.thread.__evex_recievedDataa;
    }
    returnFromBroadcastFunc(args, util) {
        util.thread.__evex_returnDataa = args.VALUE;
    }
    isBroadcastReceived(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        return Cast.toBoolean(broadcastVar && broadcastVar.isSent);
    }
    broadcastFunction() {
        return; // compiler block
    }
    broadcastFunctionArgs() {
        return; // compiler block
    }
}

module.exports = pmEventsExpansion;
