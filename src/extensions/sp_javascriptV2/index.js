const BlockType = require("../../extension-support/block-type");
const BlockShape = require("../../extension-support/block-shape");
const ArgumentType = require("../../extension-support/argument-type");
const SandboxRunner = require("../../util/sandboxed-javascript-runner");
const Cast = require("../../util/cast");

/** GUI */
let isScratchBlocksReady = typeof ScratchBlocks === "object";

let updateEditorSchema = (globalFuncs) => { /* Overridden in 'initBlockTools' */ };

const SECRET_BLOCK_KEY = "needsInit-1@#4%^7*(0";

function initBlockTools() {
  // import the 'ace' code editor
  const ACE_URL = "https://cdn.jsdelivr.net/npm/ace-builds@1.32.3/src-min-noconflict/";
  const ACE_PACKAGES = [
    "ace.js", "ext-language_tools.js",
    "mode-javascript.js", "theme-monokai.js"
  ];

  let loadedPackages = 0;
  const importAcePackages = () => {
    for (const packageName of ACE_PACKAGES) {
      const script = document.createElement("script");
      script.src = ACE_URL + packageName;
      script.async = false;
      script.onload = () => loadedPackages++;
      document.body.appendChild(script);
    }
  };
  importAcePackages();

  const waitForAce = async function() {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (loadedPackages === ACE_PACKAGES.length) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });
  }

  // update the ace editor autocomplete with various custom items
  let aceCompleteSchema = [];
  updateEditorSchema = (globalFuncs) => {
    aceCompleteSchema = [
      "data", // variable used when passing an array into a js data input
    ];

    // add global functions into autocomplete
    const globalFuncNames = {};
    if (globalFuncs && globalFuncs.size > 0) {
      const iterator = globalFuncs.keys();
      let iteratorValue = iterator.next();
      while (!iteratorValue.done) {
        aceCompleteSchema.push(iteratorValue.value);
        iteratorValue = iterator.next();
      }
    }
  };

  /*
    Import autocompletion in our editors as well as add our
    own custom completor to the editor so the user can directly
    access Scratch internals such as the vm, blockly, and more.
  */
  let langToolsNeedsInit = true;
  const importAceAutoComplete = () => {
    // ace is fully loaded by the time this runs
    if (langToolsNeedsInit) {
      langToolsNeedsInit = false;
      const langTools = ace.require("ace/ext/language_tools");

      // custom autocomplete
      const ScratchContextCompleter = {
        getCompletions: function(editor, session, pos, prefix, callback) {
          const line = session.getLine(pos.row).slice(0, pos.column - prefix.length);
          const matches = line.match(/([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.$/);
          const chain = matches ? matches[1].split(".") : [];

          let current = window;
          for (const segment of chain) {
            if (current && current[segment]) current = current[segment];
            else {
              current = null;
              break;
            }
          }

          let list = [];
          if (current && chain.length) {
            list = [
              ...Object.getOwnPropertyNames(current),
              ...Object.getOwnPropertyNames(current.constructor.prototype)
            ];
          } else {
            list.push(...aceCompleteSchema);
            list.push("vm");
            if (typeof Scratch === "object") list.push("Scratch");
            if (typeof Blockly === "object") list.push("Blockly");
            if (typeof ScratchBlocks === "object") list.push("ScratchBlocks");
          }

          callback(null, list.map(word => ({
            caption: word,
            value: word,
            meta: chain.length ? "child of " + chain[chain.length - 1] : "root",
            score: 1000
          })));
        }
      };

      ScratchContextCompleter.triggerCharacters = ["."]; 
      langTools.addCompleter(ScratchContextCompleter);
    }
  };

  // since our code inputs are shadows, we cant hardcode the value from
  // the parent block use this to initialize a default value when unset.
  const getDefaultValue = (field, parent) => {
    const currentValue = field.getValue();
    if (currentValue === SECRET_BLOCK_KEY) {
      const outerType = parent.type;
      const opcode = (outerType ?? "").split("_")[1];
      switch (opcode) {
        case "jsCommandBinded": return `alert(FOO);`;
        case "jsReporterBinded": return `return STRING + Math.random()`;
        case "jsBooleanBinded": return `return Math.random() > THRESHOLD`;
        case "defineGlobalFunc": return `(param1) => {\nreturn btoa(param1);\n}`;
        default: return `console.log("Hello!")`;
      }
    }

    return currentValue;
  };

  // element reused by the custom input api
  const recyclableDiv = document.createElement("div");
  recyclableDiv.setAttribute("style", `display: flex; justify-content: center; padding-top: 10px; width: 250px; height: 100px;`);

  const unloadedEditor = document.createElement("div");
  unloadedEditor.setAttribute("style", "background: #272822; border-radius: 10px; border: none; width: 100%; height: calc(100% - 20px);");
  recyclableDiv.appendChild(unloadedEditor);

  const resizeHandleCSS = "position: absolute; right: 5px; bottom: 15px; width: 12px; height: 12px; background: #ffffff40; cursor: se-resize; border-radius: 0px 0 50px 0; z-index: 999;";

  // register our code input
  ScratchBlocks.FieldCustom.registerInput(
    "SPjavascriptV2-codeEditor",
    recyclableDiv,
    async (field) => {
      /* on init */
      const inputObject = field.inputSource;
      const input = inputObject.firstChild;
      const srcBlock = field.sourceBlock_;
      if (!srcBlock) return;

      const parent = srcBlock.parentBlock_;
      const isDraggable = parent.isInFlyout || srcBlock.svgGroup_.classList.contains("blocklyDragging");
      const editorId = "editor-" + srcBlock.id;

      input.style.height = "110px";
      input.firstChild.id = editorId;

      await waitForAce();

      // initialize the ace editor
      importAceAutoComplete();

      const editor = ace.edit(editorId);
      editor.setOptions({
        fontSize: "15px",
        showPrintMargin: false,
        highlightActiveLine: true,
        useWorker: false,
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: true
      });

      editor.session.setMode("ace/mode/javascript");
      editor.setTheme("ace/theme/monokai");
      editor.setOption("hasCssTransforms", true);
      editor.session.on("change", () => field.setValue(editor.getValue()));

      const defaultValue = getDefaultValue(field, parent);

      field.setValue(defaultValue);
      editor.setValue(defaultValue);
      editor.clearSelection();

      // blockly will prevent us from focusining on our textarea
      // so we need to override it via outside events
      const unfocusListener = (e) => {
        if (String(e.toElement?.className).includes("ace")) return;

        editor.blur();
        ScratchBlocks.mainWorkspace.allowDragging = true;
        parent.setMovable(true);

        input.removeEventListener("mouseleave", unfocusListener);
      };

      ScratchBlocks.bindEventWithChecks_(input, "mousedown", field, (e) => {
        e.stopPropagation();
        ScratchBlocks.mainWorkspace.allowDragging = false;
        parent.setMovable(false);
        editor.focus();

        input.addEventListener("mouseleave", unfocusListener);
      });

      // allow resizing the editor
      const resizeHandle = document.createElement("div");
      resizeHandle.setAttribute("style", resizeHandleCSS + `pointer-events: ${isDraggable ? "none" : "all"}`);
      input.appendChild(resizeHandle);

      let isResizing = false;
      let startX, startY, startW, startH;
      resizeHandle.addEventListener("mousedown", (e) => {
        if (parent.isInFlyout) return;

        e.preventDefault();
        editor.blur();
        ScratchBlocks.mainWorkspace.allowDragging = false;
        parent.setMovable(false);
        input.removeEventListener("mouseleave", unfocusListener);

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = input.offsetWidth;
        startH = input.offsetHeight;

        function onMouseMove(ev) {
          if (!isResizing) return;

          const newW = Math.max(150, startW + (ev.clientX - startX));
          const newH = Math.max(100, startH + (ev.clientY - startY));

          input.style.pointerEvents = "none";
          input.style.width = `${newW}px`;
          input.style.height = `${newH}px`;
          resizeHandle.style.left = `${newW - 20}px`;
          resizeHandle.style.top = `${newH - 40}px`;
          inputObject.setAttribute("width", newW);
          inputObject.setAttribute("height", newH);
          field.size_.width = newW;
          field.size_.height = newH - 10;

          if (srcBlock?.render) srcBlock.render();
        }

        function onMouseUp() {
          isResizing = false;
          ScratchBlocks.mainWorkspace.allowDragging = true;
          parent.setMovable(true);
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        }

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });

      // monkey patch this function since using MutationObservers will cause lag
      // this patch allows dragging blocks to not act weird with mouse touching
      const ogSetAtt = parent.svgGroup_.setAttribute;
      parent.svgGroup_.setAttribute = (...args) => {
        if (args[0] === "class") {
          if (parent.isInFlyout || args[1].includes("blocklyDragging")) {
            input.style.pointerEvents = "none";
            resizeHandle.style.pointerEvents = "none";
          } else {
            input.style.pointerEvents = "all";
            resizeHandle.style.pointerEvents = "all";
          }
        }
        ogSetAtt.call(parent.svgGroup_, ...args);
      }
    },
    () => { /* no work needs to be done here */ },
    () => { /* no work needs to be done here */ }
  );
}
if (isScratchBlocksReady) {
  initBlockTools();
  updateEditorSchema();
}

class SPjavascriptV2 {
  constructor(runtime) {
    this.runtime = runtime;
    this.isInSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    this.isEditorUnsandboxed = false;

    this.runtime.vm.on("EXTENSION_ADDED", () => updateEditorSchema(this.globalFuncs));
    this.runtime.vm.on("workspaceUpdate", () => {
      if (!isScratchBlocksReady) {
        isScratchBlocksReady = typeof ScratchBlocks === "object";
        if (isScratchBlocksReady) initBlockTools();
      }
    });

    this.ASYNC_FUNC_PROTO = Object.getPrototypeOf(async function() {});

    this.globalFuncs = new Map();
  }
  getInfo() {
    return {
      id: "SPjavascriptV2",
      name: "JavaScript V2",
      color1: "#f7df1e",
      blockText: "#323330",
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
              type: ArgumentType.CUSTOM, id: "SPjavascriptV2-codeEditor",
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
        /* shown if ScratchBlocks is not availiable */
        {
          opcode: "jsCommand",
          text: "run [CODE]",
          blockType: BlockType.COMMAND,
          hideFromPalette: isScratchBlocksReady && !this.isInSafari,
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
          hideFromPalette: isScratchBlocksReady && !this.isInSafari,
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
          hideFromPalette: isScratchBlocksReady && !this.isInSafari,
          arguments: {
            CODE: {
              type: ArgumentType.STRING,
              defaultValue: "Math.round(Math.random()) === 1"
            }
          }
        },
        /* shown if ScratchBlocks is availiable */
        {
          opcode: "jsCommandBinded",
          text: "run [CODE] with data [ARGS]",
          blockType: BlockType.COMMAND,
          hideFromPalette: this.isInSafari || !isScratchBlocksReady,
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
          hideFromPalette: this.isInSafari || !isScratchBlocksReady,
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
          hideFromPalette: this.isInSafari || !isScratchBlocksReady,
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
          hideFromPalette: (this.isInSafari || !isScratchBlocksReady) && !this.isEditorUnsandboxed,
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
        {
          opcode: "packagerInfo",
          text: "Sandbox in Packager Notice",
          blockType: BlockType.BUTTON,
          hideFromPalette: !this.isEditorUnsandboxed
        }
      ]
    };
  }

  // helper funcs
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

  _parseArguments(arg) {
    if (!arg) return [];

    try {
      if (typeof arg === "object") {
        const argType = arg.constructor?.name;
        if (argType === "Object" || argType === "Array") {
          // raw JSON was sent, no parsing needed
          return arg;
        } else {
          // PM custom return api was sent, try calling toJSON
          if (typeof arg.toJSON === "function") {
            return arg.toJSON();
          }

          arg = arg.toString();
        }
      }

      const parsed = JSON.parse(arg);
      return typeof parsed === "object" ? parsed : [];
    } catch {
      return [];
    }
  }

  _isLegalFuncName(name) {
    try {
      new Function(`function ${name}(){}`);
      return true;
    } catch {
      return false;
    }
  }

  async _compileCode(code, codeArgs = [], util) {
    // check if we have a cached function so we can
    // run code faster
    let cacheKey;
    let newFunc = undefined;
    if (
      this.isEditorUnsandboxed ||
      this.runtime.extensionRuntimeOptions.javascriptUnsandboxed === true
    ) {
      cacheKey = this._getThisBlockID(util);
      newFunc = util.thread._JSV2cache?.[cacheKey];
    }

    const isArgArray = Array.isArray(codeArgs);
    const argEntries = Object.entries(codeArgs);
    if (newFunc === undefined) {
      // no cache found
      let binders = "";

      /* inject global functions */
      if (this.globalFuncs.size > 0) {
        const entries = this.globalFuncs.entries();
        let iteratorValue = entries.next();
        while (!iteratorValue.done) {
          const [name, funcData] = iteratorValue.value;
          if (funcData.isBlockCode) {
            binders += `const ${name} = async function(...args) {\n`;
            if (funcData.id) {
              binders += `return new Promise((resolve) => {\n`;
              binders += `const target = vm.runtime.getTargetById("${funcData.origin}");\n`;
              binders += `const thread = vm.runtime._pushThread("${funcData.id}", target);\n`;
              binders += `const threadID = thread.getId();\n`;
              binders += `thread.jsExtData = [...args];\n`;

              /* listener for thread returns */
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

      /* generate arguments */
      let argNames = [];
      if (codeArgs !== undefined) {
        if (isArgArray) argNames.push("...data");
        else argNames.push(...argEntries.map((a) => a[0]));
      }

      newFunc = this.ASYNC_FUNC_PROTO.constructor(...argNames, binders + code);
    }

    /* 'extensionRuntimeOptions.javascriptUnsandboxed' is used by packager */
    if (
      this.isEditorUnsandboxed ||
      this.runtime.extensionRuntimeOptions.javascriptUnsandboxed === true
    ) {
      // cache the function
      if (!util.thread._JSV2cache) util.thread._JSV2cache = {};
      util.thread._JSV2cache[cacheKey] = newFunc;

      // unsandboxed code
      let result;
      try {
        if (isArgArray) {
          // eslint-disable-next-line no-eval
          result = await newFunc(...codeArgs);
        } else {
          // eslint-disable-next-line no-eval
          result = await newFunc(...argEntries.map((a) => a[1]));
        }
      } catch (err) {
        throw err;
      }

      return result;
    } else {
      // sandboxed code
      let caller = "(";
      if (!isArgArray) codeArgs = argEntries.map((a) => a[1]);

      // unfortunately, this wont work on custom return types...
      // nothing we can do in this case
      caller += codeArgs.map(a => JSON.stringify(a)).join(",");
      caller += ")";

      const newFuncString = "(" + newFunc.toString() + ")" + caller;
      return new Promise((resolve) => {
        SandboxRunner.execute(newFuncString).then(result => {
          // result is { value: any, success: boolean }
          // in PM, we always ignore errors
          return resolve(result.value);
        });
      });
    }
  }

  // block funcs
  codeInput(args) {
    return args.CODE;
  }

  async jsCommand(args, util) {
    await this._compileCode(Cast.toString(args.CODE), [], util);
  }
  async jsCommandBinded(args, util) {
    await this._compileCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );
  }

  async jsReporter(args, util) {
    return await this._compileCode(Cast.toString(args.CODE), [], util);
  }
  async jsReporterBinded(args, util) {
    return await this._compileCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );
  }

  async jsBoolean(args, util) {
    const possiblePromise = await this._compileCode(Cast.toString(args.CODE), [], util);

    /* force output a boolean */
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return (async () => {
        const value = await possiblePromise;
        return Cast.toBoolean(value);
      })();
    }

    return Cast.toBoolean(possiblePromise);
  }
  async jsBooleanBinded(args, util) {
    const possiblePromise = await this._compileCode(
      Cast.toString(args.CODE),
      this._parseArguments(args.ARGS),
      util
    );

    /* force output a boolean */
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
      if (funcRegex.test(code) || lambRegex.test(code)) this.globalFuncs.set(funcName, { code, isBlockCode: false });
      else throw new Error("Global Code must be 'function' or 'lambda'!");

      updateEditorSchema(this.globalFuncs);
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  defineScratchCode(args, util) {
    const funcName = Cast.toString(args.NAME);
    if (this._isLegalFuncName(funcName)) {
      const branch = util.thread.blockContainer.getBranch(util.thread.peekStack(), 1);
      this.globalFuncs.set(funcName, { id: branch, origin: util.target.id, isBlockCode: true });
      updateEditorSchema(this.globalFuncs);
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  argumentReport(_, util) {
    return util.thread.jsExtData ? JSON.stringify(util.thread.jsExtData) : "[]";
  }

  deleteGlobalFunc(args) {
    this.globalFuncs.delete(Cast.toString(args.NAME));
    updateEditorSchema(this.globalFuncs);
  }

  returnData(args, util) {
    util.thread.justReported = args.DATA;
    // Delay the Deletion of this Thread
    if (util.stackTimerNeedsInit()) {
      util.startStackTimer(0);
      this.runtime.requestRedraw();
      util.yield();
    } else if (!util.stackTimerFinished()) util.yield();
    util.thread.stopThisScript();
  }

  // save state to storage
  serialize() {
    return {
      isUnsandboxed: this.isEditorUnsandboxed
    };
  }
  deserialize(data) {
    if (data.isUnsandboxed) this.toggleSandbox();
  }
}

module.exports = SPjavascriptV2;
