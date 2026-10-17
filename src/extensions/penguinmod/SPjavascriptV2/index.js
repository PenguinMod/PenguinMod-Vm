const BlockType = require("../../../extension-support/block-type");
const BlockShape = require("../../../extension-support/block-shape");
const ArgumentType = require("../../../extension-support/argument-type");
const SandboxRunner = require("../../../util/sandboxed-javascript-runner");
const Cast = require("../../../util/cast");
const {
  initCodeInput,
  setAutocompleteExtrasCallback,
} = require("./input-connector.js");

// We cant have nice things...
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const ASYNC_FUNC_PROTO = Object.getPrototypeOf(async function() {});
const SECRET_BLOCK_KEY = "needsInit-1@#4%^7*(0";

let isScratchBlocksReady = false;
const checkScratchBlocksReady = () => {
  if (!isScratchBlocksReady) {
    isScratchBlocksReady = typeof ScratchBlocks === "object";

    if (isScratchBlocksReady) {
      initCodeInput();
    }
  }
}

checkScratchBlocksReady()

class SPjavascriptV2 {
  constructor(runtime) {
    this.runtime = runtime;
    this.isEditorUnsandboxed = false;
    this.forceSandboxNextExecute = false;

    this.globalFuncs = new Map();

    this.runtime.vm.on("workspaceUpdate", checkScratchBlocksReady);

    setAutocompleteExtrasCallback(this.updateEditorSchema.bind(this));
  }
  getInfo() {
    return {
      id: "SPjavascriptV2",
      name: "JavaScript",
      color: "#f7df1e",
      blockText: "#323330",
      menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDIxMiwgMTkwLCAxNSk7IGZpbGw6IHJnYigyNDcsIDIyMywgMzApOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGQ9Ik0gMTEuMzU5IDExLjYxIEMgMTEuNzA2IDEyLjE3NyAxMi4xNTcgMTIuNTkzIDEyLjk1NCAxMi41OTMgQyAxMy42MjYgMTIuNTkzIDE0LjA1MyAxMi4yNTggMTQuMDUzIDExLjc5NSBDIDE0LjA1MyAxMS4yNCAxMy42MTMgMTEuMDQ0IDEyLjg3NiAxMC43MjEgTCAxMi40NzEgMTAuNTQ3IEMgMTEuMzA0IDEwLjA1IDEwLjUyOCA5LjQyNyAxMC41MjggOC4xMDkgQyAxMC41MjggNi44OTYgMTEuNDUyIDUuOTczIDEyLjg5OCA1Ljk3MyBDIDEzLjkyNiA1Ljk3MyAxNC42NjYgNi4zMyAxNS4xOTkgNy4yNjggTCAxMy45MzkgOC4wNzcgQyAxMy42NjEgNy41OCAxMy4zNjMgNy4zODMgMTIuODk4IDcuMzgzIEMgMTIuNDIzIDcuMzgzIDEyLjEyNCA3LjY4NCAxMi4xMjQgOC4wNzcgQyAxMi4xMjQgOC41NjMgMTIuNDI0IDguNzU5IDEzLjExOSA5LjA1OSBMIDEzLjUyMyA5LjIzMiBDIDE0Ljg5OCA5LjgyMiAxNS42NzQgMTAuNDIyIDE1LjY3NCAxMS43NzQgQyAxNS42NzQgMTMuMjMxIDE0LjUzIDE0LjAyOCAxMi45OTIgMTQuMDI4IEMgMTEuNDkgMTQuMDI4IDEwLjUxOSAxMy4zMTMgMTAuMDQ0IDEyLjM3NCBMIDExLjM1OSAxMS42MSBaIE0gNS42NDMgMTEuNzUxIEMgNS44OTggMTIuMjAyIDYuMTI5IDEyLjU4MyA2LjY4NSAxMi41ODMgQyA3LjIxNSAxMi41ODMgNy41NTEgMTIuMzc1IDcuNTUxIDExLjU2NiBMIDcuNTUxIDYuMDY0IEwgOS4xNjkgNi4wNjQgTCA5LjE2OSAxMS41ODggQyA5LjE2OSAxMy4yNjMgOC4xODcgMTQuMDI2IDYuNzUzIDE0LjAyNiBDIDUuNDU5IDE0LjAyNiA0LjcwOCAxMy4zNTYgNC4zMjYgMTIuNTQ4IEwgNS42NDMgMTEuNzUxIFoiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7Ij48L3BhdGg+Cjwvc3ZnPg==",
      blocks: [
        {
          opcode: "toggleSandbox",
          text: this.isEditorUnsandboxed ? "Run Sandboxed" : "Run Unsandboxed",
          blockType: BlockType.BUTTON,
        },
        {
          opcode: "codeInput",
          text: "[CODE]",
          blockType: BlockType.REPORTER,
          blockShape: BlockShape.SQUARE,
          hideFromPalette: true,
          arguments: {
            CODE: {
              type: ArgumentType.CUSTOM,
              id: "SPjavascriptV2-codeEditor",
              defaultValue: SECRET_BLOCK_KEY
            }
          },
        },
        {
          opcode: "argumentReport",
          text: "data",
          blockType: BlockType.REPORTER,
          hideFromPalette: true,
          canDragDuplicate: true,
          disableMonitor: true,
        },
        {
          opcode: "returnData",
          blockType: BlockType.COMMAND,
          isTerminal: true,
          hideFromPalette: true,
          text: "return [DATA]",
          arguments: {
            DATA: { type: ArgumentType.STRING }
          },
        },
        /* Shows if ScratchBlocks is not availiable. */
        {
          opcode: "jsCommand",
          text: "run [CODE]",
          blockType: BlockType.COMMAND,
          hideFromPalette: isScratchBlocksReady && !isSafari,
          arguments: {
            CODE: { type: ArgumentType.STRING, defaultValue: `alert("Hello!")` }
          }
        },
        {
          opcode: "jsReporter",
          text: "run [CODE]",
          blockType: BlockType.REPORTER,
          disableMonitor: true,
          allowDropAnywhere: true,
          hideFromPalette: isScratchBlocksReady && !isSafari,
          arguments: {
            CODE: {
              type: ArgumentType.STRING,
              defaultValue: "Math.random()"
            }
          }
        },
        {
          opcode: "jsBoolean",
          text: "run [CODE]",
          blockType: BlockType.BOOLEAN,
          disableMonitor: true,
          hideFromPalette: isScratchBlocksReady && !isSafari,
          arguments: {
            CODE: {
              type: ArgumentType.STRING,
              defaultValue: "Math.round(Math.random()) === 1"
            }
          }
        },
        /* Shows if ScratchBlocks is availiable. */
        {
          opcode: "jsCommandBinded",
          text: "run [CODE] with data [ARGS]",
          blockType: BlockType.COMMAND,
          hideFromPalette: isSafari || !isScratchBlocksReady,
          arguments: {
            CODE: { fillIn: "codeInput" },
            ARGS: {
              type: ArgumentType.STRING,
              defaultValue: `{ "FOO": "bar" }`,
              exemptFromNormalization: true
            }
          }
        },
        {
          opcode: "jsReporterBinded",
          text: "run [CODE] with data [ARGS]",
          blockType: BlockType.REPORTER,
          disableMonitor: true,
          allowDropAnywhere: true,
          hideFromPalette: isSafari || !isScratchBlocksReady,
          arguments: {
            CODE: { fillIn: "codeInput" },
            ARGS: {
              type: ArgumentType.STRING,
              defaultValue: `{ "STRING": "output: " }`,
              exemptFromNormalization: true
            }
          }
        },
        {
          opcode: "jsBooleanBinded",
          text: "run [CODE] with data [ARGS]",
          blockType: BlockType.BOOLEAN,
          disableMonitor: true,
          hideFromPalette: isSafari || !isScratchBlocksReady,
          arguments: {
            CODE: { fillIn: "codeInput" },
            ARGS: {
              type: ArgumentType.STRING,
              defaultValue: `{ "THRESHOLD": 0.5 }`,
              exemptFromNormalization: true
            }
          }
        },
        ...(isScratchBlocksReady ? ["---"] : []),
        {
          opcode: "defineGlobalFunc",
          text: "create global function named [NAME] with code [CODE]",
          blockType: BlockType.COMMAND,
          hideFromPalette: (isSafari || !isScratchBlocksReady) && !this.isEditorUnsandboxed,
          arguments: {
            NAME: {
              type: ArgumentType.STRING, defaultValue: "myFunction"
            },
            CODE: { fillIn: "codeInput" }
          }
        },
        {
          opcode: "defineScratchCode",
          text: "create local function named [NAME] with code [CODE]",
          blockType: BlockType.CONDITIONAL,
          hideFromPalette: true,
          arguments: {
            NAME: { type: ArgumentType.STRING },
            CODE: { fillIn: "argumentReport" }
          }
        },
        {
          blockType: BlockType.XML,
          hideFromPalette: !this.isEditorUnsandboxed,
          xml: `
            <block type="SPjavascriptV2_defineScratchCode">
              <value name="NAME"><shadow type="text"><field name="TEXT">myFunction</field></shadow></value>
              <value name="CODE"><shadow type="SPjavascriptV2_argumentReport"></shadow></value>
              <value name="SUBSTACK"><block type="SPjavascriptV2_returnData">
                <value name="DATA"><shadow type="text"><field name="TEXT">completed</field></shadow></value>
              </block></value>
            </block>
          `
        },
        {
          opcode: "deleteGlobalFunc",
          text: "delete global function [NAME]",
          blockType: BlockType.COMMAND,
          hideFromPalette: !isScratchBlocksReady && !this.isEditorUnsandboxed,
          arguments: {
            NAME: {
              type: ArgumentType.STRING, defaultValue: "myFunction"
            }
          }
        },
        "---",
        {
          opcode: "runNextInSandbox",
          text: "run next code in sandbox",
          blockType: BlockType.COMMAND,
          hideFromPalette: !this.isEditorUnsandboxed,
        },
        {
          opcode: "packagerInfo",
          text: "Sandbox in Packager Notice",
          blockType: BlockType.BUTTON,
          hideFromPalette: !this.isEditorUnsandboxed
        }
      ]
    };
  }

