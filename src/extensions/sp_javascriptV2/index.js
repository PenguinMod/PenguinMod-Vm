const BlockType = require("../../extension-support/block-type");
const BlockShape = require("../../extension-support/block-shape");
const ArgumentType = require("../../extension-support/argument-type");
const SandboxRunner = require("../../util/sandboxed-javascript-runner");
const Cast = require("../../util/cast");

let isScratchBlocksReady = typeof ScratchBlocks === "object";
const codeEditorHandlers = new Map();

// we cant have nice things
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

async function runCode(x) {
  return await Object.getPrototypeOf(async function() {}).constructor(x)();
}

function initBlockTools() {
  window.addEventListener("message", (e) => {
    if (e.data?.type === "code-change") {
      const handler = codeEditorHandlers.get(e.data.id);
      if (handler) handler(e.data.value);
    }
  });

  const recyclableDiv = document.createElement("div");
  recyclableDiv.setAttribute("style", `display: flex; justify-content: center; padding-top: 10px; width: 250px; height: 200px;`);

  const fakeDiv = document.createElement("div");
  fakeDiv.setAttribute("style", "background: #272822; border-radius: 10px; border: none; width: 100%; height: calc(100% - 20px);");
  recyclableDiv.appendChild(fakeDiv);

  ScratchBlocks.FieldCustom.registerInput(
    "SPjavascriptV2-codeEditor",
    recyclableDiv,
    (field) => {
      /* on init */
      const inputObject = field.inputSource;
      const input = inputObject.firstChild;
      const srcBlock = field.sourceBlock_;
      const parent = srcBlock.parentBlock_;
      const dragCheck = parent.isInFlyout || srcBlock.svgGroup_.classList.contains("blocklyDragging") ? "none" : "all";

      inputObject.setAttribute("pointer-events", "none");
      input.style.height = "210px";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("style", `pointer-events: ${dragCheck}; background: #272822; border-radius: 10px; border: none; ${isSafari ? "" : "width: 100%;"} height: calc(100% - 20px);`);
      iframe.setAttribute("sandbox", "allow-scripts");

      const html = `
<!DOCTYPE html>
<html><head>
  <style>html, body, #editor {background: #272822; margin: 0; padding: 0; height: 100%; width: 100%;}</style>
</head>
<body>
  <div id="editor"></div>
  <script src="https://cdn.jsdelivr.net/npm/ace-builds@1.32.3/src-min-noconflict/ace.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/ace-builds@1.32.3/src-min-noconflict/mode-javascript.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/ace-builds@1.32.3/src-min-noconflict/theme-monokai.js"></script>
  <script>
    window.addEventListener("message", function(e) {
      const editor = ace.edit("editor");
      editor.setOptions({
        fontSize: "15px", showPrintMargin: false,
        highlightActiveLine: true, useWorker: false
      });

      editor.session.setMode("ace/mode/javascript");
      editor.setTheme("ace/theme/monokai");
      editor.setValue(e.data.value);
      editor.session.on("change", () => parent.postMessage({
        type: "code-change", id: "${srcBlock.id}", value: editor.getValue()
      }, "*"));
    }, { once: true });
  </script>
</body>
</html>`;
      iframe.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      input.replaceChild(iframe, input.firstChild);
      iframe.onload = () => {
        let value = field.getValue();
        if (value === "needsInit-1@#4%^7*(0") {
          const outerType = srcBlock.parentBlock_.type;
          if (outerType.endsWith("jsCommandBinded")) value = `alert(FOO);`;
          else if (outerType.endsWith("jsReporterBinded")) value = `return STRING + Math.random()`;
          else if (outerType.endsWith("jsBooleanBinded")) value = `return Math.random() > THRESHOLD`;
          else if (outerType.endsWith("defineGlobalFunc")) value = `(param1) => {\nreturn btoa(param1);\n}`;
          field.setValue(value);
        }

        iframe.contentWindow.postMessage({ value }, "*");
      };

      // listen for code updates
      codeEditorHandlers.set(srcBlock.id, (value) => field.setValue(value));

      const resizeHandle = document.createElement("div");
      resizeHandle.setAttribute("style", `pointer-events: ${dragCheck}; position: absolute; right: 5px; bottom: 15px; width: 12px; height: 12px; background: #ffffff40; cursor: se-resize; border-radius: 0px 0 50px 0;`);
      input.appendChild(resizeHandle);

      let isResizing = false;
      let startX, startY, startW, startH;
      resizeHandle.addEventListener("mousedown", (e) => {
        if (parent.isInFlyout) return;
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startW = input.offsetWidth;
        startH = input.offsetHeight;
        ScratchBlocks.mainWorkspace.allowDragging = false;
        parent.setMovable(false);

        function onMouseMove(ev) {
          if (!isResizing) return;
          iframe.style.pointerEvents = "none";
          const newW = Math.max(150, startW + (ev.clientX - startX));
          const newH = Math.max(100, startH + (ev.clientY - startY));
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

      // monkey patch this function since MutationObservers will lag
      // this patch allows dragging blocks to not act weird with mouse touching
      const ogSetAtt = parent.svgGroup_.setAttribute;
      parent.svgGroup_.setAttribute = (...args) => {
        if (args[0] === "class") {
          if (parent.isInFlyout || args[1].includes("blocklyDragging")) {
            iframe.style.pointerEvents = "none";
            resizeHandle.style.pointerEvents = "none";
          } else {
            iframe.style.pointerEvents = "all";
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
if (isScratchBlocksReady) initBlockTools();

class SPjavascriptV2 {
  constructor(runtime) {
    this.runtime = runtime;
    this.isEditorUnsandboxed = false;

    this.runtime.vm.on("workspaceUpdate", () => {
      codeEditorHandlers.clear();
      if (!isScratchBlocksReady) {
        isScratchBlocksReady = typeof ScratchBlocks === "object";
        if (isScratchBlocksReady) initBlockTools();
      }
    });

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
              defaultValue: "needsInit-1@#4%^7*(0"
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
        /* shown if ScratchBlocks is availiable */
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

  parseArguments(argJSON) {
    try {
      if (argJSON.constructor?.name === "Object") return argJSON;
      else {
        // this is a PM custom return api value
        argJSON = argJSON.toString();
        if (typeof argJSON === "object" && !Array.isArray(argJSON)) return argJSON;
        else return JSON.parse(argJSON);
      }
    } catch(err) {
      console.warn(`Failed to parse Javascript Data JSON: ${err}`);
      return {};
    }
  }

  isLegalFuncName(name) {
    try {
      new Function(`function ${name}(){}`);
      return true;
    } catch {
      return false;
    }
  }

  async runCode(code, binds) {
    let binders = "";

    /* inject global functions */
    if (this.globalFuncs.size > 0) {
      const funcs = this.globalFuncs.entries().toArray();
      for (const [name, funcData] of funcs) {
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
      }
    }

    /* inject arguments */
    if (binds !== undefined) {
      for (let [name, value] of Object.entries(binds)) {
        // normalize values
        switch (typeof value) {
          case "string":
            value = `"${value}"`;
            break;
          case "object":
            value = JSON.stringify(value);
            break;
          default: break;
        }
        binders += `const ${name} = ${value};\n`;
      }
    }

    /* 'extensionRuntimeOptions.javascriptUnsandboxed' is used for packager */
    if (this.isEditorUnsandboxed || this.runtime.extensionRuntimeOptions.javascriptUnsandboxed === true) {
      let result;
      try {
        // eslint-disable-next-line no-eval
        result = await runCode(binders + code);
      } catch (err) {
        throw err;
      }
      return result;
    }
    // we are sandboxed
    const codeRunner = `Object.getPrototypeOf(async function() {}).constructor(\`${(binders + code).replaceAll("`", "\\`")}\`)()`;
    return new Promise((resolve) => {
      SandboxRunner.execute(codeRunner).then(result => {
        // result is { value: any, success: boolean }
        // in PM, we always ignore errors
        return resolve(result.value);
      });
    });
  }

  // block funcs
  codeInput(args) {
    return args.CODE;
  }

  async jsCommand(args) {
    await this.runCode(Cast.toString(args.CODE));
  }
  async jsCommandBinded(args) {
    await this.runCode(
      Cast.toString(args.CODE),
      this.parseArguments(args.ARGS)
    );
  }

  async jsReporter(args) {
    return await this.runCode(Cast.toString(args.CODE));
  }
  async jsReporterBinded(args) {
    return await this.runCode(
      Cast.toString(args.CODE),
      this.parseArguments(args.ARGS)
    );
  }

  async jsBoolean(args) {
    const possiblePromise = await this.runCode(Cast.toString(args.CODE));
    /* force output a boolean */
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return (async () => {
        const value = await possiblePromise;
        return Cast.toBoolean(value);
      })();
    }
    return Cast.toBoolean(possiblePromise);
  }
  async jsBooleanBinded(args) {
    const possiblePromise = await this.runCode(
      Cast.toString(args.CODE),
      this.parseArguments(args.ARGS)
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
    if (this.isLegalFuncName(funcName)) {
      const funcRegex = /^function\s*\([^)]*\)\s*\{[\s\S]*\}$/;
      const lambRegex = /^\([^)]*\)\s*=>\s*(\{[\s\S]*\}|[^{}][^\n]*)$/;
      const code = Cast.toString(args.CODE).trim();
      if (funcRegex.test(code) || lambRegex.test(code)) this.globalFuncs.set(funcName, { code, isBlockCode: false });
      else throw new Error("Global Code must be 'function' or 'lambda'!");
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  defineScratchCode(args, util) {
    const funcName = Cast.toString(args.NAME);
    if (this.isLegalFuncName(funcName)) {
      const branch = util.thread.blockContainer.getBranch(util.thread.peekStack(), 1);
      this.globalFuncs.set(funcName, { id: branch, origin: util.target.id, isBlockCode: true });
    } else {
      throw new Error("Illegal Function Name!");
    }
  }

  argumentReport(_, util) {
    return util.thread.jsExtData ? JSON.stringify(util.thread.jsExtData) : "[]";
  }

  deleteGlobalFunc(args) {
    this.globalFuncs.delete(Cast.toString(args.NAME));
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
}

module.exports = SPjavascriptV2;
