const BlockType = require("../../extension-support/block-type");
const ArgumentType = require("../../extension-support/argument-type");
const SandboxRunner = require("../../util/sandboxed-javascript-runner");
const Cast = require("../../util/cast");

let isScratchBlocksReady = typeof ScratchBlocks === "object";
const codeEditorHandlers = new Map();
if (isScratchBlocksReady) {
  /* add our custom input */
  window.addEventListener("message", (e) => {
    if (e.data?.type === "code-change") {
      const handler = codeEditorHandlers.get(e.data.id);
      if (handler) handler(e.data.value);
    }
  });

  const recyclableDiv = document.createElement("div");
  recyclableDiv.style.marginTop = "-2px";
  recyclableDiv.style.width = "300px";
  recyclableDiv.style.height = "200px";

  ScratchBlocks.FieldCustom.registerInput(
    "SPjavascriptV2-codeEditor",
    recyclableDiv,
    (field, input) => {
      /* on init */
      const isLightMode = document.body.getAttribute("theme") === "light";
      const outerID = field.sourceBlock_.id;

      const iframe = document.createElement("iframe");
      iframe.setAttribute("style", `width: 100%; height: 100%; border: none;`);
      input.appendChild(iframe);
      iframe.onload = () => {
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(`
<!DOCTYPE html>
<html>
<head><style>#editor,body,html{margin:0;padding:0;height:100%;width:100%}</style></head>
<body>
  <div id=editor></div>
  <script>
    window.addEventListener("message", function(e) {
      /*
        Import the "brace" library (ace editor fork) and other necessary modules
        this is used by our custom input
      */
      const ace = parent.require("brace");
      require("brace/mode/javascript");
      require("brace/theme/monokai");
      require("brace/theme/solarized_light");

      const { value, theme } = e.data;
      const editor = ace.edit("editor");
      editor.getSession().setMode("ace/mode/javascript");
      editor.setTheme(theme);
      editor.setValue(value || "", -1);

      editor.getSession().on("change", () => {
        parent.postMessage({
          type: "code-change",
          id: "${outerID}",
          value: editor.getValue()
        }, "*");
      });
    }, { once: true });
  </script>
</body>
</html>
        `);
        doc.close();

        iframe.contentWindow.postMessage({
          value: field.getValue(),
          theme: isLightMode ? "ace/theme/solarized_light" : "ace/theme/monokai"
        }, "*");
      };

      // Listen for code updates
      codeEditorHandlers.set(outerID, (value) => field.setValue(value));
    },
    () => { /* no work need to be done here */ },
    () => { /* no work need to be done here */ }
  );
}

class SPjavascriptV2 {
  constructor(runtime) {
    this.runtime = runtime;
    this.isEditorUnsandboxed = false;

    this.runtime.vm.on("workspaceUpdate", () => {
      codeEditorHandlers.clear();
      if (!isScratchBlocksReady) isScratchBlocksReady = typeof ScratchBlocks === "object";
    });
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
        /* shown if ScratchBlocks is not availiable */
        {
          opcode: "jsCommand",
          text: "run [CODE]",
          blockType: BlockType.COMMAND,
          hideFromPalette: !isScratchBlocksReady,
          arguments: {
            CODE: { type: ArgumentType.STRING, defaultValue: `alert("Hello!")` }
          }
        },
        {
          opcode: "jsReporter",
          text: "run [CODE]",
          blockType: BlockType.REPORTER,
          disableMonitor: true,
          hideFromPalette: !isScratchBlocksReady,
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
          hideFromPalette: !isScratchBlocksReady,
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
          hideFromPalette: isScratchBlocksReady,
          arguments: {
            CODE: {
              type: ArgumentType.CUSTOM, id: "SPjavascriptV2-codeEditor",
              defaultValue: `alert(FOO);`
            },
            ARGS: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: `{ "FOO": "bar" }`,
              exemptFromNormalization: true
            }
          }
        },
        {
          opcode: "jsReporterBinded",
          text: "run [CODE]",
          blockType: BlockType.REPORTER,
          disableMonitor: true,
          hideFromPalette: isScratchBlocksReady,
          arguments: {
            CODE: {
              type: ArgumentType.CUSTOM, id: "SPjavascriptV2-codeEditor",
              defaultValue: `STRING + Math.random()`
            },
            ARGS: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: `{ "STRING": "output: " }`,
              exemptFromNormalization: true
            }
          }
        },
        {
          opcode: "jsBooleanBinded",
          text: "run [CODE]",
          blockType: BlockType.BOOLEAN,
          disableMonitor: true,
          hideFromPalette: isScratchBlocksReady,
          arguments: {
            CODE: {
              type: ArgumentType.CUSTOM, id: "SPjavascriptV2-codeEditor",
              defaultValue: `Math.random() > THRESHOLD`
            },
            ARGS: {
              type: Scratch.ArgumentType.STRING,
              defaultValue: `{ "THRESHOLD": 0.5 }`,
              exemptFromNormalization: true
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
      if (typeof argJSON === "object" && !Array.isArray(argJSON)) return argJSON;
      else return JSON.parse(argJSON);
    } catch(err) {
      console.warn(`Failed to parse Javascript Data JSON: ${err}`);
      return {};
    }
  }

  runCode(code, binds) {
    let binders = "";
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
        result = eval(binders + code);
      } catch (err) {
        result = err;
      }
      return result;
    }
    // we are sandboxed
    return new Promise((resolve) => {
      SandboxRunner.execute(binders + code).then(result => {
        // result is { value: any, success: boolean }
        // in PM, we always ignore errors
        return resolve(result.value);
      });
    });
  }

  // block funcs
  jsCommand(args) {
    this.runCode(Cast.toString(args.CODE));
  }
  jsCommandBinded(args) {
    this.runCode(
      Cast.toString(args.CODE),
      this.parseArguments(args.ARGS)
    );
  }

  jsReporter(args) {
    return this.runCode(Cast.toString(args.CODE));
  }
  jsReporterBinded(args) {
    return this.runCode(
      Cast.toString(args.CODE),
      this.parseArguments(args.ARGS)
    );
  }

  jsBoolean(args) {
    const possiblePromise = this.runCode(Cast.toString(args.CODE));
    /* force output a boolean */
    if (possiblePromise && typeof possiblePromise.then === "function") {
      return (async () => {
        const value = await possiblePromise;
        return Cast.toBoolean(value);
      })();
    }
    return Cast.toBoolean(possiblePromise);
  }
  jsBooleanBinded(args) {
    const possiblePromise = this.runCode(
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
}

module.exports = SPjavascriptV2;