  // Helper Funcs
  toggleSandbox() {
    if (this.isEditorUnsandboxed) {
      this.isEditorUnsandboxed = false;
      this.runtime.extensionManager.refreshBlocks("SPjavascriptV2");
    } else {
      this.runtime.vm.securityManager.canUnsandbox("JavaScript").then((isAllowed) => {
        if (!isAllowed) return;

        this.isEditorUnsandboxed = true;
        this.runtime.extensionManager.refreshBlocks("SPjavascriptV2");
      });
    }
  }

  packagerInfo() {
    alert([
      "You can run code Unsandboxed in the Project Packager but toggling:",
      "'Player Options > Remove sandbox on the JavaScript Ext.'",
      "On!"
    ].join("\n"));
  }

  _getThisBlockID(util) {
    return util.thread.isCompiled ?
      util.thread.peekStack() :
      util.thread.peekStackFrame().op.id;
  }

  _isLegalFuncName(name) {
    try {
      new Function(`function ${name}(){}`);
      return true;
    } catch {
      return false;
    }
  }

  _parseArguments(arg) {
    if (!arg) return [];

    try {
      if (typeof arg === "object") {
        const argType = arg.constructor?.name;
        if (argType === "Object" || argType === "Array") {
          // This is raw JSON, dont re-parse.
          return arg;
        } else {
          // This is a custom return api value, try calling toJSON.
          if (typeof arg.toJSON === "function") {
            return arg.toJSON();
          }

          arg = arg.toString();
        }
      }

      const parsed = JSON.parse(arg);
      return typeof parsed === "object" ? parsed : [];
    } catch {
      console.warn(`Failed to parse JavaScript data JSON: ${err}`);
      return [];
    }
  }

