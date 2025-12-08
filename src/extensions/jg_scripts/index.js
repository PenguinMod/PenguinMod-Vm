const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

class JgScriptsBlocks {
  /**
   * Class for Script blocks
   * @constructor
   */
  constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     * @type {Runtime}
     */
    this.runtime = runtime;
    this.scripts = {};

    this.runtime.on("PROJECT_START", () => { this.scripts = {} });
    this.runtime.on("PROJECT_STOP_ALL", () => { this.scripts = {} });
  }
  /**
   * @returns {object} metadata for this extension and its blocks.
  */
  getInfo() {
    return {
      id: "jgScripts",
      name: "Scripts",
      color1: "#8c8c8c",
      color2: "#7a7a7a",
      blocks: [
        {
          opcode: "createScript",
          blockType: BlockType.COMMAND,
          text: "create script named [NAME]",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "deleteScript",
          blockType: BlockType.COMMAND,
          text: "delete script named [NAME]",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "deleteAll",
          blockType: BlockType.COMMAND,
          text: "delete all scripts"
        },
        {
          opcode: "allScripts",
          blockType: BlockType.REPORTER,
          text: "all scripts"
        },
        {
          opcode: "scriptExists",
          blockType: BlockType.BOOLEAN,
          text: "script named [NAME] exists?",
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        "---",
        {
          opcode: "addBlocksTo",
          blockType: BlockType.COMMAND,
          text: ["add blocks", "to script [NAME]"],
          branchCount: 1,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" }
          },
        },
        {
          opcode: "JGreturn",
          text: "return [THING]",
          blockType: BlockType.COMMAND,
          isTerminal: true,
          arguments: {
            THING: { type: ArgumentType.STRING, defaultValue: "1" }
          },
        },
        "---",
        {
          opcode: "scriptData",
          text: "script data",
          blockType: BlockType.REPORTER,
          allowDropAnywhere: true,
          disableMonitor: true
        },
        "---",
        {
          opcode: "runBlocks",
          text: "run script [NAME] in [SPRITE]",
          blockType: BlockType.CONDITIONAL,
          branchCount: -1,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" }
          },
        },
        {
          opcode: "runBlocksData",
          text: "run script [NAME] in [SPRITE] with data [DATA]",
          blockType: BlockType.CONDITIONAL,
          branchCount: -1,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" },
            DATA: { type: ArgumentType.STRING, defaultValue: "data" }
          },
        },
        "---",
        {
          opcode: "reportBlocks",
          text: "run script [NAME] in [SPRITE]",
          blockType: BlockType.REPORTER,
          allowDropAnywhere: true,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" }
          },
        },
        {
          opcode: "reportBlocksData",
          text: "run script [NAME] in [SPRITE] with data [DATA]",
          blockType: BlockType.REPORTER,
          allowDropAnywhere: true,
          arguments: {
            NAME: { type: ArgumentType.STRING, defaultValue: "Script1" },
            SPRITE: { type: ArgumentType.STRING, menu: "TARGETS" },
            DATA: { type: ArgumentType.STRING, defaultValue: "data" }
          },
        }
      ],
      menus: {
        TARGETS: { acceptReporters: true, items: "getTargets" }
      },
    };
  }

  getTargets() {
    const spriteNames = [
      { text: "myself", value: "_myself_" },
      { text: "Stage", value: "_stage_" }
    ];
    const targets = this.runtime.targets;
    for (let index = 1; index < targets.length; index++) {
      const target = targets[index];
      if (target.isOriginal) spriteNames.push({
        text: target.getName(), value: target.getName()
      });
    }
    return spriteNames.length > 0 ? spriteNames : [""];
  }

  createScript(args) { this.scripts[Cast.toString(args.NAME)] = { blocks: [] } }

  deleteScript(args) { delete this.scripts[Cast.toString(args.NAME)] }

  deleteAll() { this.scripts = {} }

  allScripts() { return JSON.stringify(Object.keys(this.scripts)) }

  scriptExists(args) { return Cast.toBoolean(this.scripts[args.NAME]) }

  addBlocksTo(args, util) {
    const name = Cast.toString(args.NAME);
    const branch = util.thread.target.blocks.getBranch(util.thread.peekStack(), 1);
    if (branch && this.scripts[name] !== undefined) {
      this.scripts[name].blocks.push({ stack : branch, target : util.target });
    }
  }

  JGreturn(args, util) { util.thread.report = Cast.toString(args.THING) }

  scriptData(args, util) {
    const data = util.thread.scriptData;
    return data ? data : "";
  }

  runBlocksData(args, util) { this.runBlocks(args, util) }
  runBlocks(args, util) {
    const target = args.SPRITE === "_myself_" ? util.target :
      args.SPRITE === "_stage_" ? this.runtime.getTargetForStage() : this.runtime.getSpriteTargetByName(args.SPRITE);
    const name = Cast.toString(args.NAME);
    const data = args.DATA ? Cast.toString(args.DATA) : "";
    if (this.scripts[name] === undefined || !target) return;

    if (util.stackFrame.JGindex === undefined) util.stackFrame.JGindex = 0;
    if (util.stackFrame.JGthread === undefined) util.stackFrame.JGthread = "";
    const blocks = this.scripts[name].blocks;
    const index = util.stackFrame.JGindex;
    const thread = util.stackFrame.JGthread;
    if (!thread && index < blocks.length) {
      const thisStack = blocks[index];
      if (thisStack.target.blocks.getBlock(thisStack.stack) !== undefined) {
        util.stackFrame.JGthread = this.runtime._pushThread(
            thisStack.stack,
            thisStack.target, {
                stackClick: false,
                parentThread: util.thread,
            });
        util.stackFrame.JGthread.scriptData = data;
        util.stackFrame.JGthread.target = target;
        util.stackFrame.JGthread.tryCompile(); // update thread
      }
      util.stackFrame.JGindex = util.stackFrame.JGindex + 1;
    }

    if (util.stackFrame.JGthread && this.runtime.isActiveThread(util.stackFrame.JGthread)) util.startBranch(1, true);
    else util.stackFrame.JGthread = "";
    if (util.stackFrame.JGindex < blocks.length) util.startBranch(1, true);
  }

  reportBlocksData(args, util) { return this.reportBlocks(args, util) || "" }
  reportBlocks(args, util) {
    const target = args.SPRITE === "_myself_" ? util.target :
      args.SPRITE === "_stage_" ? this.runtime.getTargetForStage() : this.runtime.getSpriteTargetByName(args.SPRITE);
    const name = Cast.toString(args.NAME);
    const data = args.DATA ? Cast.toString(args.DATA) : "";
    if (this.scripts[name] === undefined || !target) return;

    if (util.stackFrame.JGindex === undefined) util.stackFrame.JGindex = 0;
    if (util.stackFrame.JGthread === undefined) util.stackFrame.JGthread = "";
    const blocks = this.scripts[name].blocks;
    const index = util.stackFrame.JGindex;
    const thread = util.stackFrame.JGthread;
    if (!thread && index < blocks.length) {
      const thisStack = blocks[index];
      if (thisStack.target.blocks.getBlock(thisStack.stack) !== undefined) {
        util.stackFrame.JGthread = this.runtime._pushThread(
            thisStack.stack,
            thisStack.target,
            {
                stackClick: false,
                parentThread: util.thread,
            });
        util.stackFrame.JGthread.scriptData = data;
        util.stackFrame.JGthread.target = target;
        util.stackFrame.JGthread.tryCompile(); // update thread
      }
      util.stackFrame.JGindex = util.stackFrame.JGindex + 1;
    }

    if (util.stackFrame.JGthread && this.runtime.isActiveThread(util.stackFrame.JGthread)) util.yield();
    else {
      if (util.stackFrame.JGthread.report !== undefined) {
        util.stackFrame.JGreport = util.stackFrame.JGthread.report;
        util.stackFrame.JGindex = blocks.length + 1;
      }
      util.stackFrame.JGthread = "";
    }
    if (util.stackFrame.JGindex < blocks.length) util.yield();
    return util.stackFrame.JGreport || "";
  }
}

module.exports = JgScriptsBlocks;
