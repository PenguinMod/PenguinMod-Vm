const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

const template = {
    extensions: ["colours_event"]
}

class Extension {
    constructor() {
        // every other frame block
        this._otherFrame = false;
        vm.runtime.on('RUNTIME_STEP_START', () => {
            this._otherFrame = !this._otherFrame;
            if (this._otherFrame) vm.runtime.startHats('pmEventsExpansion_everyOtherFrame'); 
        });

        vm.extensionManager.extendCompiler("pmEventsExpansion", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "pmEventsExpansion",
            name: 'Events Expansion',
            color: '#ffbf00',
            blocks: [
                {
                    opcode: 'everyOtherFrame',
                    text: 'every other frame',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    ...template
                },
                {
                    opcode: 'neverr',
                    text: 'never',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    ...template
                },
                "---",
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
                "---",
                {
                    opcode: 'sendWithData',
                    text: 'broadcast [BROADCAST] with data [DATA]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {
                            fillInGlobal: "event_broadcast_menu"
                        },
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    }
                },
                {
                    opcode: 'recievedDataReporter',
                    text: 'received data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true
                },
            ],
            menus: {
                spriteName: "_spriteName",
                broadcastMenu: "_broadcastMenu"
            }
        };
    }

    extendCompiler({ IntermediateStackBlock, IntermediateInput, InputType, InputOpcode }) {
        const opcodes = {
            SEND_WITH_DATA: 'pmEventsExpansion.sendWithData',
            RECIEVED_DATA_REPORTER: 'pmEventsExpansion.recievedDataReporter',
        };

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case "pmEventsExpansion_recievedDataReporter":
                            return new IntermediateInput(opcodes.RECIEVED_DATA_REPORTER, InputType.ANY);
                    };
                },
                command(block) {
                    switch (block.opcode) {
                        case "pmEventsExpansion_sendWithData":
                            return new IntermediateStackBlock(opcodes.SEND_WITH_DATA, {
                                broadcast: this.descendInputOfBlock(block, 'BROADCAST').toType(InputType.STRING),
                                data: this.descendInputOfBlock(block, 'DATA'),
                            });
                    };
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.RECIEVED_DATA_REPORTER:
                            return `thread._pmEventsExpansionBroadcastData ?? null`;
                    };
                },
                command(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.SEND_WITH_DATA:
                            const broadcast = this.descendInput(node.broadcast);
                            const data = this.descendInput(node.data);
                            const b = this.localVariables.next();
                            this.source += `const ${b} = runtime.getTargetForStage().lookupBroadcastMsg("", ${broadcast});\n`
                            this.source += `if (${b}) ${b}.isSent = true;\n`
                            this.source += `for (const thread of startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${broadcast} })) { thread._pmEventsExpansionBroadcastData = ${data}; };\n`
                            return true;
                    };
                }
            },
        };
    }

    // menus
    
    _spriteName() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of vm.runtime.targets) {
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
        for (const target of vm.runtime.targets) {
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
}

module.exports = Extension