  _compileCode(code, codeArgs = [], util) {
    // Check if we have a cached function so we can run code faster
    let cacheKey = null;
    let newFunc = null;
    if (!this.forceSandboxNextExecute && this.isEditorUnsandboxed) {
      cacheKey = this._getThisBlockID(util);

      const cached = util.thread._JSV2cache?.get(cacheKey);
      if (cached) newFunc = cached;
    }

    const isArgArray = Array.isArray(codeArgs);
    const argEntries = Object.entries(codeArgs);
    if (newFunc === null) {
      let binders = "";

      /* Inject global functions */
      if (this.globalFuncs.size > 0) {
        const entries = this.globalFuncs.entries();
        let iteratorValue = entries.next();
        while (!iteratorValue.done) {
          const [name, funcData] = iteratorValue.value;
          if (funcData.isBlockCode) {
            /* Convert block stacks to a js-like function. */
            binders += `const ${name} = async function(...args) {\n`;
            if (funcData.id) {
              binders += `return new Promise((resolve) => {\n`;
              binders += `const target = vm.runtime.getTargetById("${funcData.origin}");\n`;
              binders += `const thread = vm.runtime._pushThread("${funcData.id}", target);\n`;
              binders += `const threadID = thread.getId();\n`;
              binders += `thread.jsExtData = [...args];\n`;

              /* Listener for thread returns. */
              binders += `const endHandler = (t) => {\n`;
              binders += `if (t.getId() === thread.getId()) {\n`;
              binders += `vm.runtime.removeListener("THREAD_FINISHED", endHandler);\n`;
              binders += `resolve(t.justReported);\n`;
              binders += "}\n";
              binders += "};\n";
              binders += `vm.runtime.on("THREAD_FINISHED", endHandler);\n`;
              binders += "});\n";
            }
            binders += "}\n";
          } else {
            binders += `const ${name} = ${funcData.code}\n`;
          }

          iteratorValue = entries.next();
        }
      }

      /* Append the running target */
      if (!this.forceSandboxNextExecute && this.isEditorUnsandboxed) {
        binders += `const target = vm.runtime.getTargetById("${util.target.id}");\n`;
        binders += `const sprite = target;\n`;
      }

      /* Generate arguments */
      let argNames = [];
      if (codeArgs !== undefined) {
        if (isArgArray) argNames.push("...data");
        else argNames.push(...argEntries.map((a) => a[0]));
      }

      newFunc = ASYNC_FUNC_PROTO.constructor(...argNames, binders + code);
    }

    return {
      cacheKey,
      isArgArray,
      argEntries,
      func: newFunc,
    };
  }

