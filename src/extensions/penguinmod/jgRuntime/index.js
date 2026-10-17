const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');
const Color = require('../../../util/color');

// ShovelUtils
let fps = 0;

/**
 * Class for Runtime blocks
 * @constructor
 */
class JgRuntimeBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // SharkPool
        this.pausedScripts = Object.create(null);

        // ShovelUtils
        // Based on from https://www.growingwiththeweb.com/2017/12/fast-simple-js-fps-counter.html
        const times = [];
        fps = this.runtime.frameLoop.framerate;
        this.runtime.on('RUNTIME_STEP_START', () => {
            const now = performance.now();
            while (times.length > 0 && times[0] <= now - 1000) { times.shift() }
            times.push(now);
            fps = times.length;
        });
        this.runtime.on('PROJECT_STOP_ALL', () => { this.pausedScripts = Object.create(null) });
    }

    _typeIsBitmap(type) {
        return (
            type === 'image/png' || type === 'image/bmp' || type === 'image/jpg' || type === 'image/jpeg' ||
            type === 'image/jfif' || type === 'image/webp' || type === 'image/gif'
        );
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgRuntime',
            name: 'Runtime',
            color: '#777777',
            menuIconURI: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYigxMTksIDExOSwgMTE5KTsgc3Ryb2tlOiByZ2IoOTUsIDk1LCA5NSk7IiBjeD0iMTAiIGN5PSIxMCIgcng9IjkuNSIgcnk9IjkuNSI+PC9lbGxpcHNlPgogIDxwYXRoIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0gOC43MjQgNC41OTcgQyA4LjgyNCA0LjI5NSA5LjEwNiA0LjA5MSA5LjQyNSA0LjA5MSBMIDEwLjU3NSA0LjA5MSBDIDEwLjg5NCA0LjA5MSAxMS4xNzYgNC4yOTUgMTEuMjc2IDQuNTk3IEwgMTEuNzE1IDUuOTEzIEMgMTIuMDYxIDYuMDU4IDEyLjM4NiA2LjI0NyAxMi42ODEgNi40NzIgTCAxNC4wNDEgNi4xOTMgQyAxNC4zNTMgNi4xMjkgMTQuNjcgNi4yNzIgMTQuODI5IDYuNTQ3IEwgMTUuNDA1IDcuNTQ0IEMgMTUuNTY0IDcuODIgMTUuNTI5IDguMTY1IDE1LjMxOCA4LjQwMyBMIDE0LjM5NyA5LjQ0MiBDIDE0LjQyIDkuNjI1IDE0LjQzMSA5LjgxMSAxNC40MzEgMTAgQyAxNC40MzEgMTAuMTg5IDE0LjQyIDEwLjM3NSAxNC4zOTcgMTAuNTU4IEwgMTUuMzE4IDExLjU5NyBDIDE1LjUyOSAxMS44MzUgMTUuNTY0IDEyLjE4MSAxNS40MDUgMTIuNDU2IEwgMTQuODI5IDEzLjQ1MyBDIDE0LjY3IDEzLjcyOCAxNC4zNTMgMTMuODcxIDE0LjA0MSAxMy44MDcgTCAxMi42ODEgMTMuNTI5IEMgMTIuMzg2IDEzLjc1MyAxMi4wNjEgMTMuOTQyIDExLjcxNSAxNC4wODcgTCAxMS4yNzYgMTUuNDAzIEMgMTEuMTc2IDE1LjcwNSAxMC44OTQgMTUuOTA5IDEwLjU3NSAxNS45MDkgTCA5LjQyNSAxNS45MDkgQyA5LjEwNiAxNS45MDkgOC44MjQgMTUuNzA1IDguNzI0IDE1LjQwMyBMIDguMjg1IDE0LjA4NyBDIDcuOTM5IDEzLjk0MiA3LjYxNCAxMy43NTMgNy4zMTkgMTMuNTI5IEwgNS45NTkgMTMuODA3IEMgNS42NDcgMTMuODcxIDUuMzMgMTMuNzI4IDUuMTcxIDEzLjQ1MyBMIDQuNTk1IDEyLjQ1NiBDIDQuNDM2IDEyLjE4MSA0LjQ3MSAxMS44MzUgNC42ODIgMTEuNTk3IEwgNS42MDMgMTAuNTU4IEMgNS41OCAxMC4zNzUgNS41NjkgMTAuMTg5IDUuNTY5IDEwIEMgNS41NjkgOS44MTEgNS41OCA5LjYyNSA1LjYwMyA5LjQ0MiBMIDQuNjgyIDguNDAzIEMgNC40NzEgOC4xNjUgNC40MzYgNy44MiA0LjU5NSA3LjU0NCBMIDUuMTcxIDYuNTQ3IEMgNS4zMyA2LjI3MiA1LjY0NyA2LjEyOSA1Ljk1OSA2LjE5MyBMIDcuMzE5IDYuNDcyIEMgNy42MTQgNi4yNDcgNy45MzkgNi4wNTggOC4yODUgNS45MTMgTCA4LjcyNCA0LjU5NyBaIE0gMTAgOC41MjMgQyA5LjE4NCA4LjUyMyA4LjUyMyA5LjE4NSA4LjUyMyAxMCBDIDguNTIzIDEwLjgxNiA5LjE4NCAxMS40NzcgMTAgMTEuNDc3IEMgMTAuODE2IDExLjQ3NyAxMS40NzcgMTAuODE2IDExLjQ3NyAxMCBDIDExLjQ3NyA5LjE4NSAxMC44MTYgOC41MjMgMTAgOC41MjMgWiIgZmlsbD0id2hpdGUiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ij48L3BhdGg+Cjwvc3ZnPg==',
            blocks: [
                {
                    opcode: 'addSpriteUrl',
                    text: 'add sprite from [URL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: `https://corsproxy.io/?${encodeURIComponent('https://penguinmod.com/Sprite1.pms')}`
                        }
                    },
                },
                {
                    opcode: 'addCostumeUrl',
                    text: 'add costume [name] from [URL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: `https://corsproxy.io/?${encodeURIComponent('https://penguinmod.com/navicon.png')}`
                        },
                        name: {
                            type: ArgumentType.STRING,
                            defaultValue: 'penguinmod'
                        }
                    },
                },
                {
                    opcode: 'addCostumeUrlForceMime',
                    text: 'add [costtype] costume [name] from [URL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        costtype: {
                            type: ArgumentType.STRING,
                            menu: "costumeMimeType"
                        },
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: `https://corsproxy.io/?${encodeURIComponent('https://penguinmod.com/navicon.png')}`
                        },
                        name: {
                            type: ArgumentType.STRING,
                            defaultValue: 'penguinmod'
                        }
                    },
                },
                {
                    opcode: 'addSoundUrl',
                    text: 'add sound [NAME] from [URL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://extensions.turbowarp.org/meow.mp3'
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Meow'
                        }
                    },
                },
                {
                    opcode: 'loadProjectDataUrl',
                    text: 'load project from [URL]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: ''
                        }
                    },
                },
                {
                    opcode: 'getIndexOfCostume',
                    text: 'get costume index of [costume]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        costume: {
                            type: ArgumentType.STRING,
                            defaultValue: "costume1"
                        }
                    },
                },
                {
                    opcode: 'getIndexOfSound',
                    text: 'get sound index of [NAME]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "Pop"
                        }
                    },
                },
                {
                    opcode: 'getProjectDataUrl',
                    text: 'get data url of project',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                '---',
                {
                    opcode: 'setStageSize',
                    text: 'set stage width: [WIDTH] height: [HEIGHT]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 480
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 360
                        }
                    }
                },
                {
                    opcode: 'getStageWidth',
                    text: 'stage width',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getStageHeight',
                    text: 'stage height',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                '---',
                {
                    opcode: 'updateRuntimeConfig',
                    text: 'set [OPTION] to [ENABLED]',
                    disableMonitor: false,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            menu: 'runtimeConfig'
                        },
                        ENABLED: {
                            menu: 'onoff'
                        }
                    }
                },
                {
                    opcode: 'changeRenderingCapping',
                    text: 'change render setting [OPTION] to [CAPPED]',
                    disableMonitor: false,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            menu: 'renderConfigCappable'
                        },
                        CAPPED: {
                            menu: 'cappableSettings'
                        }
                    }
                },
                {
                    opcode: 'setRenderingNumber',
                    text: 'set render setting [OPTION] to [NUM]',
                    disableMonitor: false,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            menu: 'renderConfigNumber'
                        },
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'runtimeConfigEnabled',
                    text: '[OPTION] enabled?',
                    disableMonitor: false,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        OPTION: {
                            menu: 'runtimeConfig'
                        }
                    }
                },
                {
                    opcode: 'turboModeEnabled',
                    text: 'turbo mode enabled?',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockType: BlockType.BOOLEAN
                },
                '---',
                {
                    opcode: 'setMaxClones',
                    text: 'set max clones to [MAX]',
                    disableMonitor: false,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        MAX: {
                            menu: 'cloneLimit',
                            defaultValue: 300
                        }
                    }
                },
                {
                    opcode: 'maxAmountOfClones',
                    text: 'max clone count',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'amountOfClones',
                    text: 'clone count',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getIsClone',
                    text: 'is clone?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                },
                '---',
                {
                    opcode: 'setMaxFrameRate',
                    text: 'set max framerate to: [FRAMERATE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        FRAMERATE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 30
                        }
                    },
                },
                {
                    opcode: 'getMaxFrameRate',
                    text: 'max framerate',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getFrameRate',
                    text: 'framerate',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                '---',
                {
                    opcode: 'setBackgroundColor',
                    text: 'set stage background color to [COLOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    }
                },
                {
                    opcode: 'getBackgroundColor',
                    text: 'stage background color',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER
                },
                "---",
                {
                    opcode: "pauseScript",
                    blockType: BlockType.COMMAND,
                    text: "pause this script using name: [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "my script",
                        },
                    },
                },
                {
                    opcode: "unpauseScript",
                    blockType: BlockType.COMMAND,
                    text: "unpause script named: [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "my script",
                        },
                    },
                },
                {
                    opcode: "isScriptPaused",
                    blockType: BlockType.BOOLEAN,
                    text: "is script named [NAME] paused?",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "my script",
                        },
                    }
                },
                "---",
                {
                    opcode: 'variables_createVariable',
                    text: 'create variable named [NAME] for [SCOPE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "my variable" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableScope" }
                    },
                },
                {
                    opcode: 'variables_createCloudVariable',
                    text: 'create cloud variable named [NAME]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "cloud variable" },
                    },
                },
                {
                    opcode: 'variables_createList',
                    text: 'create list named [NAME] for [SCOPE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "list" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableScope" }
                    },
                },
                {
                    opcode: 'variables_getVariable',
                    text: 'get value of variable named [NAME] in [SCOPE]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "my variable" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableTypes" }
                    },
                },
                {
                    opcode: 'variables_getList',
                    text: 'get array of list named [NAME] in [SCOPE]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "list" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableScope" }
                    },
                },
                {
                    opcode: 'variables_existsVariable',
                    text: 'variable named [NAME] exists in [SCOPE]?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "my variable" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableTypes" }
                    },
                },
                {
                    opcode: 'variables_existsList',
                    text: 'list named [NAME] exists in [SCOPE]?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "list" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableScope" }
                    },

                },
                "---",
                {
                    opcode: 'getDataOption',
                    text: 'get binary data of [OPTION] named [NAME]',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: "objectType"
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "Sprite1"
                        }
                    },
                },
                {
                    opcode: 'getDataUriOption',
                    text: 'get data uri of [OPTION] named [NAME]',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: "objectType"
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "Sprite1"
                        }
                    },
                },
                "---",
                {
                    opcode: 'getAllSprites',
                    text: 'get all sprites',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getAllCostumes',
                    text: 'get all costumes',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getAllSounds',
                    text: 'get all sounds',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                {
                    opcode: 'getAllFonts',
                    text: 'get all fonts',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                },
                "---",
                {
                    opcode: 'getAllVariables',
                    text: 'get all variables [ALLSCOPE]',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ALLSCOPE: {
                            type: ArgumentType.STRING,
                            menu: "allVariableType"
                        }
                    },
                },
                {
                    opcode: 'getAllLists',
                    text: 'get all lists [ALLSCOPE]',
                    disableMonitor: false,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ALLSCOPE: {
                            type: ArgumentType.STRING,
                            menu: "allVariableScope"
                        }
                    },
                },
                "---",
                {
                    blockType: BlockType.LABEL,
                    text: "Potentially Dangerous"
                },
                {
                    opcode: 'deleteCostume',
                    text: 'delete costume at index [COSTUME]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        COSTUME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                },
                {
                    opcode: 'deleteSound',
                    text: 'delete sound at index [SOUND]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        SOUND: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                },
                "---",
                {
                    opcode: 'variables_deleteVariable',
                    text: 'delete variable named [NAME] in [SCOPE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "my variable" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableTypes" }
                    },
                },
                {
                    opcode: 'variables_deleteList',
                    text: 'delete list named [NAME] in [SCOPE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "list" },
                        SCOPE: { type: ArgumentType.STRING, menu: "variableScope" }
                    },
                },
                "---",
                {
                    opcode: 'deleteSprite',
                    text: 'delete sprite named [NAME]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "Sprite1"
                        }
                    },
                },
            ],
            menus: {
                objectType: {
                    acceptReporters: true,
                    items: [
                        "sprite", "costume", "sound"
                    ].map(item => ({ text: item, value: item }))
                },
                variableScope: {
                    acceptReporters: true,
                    items: [
                        "all sprites", "this sprite"
                    ].map(item => ({ text: item, value: item }))
                },
                allVariableScope: {
                    acceptReporters: true,
                    items: [
                        "for all sprites", "in every sprite", "in this sprite"
                    ].map(item => ({ text: item, value: item }))
                },
                allVariableType: {
                    acceptReporters: true,
                    items: [
                        "for all sprites", "in every sprite",
                        "in this sprite", "in the cloud"
                    ].map(item => ({ text: item, value: item }))
                },
                variableTypes: {
                    acceptReporters: true,
                    items: [
                        "all sprites", "this sprite", "cloud"
                    ].map(item => ({ text: item, value: item }))
                },
                cloneLimit: {
                    items: [
                        '100', '128', '300', '500',
                        '1000', '1024', '5000',
                        '10000', '16384', 'Infinity'
                    ],
                    isTypeable: true,
                    isNumeric: true
                },
                runtimeConfig: {
                    acceptReporters: true,
                    items: [
                        "turbo mode",
                        "high quality pen",
                        "offscreen sprites",
                        "remove miscellaneous limits",
                        "disable offscreen rendering",
                        "disable direction clamping",
                        "interpolation",
                        "warp timer"
                    ]
                },
                renderConfigCappable: {
                    acceptReporters: true,
                    items: ["animated text resolution"]
                },
                renderConfigNumber: {
                    acceptReporters: true,
                    items: ["animated text resolution"]
                },
                onoff: ["on", "off"],
                costumeMimeType: ["png", "bmp", "jpg", "jpeg", "jfif", "webp", "gif", "vector"],
                cappableSettings: ["uncapped", "capped", "fixed"]
            }
        };
    }
    // utils
    _generateScratchId() {
        const soup = "!#%()*+,-./:;=?@[]^_`{|}~ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const id = [];
        for (let i = 0; i < 20; i++) { id[i] = soup.charAt(Math.random() * soup.length) }
        return id.join("");
    }

    // blocks
    addCostumeUrl(args, util) {
        const targetId = util.target.id;
        return new Promise(resolve => {
            fetch(args.URL, { method: 'GET' }).then(x => x.blob().then(blob => {
                const costumeHasForcedMime = !!args.costtype;
                const costumeForcedMimeBitmap = args.costtype !== "vector";
                if (!(
                    (this._typeIsBitmap(blob.type)) || (blob.type === 'image/svg+xml')
                ) && !costumeHasForcedMime) {
                    resolve();
                    throw new Error(`Invalid mime type: "${blob.type}"`);
                }
                const assetType = (costumeHasForcedMime ? costumeForcedMimeBitmap : this._typeIsBitmap(blob.type)) ? this.runtime.storage.AssetType.ImageBitmap : this.runtime.storage.AssetType.ImageVector;
                const dataType = costumeHasForcedMime ? (costumeForcedMimeBitmap ? args.costtype : 'svg') : (blob.type === 'image/svg+xml' ? 'svg' : blob.type.split('/')[1]);
                blob.arrayBuffer().then(buffer => {
                    const data = costumeHasForcedMime ? (!costumeForcedMimeBitmap ? buffer : new Uint8Array(buffer)) : (dataType === 'image/svg+xml'
                        ? buffer : new Uint8Array(buffer));
                    const asset = this.runtime.storage.createAsset(assetType, dataType, data, null, true);
                    const name = `${asset.assetId}.${asset.dataFormat}`;
                    const spriteJson = { asset: asset, md5ext: name, name: args.name };
                    const request = vm.addCostume(name, spriteJson, targetId);
                    if (request.then) request.then(resolve);
                    else resolve();
                })
                .catch(err => {
                    console.error(`Failed to Load Costume: ${err}`);
                    resolve();
                });
            }));
        });
    }
    addCostumeUrlForceMime(args, util) {
        this.addCostumeUrl(args, util);
    }
    deleteCostume(args, util) {
        const index = Math.round(Cast.toNumber(args.COSTUME)) - 1;
        if (index < 0) return;
        util.target.deleteCostume(index);
    }
    deleteSound(args, util) {
        const index = Math.round(Cast.toNumber(args.SOUND)) - 1;
        if (index < 0) return;
        util.target.deleteSound(index);
    }
    getIndexOfCostume(args, util) { return util.target.getCostumeIndexByName(args.costume) + 1 }
    getIndexOfSound(args, util) {
        let index = 0;
        const sounds = util.target.getSounds();
        for (let i = 0; i < sounds.length; i++) {
            if (sounds[i].name === args.NAME) index = i + 1;
        }
        return index;
    }
    setStageSize(args) {
        if (vm) vm.setStageSize(
            Math.max(1, Cast.toNumber(args.WIDTH)), Math.max(1, Cast.toNumber(args.HEIGHT))
        );
    }
    turboModeEnabled() { return this.runtime.turboMode }
    amountOfClones() { return this.runtime._cloneCounter }
    getStageWidth() { return this.runtime.stageWidth }
    getStageHeight() { return this.runtime.stageHeight }
    getMaxFrameRate() { return this.runtime.frameLoop.framerate }
    getIsClone(_, util) { return !(util.target.isOriginal) }

    changeRenderingCapping(args) {
        const option = Cast.toString(args.OPTION).toLowerCase();
        const capping = Cast.toString(args.CAPPED).toLowerCase();
        switch (option) {
            case "animated text resolution": {
                this.runtime.renderer.customRenderConfig.textCostumeResolution.fixed = false;
                this.runtime.renderer.customRenderConfig.textCostumeResolution.capped = false;
                if (capping === "fixed") this.runtime.renderer.customRenderConfig.textCostumeResolution.fixed = true;
                else if (capping === "capped") this.runtime.renderer.customRenderConfig.textCostumeResolution.capped = true;
                break;
            }
        }
        this.runtime.renderer.dirty = true;
        this.runtime.requestRedraw();
    }
    setRenderingNumber(args) {
        const option = Cast.toString(args.OPTION).toLowerCase();
        const number = Cast.toNumber(args.NUM);
        switch (option) {
            case "animated text resolution": {
                this.runtime.renderer.customRenderConfig.textCostumeResolution.value = number;
                break;
            }
            case "max texture scale for new svg images": {
                this.runtime.renderer.setMaxTextureDimension(number);
                break;
            }
        }
        this.runtime.renderer.dirty = true;
        this.runtime.requestRedraw();
    }

    updateRuntimeConfig(args) {
        const enabled = Cast.toString(args.ENABLED).toLowerCase() === 'on';
        switch (Cast.toString(args.OPTION).toLowerCase()) {
        case 'turbo mode': return vm.setTurboMode(enabled);
        case "high quality pen": return this.runtime.renderer.setUseHighQualityRender(enabled);
        case "offscreen sprites": return this.runtime.setRuntimeOptions({ fencing: !enabled });
        case "remove miscellaneous limits": return this.runtime.setRuntimeOptions({ miscLimits: !enabled });
        case "disable offscreen rendering": return this.runtime.setRuntimeOptions({ disableOffscreenRendering: enabled });
        case "disable direction clamping": return this.runtime.setRuntimeOptions({ disableDirectionClamping: enabled });
        case "interpolation": return vm.setInterpolation(enabled);
        case "warp timer": return this.runtime.setCompilerOptions({ warpTimer: enabled });
        }
    }
    runtimeConfigEnabled(args) {
        switch (Cast.toString(args.OPTION).toLowerCase()) {
        case 'turbo mode': return this.runtime.turboMode;
        case "high quality pen": return this.runtime.renderer.useHighQualityRender;
        case "offscreen sprites": return !this.runtime.runtimeOptions.fencing;
        case "remove miscellaneous limits": return !this.runtime.runtimeOptions.miscLimits;
        case "disable offscreen rendering": return this.runtime.runtimeOptions.disableOffscreenRendering;
        case "disable direction clamping": return this.runtime.runtimeOptions.disableDirectionClamping;
        case "interpolation": return this.runtime.interpolationEnabled;
        case "warp timer": return this.runtime.compilerOptions.warpTimer;
        default: return false;
        }
    }
    setMaxClones(args) {
        const limit = Math.round(Cast.toNumber(args.MAX));
        this.runtime.vm.setRuntimeOptions({ maxClones: limit });
    }
    maxAmountOfClones() { return this.runtime.runtimeOptions.maxClones }
    setBackgroundColor(args) {
        let RGB;
        if (typeof args.COLOR === "number") {
            RGB = Cast.toRgbColorObject(args.COLOR);
            this.runtime.renderer.setBackgroundColor(RGB.r / 255, RGB.g / 255, RGB.b / 255);
        } else {
            RGB = Cast.toString(args.COLOR);
            RGB = RGB.startsWith("#") ? RGB.slice(1) : RGB;
            this.runtime.renderer.setBackgroundColor(
                parseInt(RGB.slice(0, 2), 16) / 255,
                parseInt(RGB.slice(2, 4), 16) / 255,
                parseInt(RGB.slice(4, 6), 16) / 255,
                RGB.length === 8 ? parseInt(RGB.slice(6, 8), 16) / 255 : 1
            )
        }
    }
    getBackgroundColor() {
        const colorArray = this.runtime.renderer._backgroundColor3b;
        const colorObject = {
            r: Math.round(Cast.toNumber(colorArray[0])),
            g: Math.round(Cast.toNumber(colorArray[1])),
            b: Math.round(Cast.toNumber(colorArray[2]))
        };
        const hex = Color.rgbToHex(colorObject);
        return hex;
    }

    // SharkPool, edited by JeremyGamer13
    pauseScript(args, util) {
        const scriptName = Cast.toString(args.NAME);
        const state = util.stackFrame.pausedScript;
        if (!state) {
            this.pausedScripts[scriptName] = true;
            util.stackFrame.pausedScript = scriptName;
            util.yield();
        } else if (state in this.pausedScripts) {
            util.yield();
        }
    }
    unpauseScript(args) {
        const scriptName = Cast.toString(args.NAME);
        if (scriptName in this.pausedScripts) {
            delete this.pausedScripts[scriptName];
        }
    }
    isScriptPaused(args) {
        const scriptName = Cast.toString(args.NAME);
        return scriptName in this.pausedScripts;
    }

    setMaxFrameRate(args) {
        let frameRate = Cast.toNumber(args.FRAMERATE);
        this.runtime.setFramerate(frameRate);
    }
    deleteSprite(args) {
        const target = this.runtime.getSpriteTargetByName(args.NAME);
        if (!target) return;
        vm.deleteSpriteInternal(target.id);
    }

    getDataOption(args, util) {
        switch (args.OPTION) {
            case "sprite": {
                const sprites = this.runtime.targets.filter(target => target.isOriginal);
                const sprite = sprites.filter(sprite => sprite.sprite.name === args.NAME)[0];
                if (!sprite) return "[]";
                return new Promise(resolve => {
                    vm.exportSprite(sprite.id).then(blob => {
                        blob.arrayBuffer().then(arrayBuffer => {
                            const array = Array.from(new Uint8Array(arrayBuffer));
                            const stringified = JSON.stringify(array);
                            resolve(stringified);
                        }).catch(() => resolve("[]"));
                    }).catch(() => resolve("[]"));
                });
            }
            case "costume": {
                const costumes = util.target.getCostumes();
                const index = util.target.getCostumeIndexByName(args.NAME);
                if (!costumes[index]) return "[]";
                const costume = costumes[index];
                const data = costume.asset.data;
                const array = Array.from(new Uint8Array(data.buffer));
                return JSON.stringify(array);
            }
            case "sound": {
                const sounds = util.target.getSounds();
                const index = this.getIndexOfSound(args, util) - 1;
                if (!sounds[index]) return "[]";
                const sound = sounds[index];
                const data = sound.asset.data;
                const array = Array.from(new Uint8Array(data.buffer));
                return JSON.stringify(array);
            }
            default: return "[]";
        }
    }
    getDataUriOption(args, util) {
        switch (args.OPTION) {
            case "sprite": {
                const sprites = this.runtime.targets.filter(target => target.isOriginal);
                const sprite = sprites.filter(sprite => sprite.sprite.name === args.NAME)[0];
                if (!sprite) return "";
                return new Promise(resolve => {
                    vm.exportSprite(sprite.id).then(blob => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => resolve("");
                        reader.onabort = () => resolve("");
                        reader.readAsDataURL(blob);
                    }).catch(() => resolve(""));
                });
            }
            case "costume": {
                const costumes = util.target.getCostumes();
                const index = util.target.getCostumeIndexByName(args.NAME);
                if (!costumes[index]) return "";
                const costume = costumes[index];
                return costume.asset.encodeDataURI();
            }
            case "sound": {
                const sounds = util.target.getSounds();
                const index = this.getIndexOfSound(args, util) - 1;
                if (!sounds[index]) return "";
                const sound = sounds[index];
                return sound.asset.encodeDataURI();
            }
            default: return "";
        }
    }
    getAllSprites() {
        return JSON.stringify(this.runtime.targets.filter(target => target.isOriginal && !target.isStage).map(target => target.sprite.name));
    }
    getAllCostumes(_, util) {
        const costumes = util.target.getCostumes();
        return JSON.stringify(costumes.map(costume => costume.name));
    }
    getAllSounds(_, util) {
        const sounds = util.target.getSounds();
        return JSON.stringify(sounds.map(sound => sound.name));
    }
    getAllFonts() {
        const fonts = this.runtime.fontManager.getFonts();
        return JSON.stringify(fonts.map(font => font.name));
    }

    loadProjectDataUrl(args) {
        const url = Cast.toString(args.URL);
        if (typeof ScratchBlocks !== "undefined") {
            // We are in the editor. Ask before loading a new project to avoid unrecoverable data loss.
            if (!confirm(`Runtime Extension - Editor: Are you sure you want to load a new project?\nEverything in the current project will be permanently deleted.`)) {
                return;
            }
        }
        fetch(url)
            .then((r) => r.arrayBuffer())
            .then((buffer) => vm.loadProject(buffer))
            .then(() => {
                vm.greenFlag();
            })
            .catch((error) => {
                console.log("Error loading custom project;", error);
                throw "Error loading custom project";
            });
    }
    getProjectDataUrl() {
        return new Promise((resolve) => {
            const failingUrl = 'data:application/octet-stream;base64,';
            vm.saveProjectSb3().then(blob => {
                const fileReader = new FileReader();
                fileReader.onload = () => { resolve(fileReader.result); };
                fileReader.onerror = () => { resolve(failingUrl) }
                fileReader.readAsDataURL(blob);
            }).catch(() => { resolve(failingUrl) });
        });
    }

    getAllVariables(args, util) {
        switch (args.ALLSCOPE) {
            case "for all sprites": {
                const stage = this.runtime.getTargetForStage();
                if (!stage) return "[]";
                const variables = stage.variables;
                if (!variables) return "[]";
                return JSON.stringify(Object.values(variables).filter(v => v.type !== "list").map(v => v.name));
            }
            case "in every sprite": {
                const targets = this.runtime.targets;
                if (!targets) return "[]";
                const variables = targets.filter(t => t.isOriginal).map(t => t.variables);
                if (!variables) return "[]";
                return JSON.stringify(variables.map(v => Object.values(v)).map(v => v.filter(v => v.type !== "list").map(v => v.name)).flat(1));
            }
            case "in this sprite": {
                const target = util.target;
                if (!target) return "[]";
                const variables = target.variables;
                if (!variables) return "[]";
                return JSON.stringify(Object.values(variables).filter(v => v.type !== "list").map(v => v.name));
            }
            case "in the cloud": {
                const stage = this.runtime.getTargetForStage();
                if (!stage) return "[]";
                const variables = stage.variables;
                if (!variables) return "[]";
                return JSON.stringify(Object.values(variables).filter(v => v.type !== "list").filter(v => v.isCloud === true).map(v => v.name));
            }
            default: return "[]";
        }
    }
    getAllLists(args, util) {
        switch (args.ALLSCOPE) {
            case "for all sprites": {
                const stage = this.runtime.getTargetForStage();
                if (!stage) return "[]";
                const variables = stage.variables;
                if (!variables) return "[]";
                return JSON.stringify(Object.values(variables).filter(v => v.type === "list").map(v => v.name));
            }
            case "in every sprite": {
                const targets = this.runtime.targets;
                if (!targets) return "[]";
                const variables = targets.filter(t => t.isOriginal).map(t => t.variables);
                if (!variables) return "[]";
                return JSON.stringify(variables.map(v => Object.values(v)).map(v => v.filter(v => v.type === "list").map(v => v.name)).flat(1));
            }
            case "in this sprite": {
                const target = util.target;
                if (!target) return "[]";
                const variables = target.variables;
                if (!variables) return "[]";
                return JSON.stringify(Object.values(variables).filter(v => v.type === "list").map(v => v.name));
            }
            default: return "[]";
        }
    }

    // ShovelUtils
    getFrameRate() { return fps }
    addSoundUrl(args, util) {
        const targetId = util.target.id;
        return new Promise((resolve) => {
            fetch(args.URL)
                .then((r) => r.arrayBuffer())
                .then((arrayBuffer) => {
                    const storage = this.runtime.storage;
                    const asset = new storage.Asset(
                        storage.AssetType.Sound, null, storage.DataFormat.MP3,
                        new Uint8Array(arrayBuffer), true
                    );
                    resolve(vm.addSound({
                        md5: asset.assetId + '.' + asset.dataFormat,
                        asset: asset, name: args.NAME
                    }, targetId));
                }).catch(resolve);
        })
    }

    // GameUtils
    addSpriteUrl(args) {
        return new Promise((resolve) => {
            fetch(args.URL).then(response => {
                response.arrayBuffer().then(arrayBuffer => {
                    vm.addSprite(arrayBuffer).finally(resolve);
                }).catch(resolve);
            }).catch(resolve);
        });
    }

    // variables
    variables_createVariable(args, util) {
        const variableName = args.NAME;
        switch (args.SCOPE) {
            case "all sprites": return this.runtime.createNewGlobalVariable(variableName);
            case "this sprite": return util.target.createVariable(this._generateScratchId(), variableName, "");
        }
    }
    variables_createCloudVariable(args) {
        const variableName = `☁ ${args.NAME}`;
        const stage = this.runtime.getTargetForStage();
        if (!stage) return;
        const id = this._generateScratchId();
        stage.createVariable(id, variableName, "", true);
    }
    variables_createList(args, util) {
        const variableName = args.NAME;
        switch (args.SCOPE) {
            case "all sprites": return this.runtime.createNewGlobalVariable(variableName, null, "list");
            case "this sprite": return util.target.createVariable(this._generateScratchId(), variableName, "list");
        }
    }
    variables_getVariable(args, util) {
        const variableName = args.NAME;
        let target;
        let isCloud = false;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else if (args.SCOPE === "cloud") {
            target = this.runtime.getTargetForStage();
            isCloud = true;
        } else return "";
        const variables = Object.values(target.variables).filter(variable => variable.type !== "list").filter(variable => {
            if (variable.isCloud) return String(variable.name).replace("☁ ", "") === variableName;
            if (isCloud) return false; // above check should have already told us its a cloud variable
            return variable.name === variableName;
        });
        if (!variables) return "";
        const variable = variables[0];
        if (!variable) return "";
        return variable.value;
    }
    variables_getList(args, util) {
        const variableName = args.NAME;
        let target;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else return "[]";
        const variables = Object.values(target.variables).filter(v => v.type === "list").filter(v => v.name === variableName);
        if (!variables) return "[]";
        const variable = variables[0];
        if (!variable) return "[]";
        return JSON.stringify(variable.value);
    }
    variables_deleteVariable(args, util) {
        const variableName = args.NAME;
        let target, isCloud = false;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else if (args.SCOPE === "cloud") {
            target = this.runtime.getTargetForStage();
            isCloud = true;
        } else return;
        const variables = Object.values(target.variables).filter(v => v.type !== "list").filter(variable => {
            if (variable.isCloud) return String(variable.name).replace("☁ ", "") === variableName;
            if (isCloud) return false; // above check should have already told us its a cloud variable
            return variable.name === variableName;
        });
        if (!variables) return;
        const variable = variables[0];
        if (!variable) return;
        return target.deleteVariable(variable.id);
    }
    variables_deleteList(args, util) {
        const variableName = args.NAME;
        let target;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else return;
        const variables = Object.values(target.variables).filter(v => v.type === "list").filter(v => v.name === variableName);
        if (!variables) return;
        const variable = variables[0];
        if (!variable) return;
        return target.deleteVariable(variable.id);
    }
    variables_existsVariable(args, util) {
        const variableName = args.NAME;
        let target, isCloud = false;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else if (args.SCOPE === "cloud") {
            target = this.runtime.getTargetForStage();
            isCloud = true;
        } else return false;
        const variables = Object.values(target.variables).filter(v => v.type !== "list").filter(variable => {
            if (variable.isCloud) return String(variable.name).replace("☁ ", "") === variableName;
            if (isCloud) return false; // above check should have already told us its a cloud variable
            return variable.name === variableName;
        });
        if (!variables) return false;
        const variable = variables[0];
        if (!variable) return false;
        return true;
    }
    variables_existsList(args, util) {
        const variableName = args.NAME;
        let target;
        if (args.SCOPE === "all sprites") target = this.runtime.getTargetForStage();
        else if (args.SCOPE === "this sprite") target = util.target;
        else return false;
        const variables = Object.values(target.variables).filter(v => v.type === "list").filter(v => v.name === variableName);
        if (!variables) return false;
        const variable = variables[0];
        if (!variable) return false;
        return true;
    }
}

module.exports = JgRuntimeBlocks;
