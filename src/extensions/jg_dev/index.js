const BlockType = require('../../extension-support/block-type');
const BlockShape = require('../../extension-support/block-shape');
const ArgumentType = require('../../extension-support/argument-type');
const ArgumentAlignment = require('../../extension-support/argument-alignment');
const Cast = require('../../util/cast');
const MathUtil = require('../../util/math-util');
const test_indicator = require('./test_indicator.png');
const { noopSwitch } = require('../../extension-support/extension-addon-switchers')

const pathToMedia = 'static/blocks-media';

/**
 * Class for Dev blocks
 * @constructor
 */
class JgDevBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        // register compiled blocks
        this.runtime.registerCompiledExtensionBlocks('jgDev', this.getCompileInfo());
    }

    // util


    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgDev',
            name: 'Test Extension',
            color1: '#4275f5',
            color2: '#425df5',
            blocks: [
                {
                    opcode: 'stopSound',
                    text: 'stop sound [ID]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.STRING, defaultValue: "id" }
                    }
                },
                {
                    opcode: 'starttimeSound',
                    text: 'start sound [ID] at seconds [SEX]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.SOUND, defaultValue: "name or index" },
                        SEX: { type: ArgumentType.NUMBER, defaultValue: 0 }
                    }
                },
                {
                    opcode: 'transitionSound',
                    text: 'set sound [ID] volume transition to seconds [SEX]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ID: { type: ArgumentType.SOUND, defaultValue: "sound to set fade out effect on" },
                        SEX: { type: ArgumentType.NUMBER, defaultValue: 1 }
                    }
                },
                {
                    opcode: 'logArgs1',
                    text: 'costume input [INPUT] sound input [INPUT2]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.COSTUME },
                        INPUT2: { type: ArgumentType.SOUND }
                    }
                },
                {
                    opcode: 'logArgs2',
                    text: 'variable input [INPUT] list input [INPUT2]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.VARIABLE },
                        INPUT2: { type: ArgumentType.LIST }
                    }
                },
                {
                    opcode: 'logArgs3',
                    text: 'broadcast input [INPUT]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.BROADCAST }
                    }
                },
                {
                    opcode: 'logArgs4',
                    text: 'color input [INPUT]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: { type: ArgumentType.COLOR }
                    }
                },
                {
                    opcode: 'setEffectName',
                    text: 'set [EFFECT] to [VALUE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        EFFECT: { type: ArgumentType.STRING, defaultValue: "color" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 0 }
                    }
                },
                {
                    opcode: 'setBlurEffect',
                    text: 'set blur [PX]px',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PX: { type: ArgumentType.NUMBER, defaultValue: 0 }
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
                            dataURI: pathToMedia + "/repeat.svg"
                        }
                    }
                },
                {
                    opcode: 'doodooBlockLolol',
                    text: 'ignore blocks inside [INPUT]',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        INPUT: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'ifFalse',
                    text: 'if [INPUT] is false',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        INPUT: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'multiplyTest',
                    text: 'multiply [VAR] by [MULT] then',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        VAR: { type: ArgumentType.STRING, menu: "variable" },
                        MULT: { type: ArgumentType.NUMBER, defaultValue: 4 }
                    }
                },
                {
                    opcode: 'compiledIfNot',
                    text: 'if not [CONDITION] then (compiled)',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        CONDITION: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'compiledReturn',
                    text: 'return [RETURN]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    arguments: {
                        RETURN: { type: ArgumentType.STRING, defaultValue: '1' }
                    }
                },
                {
                    opcode: 'compiledOutput',
                    text: 'compiled code',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'branchNewThread',
                    text: 'new thread',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL
                },
                {
                    opcode: 'whatthescallop',
                    text: 'bruh [numtypeableDropdown] [typeableDropdown] overriden: [overridennumtypeableDropdown] [overridentypeableDropdown]',
                    arguments: {
                        numtypeableDropdown: {
                            menu: 'numericTypeableTest'
                        },
                        typeableDropdown: {
                            menu: 'typeableTest'
                        },
                        overridennumtypeableDropdown: {
                            menu: 'numericTypeableTest',
                            defaultValue: 5
                        },
                        overridentypeableDropdown: {
                            menu: 'typeableTest',
                            defaultValue: 'your mom'
                        }
                    },
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'booleanMonitor',
                    text: 'boolean monitor',
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'ifFalseReturned',
                    text: 'if [INPUT] is false (return)',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    arguments: {
                        INPUT: { type: ArgumentType.BOOLEAN }
                    }
                },
                {
                    opcode: 'turbrowaorploop',
                    blockType: BlockType.LOOP,
                    text: 'my repeat [TIMES]',
                    arguments: {
                        TIMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'alignmentTestate',
                    blockType: BlockType.CONDITIONAL,
                    text: [
                        'this block tests alignments',
                        'left',
                        'middle',
                        'right'
                    ],
                    alignments: [
                        null,
                        null,
                        ArgumentAlignment.LEFT,
                        null,
                        ArgumentAlignment.CENTER,
                        null,
                        ArgumentAlignment.RIGHT
                    ],
                    branchCount: 3
                },
                {
                    opcode: 'squareReporter',
                    text: 'square boy',
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE
                },
                {
                    opcode: 'branchIndicatorTest',
                    text: 'this has a custom branchIndicator',
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    branchIndicator: test_indicator
                },
                {
                    opcode: 'givesAnError',
                    text: 'throw an error',
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'hiddenBoolean',
                    text: 'im actually a boolean output',
                    blockType: BlockType.REPORTER,
                    forceOutputType: 'Boolean',
                    disableMonitor: true
                },
                {
                    opcode: 'varvarvavvarvarvar',
                    text: 'varibles!?!?!??!?!?!?!?!!!?!?! [variable]',
                    arguments: {
                        variable: {
                            menu: 'variableInternal'
                        }
                    },
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'varvarvavvarvar',
                    text: 'varibles!?!?!??!?!?!?!?!!!?!?! but fixed [variable]',
                    arguments: {
                        variable: {
                            menu: 'variableButDefaulted'
                        }
                    },
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'green',
                    text: 'im literally just green',
                    blockType: BlockType.REPORTER,
                    color1: '#00ff00',
                    color2: '#000000',
                    color3: '#000000',
                    disableMonitor: true
                },
                {
                    opcode: 'duplicato',
                    text: 'duplicato',
                    blockType: BlockType.REPORTER,
                    canDragDuplicate: true,
                    disableMonitor: true,
                    hideFromPalette: true
                },
                {
                    opcode: 'theheheuoihew9h9',
                    blockType: BlockType.COMMAND,
                    text: 'This block will appear in the penguinmod wiki [SEP] [DUPLIC]',
                    arguments: {
                        SEP: {
                            type: ArgumentType.SEPERATOR,
                        },
                        DUPLIC: {
                            type: ArgumentType.STRING,
                            fillIn: 'duplicato',
                        }
                    }
                },
                {
                    opcode: 'variable',
                    blockType: BlockType.REPORTER,
                    text: '[var]',
                    arguments: {
                        var: {
                            menu: 'variableInternal'
                        }
                    },
                    canDragDuplicate: true,
                    disableMonitor: true,
                    hideFromPalette: true
                },
                {
                    opcode: 'theheheuoihew9h9666',
                    blockType: BlockType.COMMAND,
                    text: 'This block will appear in the penguinmod wiki [SEP] [DUPLIC]',
                    arguments: {
                        SEP: {
                            type: ArgumentType.SEPERATOR,
                        },
                        DUPLIC: {
                            type: ArgumentType.STRING,
                            fillIn: 'variable',
                        }
                    }
                },
                {
                    opcode: 'docsScreenshotBlock',
                    text: 'text',
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.TICKET,
                    color1: '#0088FF',
                    disableMonitor: true
                },
                {
                    opcode: 'costumeTypeTest',
                    blockType: BlockType.REPORTER,
                    text: 'test custom type updating/rendering (new instance)'
                },
                {
                    opcode: 'costumeTypeTestSame',
                    blockType: BlockType.REPORTER,
                    text: 'test custom type updating/rendering (same instance)'
                },
                {
                    opcode: 'spriteDefaultType',
                    blockType: BlockType.REPORTER,
                    text: 'get this target'
                },
                {
                    opcode: 'spriteDefaultTypeOther',
                    blockType: BlockType.REPORTER,
                    text: 'get stage target'
                },
                {
                    opcode: 'costumeDefaultType',
                    blockType: BlockType.REPORTER,
                    text: 'get current costume'
                },
                {
                    opcode: 'soundDefaultType',
                    blockType: BlockType.REPORTER,
                    text: 'get first sound'
                },
                {
                    opcode: 'epicLabelTest',
                    text: 'look at my cool label',
                    blockType: BlockType.REPORTER,
                    disableMonitor: false,
                    label: "Wow this is a nice label",
                },
                {
                    opcode: 'epicLabelTest2',
                    text: 'i have a COOLER label, with my [TYPE]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: false,
                    labelFn: "epicLabelTest2Label",
                    arguments: {
                        TYPE: {
                            type: ArgumentType.STRING,
                            menu: 'epicLabelTestMenu',
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "Native CUSTOM_SHAPES"
                },
                {
                    opcode: 'customShapeOCTAGONAL',
                    text: 'custom shape OCTAGONAL [TEST]',
                    forceOutputType: BlockShape.OCTAGONAL,
                    blockShape: BlockShape.OCTAGONAL,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeBUMPED',
                    text: 'custom shape BUMPED [TEST]',
                    forceOutputType: BlockShape.BUMPED,
                    blockShape: BlockShape.BUMPED,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeINDENTED',
                    text: 'custom shape INDENTED [TEST]',
                    forceOutputType: BlockShape.INDENTED,
                    blockShape: BlockShape.INDENTED,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeSCRAPPED',
                    text: 'custom shape SCRAPPED [TEST]',
                    forceOutputType: BlockShape.SCRAPPED,
                    blockShape: BlockShape.SCRAPPED,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeARROW',
                    text: 'custom shape ARROW [TEST]',
                    forceOutputType: BlockShape.ARROW,
                    blockShape: BlockShape.ARROW,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeTICKET',
                    text: 'custom shape TICKET [TEST]',
                    forceOutputType: BlockShape.TICKET,
                    blockShape: BlockShape.TICKET,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEST: {
                            type: ArgumentType.STRING,
                        }
                    }
                },
                {
                    opcode: 'customShapeInputOCTAGONAL',
                    arguments: {
                        TEST: {
                            shape: BlockShape.OCTAGONAL,
                            check: BlockShape.OCTAGONAL,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'customShapeInputBUMPED',
                    arguments: {
                        TEST: {
                            shape: BlockShape.BUMPED,
                            check: BlockShape.BUMPED,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'customShapeInputINDENTED',
                    arguments: {
                        TEST: {
                            shape: BlockShape.INDENTED,
                            check: BlockShape.INDENTED,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'customShapeInputSCRAPPED',
                    arguments: {
                        TEST: {
                            shape: BlockShape.SCRAPPED,
                            check: BlockShape.SCRAPPED,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'customShapeInputARROW',
                    arguments: {
                        TEST: {
                            shape: BlockShape.ARROW,
                            check: BlockShape.ARROW,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'customShapeInputTICKET',
                    arguments: {
                        TEST: {
                            shape: BlockShape.TICKET,
                            check: BlockShape.TICKET,
                        }
                    },
                    text: 'custom shape [TEST]',
                    blockType: BlockType.REPORTER,
                },
                {
                    blockType: BlockType.LABEL,
                    text: "switching test cases"
                },
                {
                    opcode: "switches_noparams",
                    text: "Switches test case 1",
                    func: "noop",
                    blockType: BlockType.COMMAND,
                    switches: [
                        noopSwitch,
                        "switches_noparams2"
                    ]
                },
                {
                    opcode: "switches_noparams2",
                    text: "Switches test case 2",
                    func: "noop",
                    blockType: BlockType.COMMAND,
                    switches: [
                        "switches_noparams",
                        noopSwitch,
                    ]
                },
                {
                    opcode: "switches_params",
                    text: "Has params [p1] [p2]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello"
                        },
                        p2: {
                            type: ArgumentType.STRING,
                            defaultValue: "world"
                        }
                    },
                    switches: [
                        noopSwitch,
                        "switches_params2"
                    ]
                },
                {
                    opcode: "switches_params2",
                    text: "Has params2 [p1] [p2]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            defaultValue: "hi"
                        },
                        p2: {
                            type: ArgumentType.STRING,
                            defaultValue: "earth"
                        }
                    },
                    switches: [
                        "switches_params",
                        noopSwitch,
                    ]
                },
                {
                    opcode: "switches_createparams",
                    text: "Create params",
                    func: "noop",
                    blockType: BlockType.COMMAND,
                    switches: [
                        "switches_deleteparams",
                        noopSwitch,
                    ]
                },
                {
                    opcode: "switches_deleteparams",
                    text: "Delete params [p1] [p2]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello"
                        },
                        p2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "3"
                        }
                    },
                    switches: [
                        noopSwitch,
                        "switches_createparams"
                    ]
                },
                {
                    opcode: "switches_renameparams",
                    text: "Rename params [p1] [p2]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            defaultValue: "hello"
                        },
                        p2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "3"
                        }
                    },
                    switches: [
                        noopSwitch,
                        {
                            opcode: "switches_renameparams2",
                            remapArguments: {
                                p1: "p3",
                                p2: "p1"
                            }
                        }
                    ]
                },
                {
                    opcode: "switches_renameparams2",
                    text: "Rename params2 [p3] [p1]",
                    func: "noop",
                    arguments: {
                        p3: {
                            type: ArgumentType.STRING,
                            defaultValue: "hi"
                        },
                        p1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "5"
                        }
                    },
                    switches: [
                        noopSwitch,
                        {
                            opcode: "switches_renameparams",
                            remapArguments: {
                                p3: "p1",
                                p1: "p2"
                            }
                        }
                    ]
                },
                {
                    opcode: "switches_shadow1",
                    text: "Switch shadow type [p1]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            defaultValue: "3"
                        }
                    },
                    switches: [
                        noopSwitch,
                        "switches_shadow2"
                    ]
                },
                {
                    opcode: "switches_shadow2",
                    text: "Switch shadow type2 [p1]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "1"
                        }
                    },
                    switches: [
                        "switches_shadow1",
                        noopSwitch,
                    ]
                },
                {
                    opcode: "switches_menu1",
                    text: "Switch menus [p1]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            menu: "switch_menu1"
                        }
                    },
                    switches: [
                        noopSwitch,
                        {
                            opcode: "switches_menu2",
                            remapMenus: {
                                p1: {
                                    "3": "1",
                                    "2": "1",
                                    "1": "0",
                                    "0": "0",
                                }
                            }
                        }
                    ]
                },
                {
                    opcode: "switches_menu2",
                    text: "Switch menus2 [p1]",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            menu: "switch_menu2"
                        }
                    },
                    switches: [
                        {
                            opcode: "switches_menu1",
                            remapMenus: {
                                p1: {
                                    "1": "2",
                                    "0": "1",
                                }
                            }
                        },
                        noopSwitch,
                    ]
                },
                {
                    opcode: "switches_broken",
                    text: "intentionally broken switch",
                    func: "noop",
                    arguments: {
                        p1: {
                            type: ArgumentType.STRING,
                            menu: "switch_menu2"
                        }
                    },
                    switches: [
                        {},
                        [ "a" ],
                        new Map(),
                        17,
                        -18,
                        "switches_donotdefinemeangryfaceemoji",
                    ]
                },
            ],
            menus: {
                variableInternal: {
                    variableType: 'scalar',
                    defaultName: 'my variable'
                },
                variableButDefaulted: {
                    acceptReporters: true,
                    variableType: 'broadcast_msg',
                    defaultName: 'message1'
                },
                variable: "getVariablesMenu",
                numericTypeableTest: {
                    items: [
                        'item1',
                        'item2',
                        'item3'
                    ],
                    isTypeable: true,
                    isNumeric: true
                },
                typeableTest: {
                    items: [
                        'item1',
                        'item2',
                        'item3'
                    ],
                    isTypeable: true,
                    isNumeric: false
                },
                epicLabelTestMenu: {
                    items: [
                        { text: "BLOCK!!!", value: "block" },
                        { text: "Label Function ;D", value: "function" },
                    ]
                },
                switch_menu1: {
                    items: [
                        "aaaa!",
                        "oh no",
                        "why do i need this many",
                        "an extra one IG."
                    ].map((text, value) => { return { text, value: value.toString() } })
                },
                switch_menu2: {
                    items: [
                        "ok",
                        "I only need a couple here."
                    ].map((text, value) => { return { text, value: value.toString() } })
                }
            }
        };
    }
    spriteDefaultType(args, util) {
        return util.target;
    }
    spriteDefaultTypeOther(args, util) {
        return this.runtime.getTargetForStage();
    }
    costumeDefaultType(args, util) {
        return util.target.getCostumeType(util.target.currentCostume);
    }
    soundDefaultType(args, util) {
        return util.target.getSoundType(0);
    }
    costumeTypeTest() {
        return {
            _monitorUpToDate: false,
            costumId: 'thing',
            num: Math.sin(Date.now() / 1000),
            toReporterContent() {
                const el = document.createElement('span');
                el.style.color = '#F00';
                el.textContent = this.num;
                return el;
            },
            toMonitorContent() {
                this._monitorUpToDate = true;
                const el = document.createElement('span');
                el.style.color = '#0F0';
                el.textContent = this.num;
                return el;
            },
            toListItem() {
                this._monitorUpToDate = true;
                const el = document.createElement('span');
                el.style.color = '#00F';
                el.textContent = this.num;
                return el;
            },
            toListEditor() {
                return `[num ${this.num}]`;
            },
            fromListEditor(thing) {
                this.num = Number(thing.slice(5, -1));
                return this;
            }
        };
    }
    costumeTypeTestSame() {
        if (!this.custom) this.custom = this.costumeTypeTest();
        this.custom.num = Math.sin(Date.now() / 1000);
        this.custom._monitorUpToDate = false;
        return this.custom;
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
                compiledIfNot: (generator, block) => ({
                    kind: 'stack', /* this gets replaced but we still need to say what type of block this is */
                    condition: generator.descendInputOfBlock(block, 'CONDITION'),
                    whenTrue: generator.descendSubstack(block, 'SUBSTACK'),
                    whenFalse: []
                }),
                compiledReturn: (generator, block) => ({
                    kind: 'stack',
                    return: generator.descendInputOfBlock(block, 'RETURN')
                }),
                restartFromTheTop: () => ({
                    kind: 'stack'
                }),
                compiledOutput: () => ({
                    kind: 'input' /* input is output :troll: (it makes sense in the ir & jsgen implementation ok) */
                })
            },
            js: {
                compiledIfNot: (node, compiler, imports) => {
                    compiler.source += `if (!(${compiler.descendInput(node.condition).asBoolean()})) {\n`;
                    compiler.descendStack(node.whenTrue, new imports.Frame(false));
                    // only add the else branch if it won't be empty
                    // this makes scripts have a bit less useless noise in them
                    if (node.whenFalse.length) {
                        compiler.source += `} else {\n`;
                        compiler.descendStack(node.whenFalse, new imports.Frame(false));
                    }
                    compiler.source += `}\n`;
                },
                compiledReturn: (node, compiler) => {
                    compiler.source += `return ${compiler.descendInput(node.return).asString()};`;
                },
                restartFromTheTop: (_, compiler) => {
                    compiler.source += `runtime._restartThread(thread);`;
                    compiler.source += `return;`;
                },
                compiledOutput: (_, compiler, imports) => {
                    const code = Cast.toString(compiler.source);
                    return new imports.TypedInput(JSON.stringify(code), imports.TYPE_STRING);
                }
            }
        };
    }

    varvarvavvarvarvar(args) {
        return JSON.stringify(args);
    }
    varvarvavvarvar(args) {
        return JSON.stringify(args);
    }

    // menu
    getVariablesMenu() {
        // menus can only be opened in the editor so use editingTarget
        const target = vm.editingTarget;
        const emptyMenu = [{ text: "", value: "" }];
        if (!target) return emptyMenu;
        if (!target.variables) return emptyMenu;
        const menu = Object.getOwnPropertyNames(target.variables).map(variableId => {
            const variable = target.variables[variableId];
            return {
                text: variable.name,
                value: variable.name
            };
        });
        // check if menu has 0 items because pm throws an error if theres no items
        return (menu.length > 0) ? menu : emptyMenu;
    }

    branchIndicatorTest() {
        return; // dude logs wont shut up because i didnt define this func
    }

    epicLabelTest() {
        return "get out !!! 🗣";
    }
    epicLabelTest2() {
        return "hmm quite peculiar";
    }
    epicLabelTest2Label(params) {
        return params.TYPE === "block" ?
            "Your block is BORING!!!!!"
            : "Yes, this function is very cool";
    }

    // util
    _getSoundIndex(soundName, util) {
        // if the sprite has no sounds, return -1
        const len = util.target.sprite.sounds.length;
        if (len === 0) {
            return -1;
        }

        // look up by name first
        const index = this._getSoundIndexByName(soundName, util);
        if (index !== -1) {
            return index;
        }

        // then try using the sound name as a 1-indexed index
        const oneIndexedIndex = parseInt(soundName, 10);
        if (!isNaN(oneIndexedIndex)) {
            return MathUtil.wrapClamp(oneIndexedIndex - 1, 0, len - 1);
        }

        // could not be found as a name or converted to index, return -1
        return -1;
    }


    _getSoundIndexByName(soundName, util) {
        const sounds = util.target.sprite.sounds;
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i].name === soundName) {
                return i;
            }
        }
        // if there is no sound by that name, return -1
        return -1;
    }

    // blocks

    branchNewThread(_, util) {
        // CubesterYT probably
        if (util.thread.target.blocks.getBranch(util.thread.peekStack(), 0)) {
            util.sequencer.runtime._pushThread(
                util.thread.target.blocks.getBranch(util.thread.peekStack(), 0),
                util.target,
                {}
            );
        }
    }

    booleanMonitor() {
        return Math.round(Math.random()) == 1;
    }

    stopSound(args, util) {
        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;

        const soundBank = sprite.soundBank;
        if (!soundBank) return;

        const id = Cast.toString(args.ID);
        soundBank.stop(target, id);
    }
    starttimeSound(args, util) {
        const id = Cast.toString(args.ID);
        const index = this._getSoundIndex(id, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        if (!sprite.sounds) return;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank;
        if (!soundBank) return;

        soundBank.playSound(target, soundId, Cast.toNumber(args.SEX));
    }
    transitionSound(args, util) {
        const id = Cast.toString(args.ID);
        const index = this._getSoundIndex(id, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        if (!sprite.sounds) return;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank;
        if (!soundBank) return;

        soundBank.soundPlayers[soundId].stopFadeDecay = Cast.toNumber(args.SEX);
    }

    green() {
        return 'g';
    }

    logArgs1(args) {
        console.log(args);
        return JSON.stringify(args);
    }
    logArgs2(args) {
        console.log(args);
        return JSON.stringify(args);
    }
    logArgs3(args) {
        console.log(args);
        return JSON.stringify(args);
    }
    logArgs4(args) {
        console.log(args);
        return JSON.stringify(args);
    }

    setEffectName(args, util) {
        const PX = Cast.toNumber(args.VALUE);
        util.target.setEffect(args.EFFECT, PX);
    }
    setBlurEffect(args, util) {
        const PX = Cast.toNumber(args.PX);
        util.target.setEffect("blur", PX);
    }

    doodooBlockLolol(args, util) {
        if (args.INPUT === true) return;
        console.log(args, util);
        util.startBranch(1, false);
        console.log(util.target.getCurrentCostume());
    }

    ifFalse(args, util) {
        console.log(args, util);
        if (!args.INPUT) {
            util.startBranch(1, false);
        }
    }
    ifFalseReturned(args) {
        if (!args.INPUT) {
            return 1;
        }
    }
    turbrowaorploop ({TIMES}, util) {
        const times = Math.round(Cast.toNumber(TIMES));
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = times;
        }
        util.stackFrame.loopCounter--;
        if (util.stackFrame.loopCounter >= 0) {
            return true;
        }
    }
    // compiled blocks should have interpreter versions
    compiledIfNot(args, util) {
        const condition = Cast.toBoolean(args.CONDITION);
        if (!condition) {
            util.startBranch(1, false);
        }
    }
    compiledReturn() {
        return 'noop';
    }
    restartFromTheTop() {
        return 'noop';
    }
    compiledOutput() {
        return '<unavailable without compiler>';
    }

    hiddenBoolean() {
        return true;
    }

    multiplyTest(args, util) {
        const target = util.target;
        Object.getOwnPropertyNames(target.variables).forEach(variableId => {
            const variable = target.variables[variableId];
            if (variable.name !== Cast.toString(args.VAR)) return;
            console.log(variable);
            if (typeof variable.value !== 'number') {
                variable.value = 0;
            }
            variable.value *= Cast.toNumber(args.MULT);
        });
    }

    whatthescallop(args) {
        return JSON.stringify(args);
    }

    squareReporter() {
        return 0;
    }
    alignmentTestate() {
        return;
    }
    givesAnError() {
        throw new Error('woah an error');
    }

    noop() {
        // Generic noop
        return;
    }

    duplicato() {
        return 0
    }
    variable(args) { return args.var; }
    theheheuoihew9h9(args) { console.log(args); }
    theheheuoihew9h9666(args) { console.log(args); }
    docsScreenshotBlock() {
        return 0
    }
    customShapeOCTAGONAL() {
        return 0
    }
    customShapeBUMPED() {
        return 0
    }
    customShapeINDENTED() {
        return 0
    }
    customShapeSCRAPPED() {
        return 0
    }
    customShapeARROW() {
        return 0
    }
    customShapeTICKET() {
        return 0
    }
    customShapeInputOCTAGONAL() {
        return 0
    }
    customShapeInputBUMPED() {
        return 0
    }
    customShapeInputINDENTED() {
        return 0
    }
    customShapeInputSCRAPPED() {
        return 0
    }
    customShapeInputARROW() {
        return 0
    }
    customShapeInputTICKET() {
        return 0
    }
}

module.exports = JgDevBlocks;