  async _executeCode(code, codeArgs = [], util) {
    const {
      cacheKey,
      isArgArray,
      argEntries,
      func,
    } = this._compileCode(code, codeArgs, util);

    if (!this.forceSandboxNextExecute && this.isEditorUnsandboxed) {
      // Cache the function.
      if (!util.thread._JSV2cache) {
        util.thread._JSV2cache = new Map();
      }

      util.thread._JSV2cache.set(cacheKey, func);

      // Run unsandboxed code
      let successful = true;
      let result;
      try {
        if (isArgArray) {
          result = await func(...codeArgs);
        } else {
          result = await func(...argEntries.map((a) => a[1]));
        }
      } catch (err) {
        successful = false;
        result = err.message || err;
      }

      return {
        success: successful,
        result: result ?? null
      };
    } else {
      // Run sandboxed code
      let caller = "(";
      if (!isArgArray) codeArgs = argEntries.map((a) => a[1]);

      // Unfortunately, arguments using custom return types wont work.
      // Nothing we can do in that case.
      caller += codeArgs.map(a => JSON.stringify(a)).join(",");
      caller += ")";

      const funcString = "(" + func.toString() + ")" + caller;
      let executionResult;
      await new Promise((resolve) => {
        SandboxRunner.execute(funcString).then(result => {
          // Results are { value: any, success: boolean }
          executionResult = result;
          resolve();
        });
      });

      this.forceSandboxNextExecute = false;
      return {
        success: executionResult.success,
        result: executionResult.value ?? null
      };
    }
  }

  updateEditorSchema() {
    // Append various autocompletions to the code editor.
    const autocompletions = [
      "data", // variable used when passing an array into a js data input
    ];

    // Add global functions into autocomplete
    const globalFuncNames = {};
    if (this.globalFuncs.size > 0) {
      const iterator = this.globalFuncs.keys();
      let iteratorValue = iterator.next();
      while (!iteratorValue.done) {
        autocompletions.push(iteratorValue.value);
        iteratorValue = iterator.next();
      }
    }

    return autocompletions;
  };

  // Block Funcs
  codeInput(args) {
    return args.CODE;
  }

  async jsCommand(args, util) {
    const output = await this._executeCode(Cast.toString(args.CODE), [], util);
    if (output.success) return output.result;
    else throw output.result;
  }
  async jsCommandBinded(args, util) {
    const output = await this._executeCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );

    if (output.success) return output.result;
    else throw output.result;
  }

  async jsReporter(args, util) {
    const output = await this._executeCode(Cast.toString(args.CODE), [], util);

    if (output.success) return output.result;
    else throw output.result;
  }
  async jsReporterBinded(args, util) {
    const output = await this._executeCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );

    if (output.success) return output.result;
    else throw output.result;
  }

  async jsBoolean(args, util) {
    const output = await this._executeCode(
      Cast.toString(args.CODE),
      [],
      util
    );
    if (!output.success) throw output.result;

    /* force output a boolean */
    const possiblePromise = output.result;
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return (async () => {
        const value = await possiblePromise;
        return Cast.toBoolean(value);
      })();
    }

    return Cast.toBoolean(possiblePromise);
  }
  async jsBooleanBinded(args, util) {
    const output = await this._executeCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );
    if (!output.success) throw output.result;

    /* force output a boolean */
    const possiblePromise = output.result;
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return (async () => {
        const value = await possiblePromise;
        return Cast.toBoolean(value);
      })();
    }

    return Cast.toBoolean(possiblePromise);
  }

  defineGlobalFunc(args) {
    const funcName = Cast.toString(args.NAME);
    if (this._isLegalFuncName(funcName)) {
      const funcRegex = /^function\s*\([^)]*\)\s*\{[\s\S]*\}$/;
      const lambRegex = /^\([^)]*\)\s*=>\s*(\{[\s\S]*\}|[^{}][^\n]*)$/;
      const code = Cast.toString(args.CODE).trim();
      if (funcRegex.test(code) || lambRegex.test(code)) {
        this.globalFuncs.set(funcName, { code, isBlockCode: false });
      } else {
        throw new Error("Global Code must be 'function' or 'lambda'!");
      }
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  defineScratchCode(args, util) {
    const funcName = Cast.toString(args.NAME);
    if (this._isLegalFuncName(funcName)) {
      const branch = util.thread.blockContainer.getBranch(util.thread.peekStack(), 1);
      this.globalFuncs.set(funcName, {
        id: branch,
        origin: util.target.id,
        isBlockCode: true
      });
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  deleteGlobalFunc(args) {
    this.globalFuncs.delete(Cast.toString(args.NAME));
  }

  argumentReport(_, util) {
    return util.thread.jsExtData ? JSON.stringify(util.thread.jsExtData) : "[]";
  }

  returnData(args, util) {
    util.thread.justReported = args.DATA;

    // Delay the Deletion of this Thread
    if (util.stackTimerNeedsInit()) {
      util.startStackTimer(0);
      this.runtime.requestRedraw();
      util.yield();
    } else if (!util.stackTimerFinished()) {
      util.yield();
    }

    util.thread.stopThisScript();
  }

  runNextInSandbox() {
    this.forceSandboxNextExecute = true;
  }
}

module.exports = SPjavascriptV2;
