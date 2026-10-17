/**
 * This is where we import the 'ace' code editor and
 * create a custom code-input for blocks.
 */

/** Required Packages */
const ACE_URL = "https://cdn.jsdelivr.net/npm/ace-builds@1.32.3/src-min-noconflict/";
const ACE_PACKAGES = [
    "ace.js",
    "ext-language_tools.js",
    "mode-javascript.js",
    "theme-monokai.js"
];

/**
 * Import all required ace packages.
 */
let aceInstalled = false;
let installQueue = [];

const importAcePackages = async function () {
    let installedPackages = 0;

    const packageLoadCallback = () => {
        installedPackages++;

        // Wait for all packages to be installed.
        if (installedPackages === ACE_PACKAGES.length) {
            aceInstalled = true;
            installQueue.forEach(resolve => resolve);
        }
    };

    for (const packageName of ACE_PACKAGES) {
        const script = document.createElement("script");
        script.src = ACE_URL + packageName;
        script.async = false;
        script.onload = packageLoadCallback;
        document.body.appendChild(script);
    }
};

/**
 * Waits for Ace to be fully installed.
 */
const waitForAce = async function () {
    if (!aceInstalled) await new Promise((resolve) => {
        installQueue.push(resolve);
    });
};

/** ScratchBlocks input setup */
const SECRET_BLOCK_KEY = "needsInit-1@#4%^7*(0";
const MAX_EDITOR_WIDTH = 150;
const MAX_EDITOR_HEIGHT = 100;
const EDITOR_OPTIONS = {
    fontSize: "15px",
    showPrintMargin: false,
    highlightActiveLine: true,
    useWorker: false,
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: true
};

let autocompleteExtrasCallback = () => [];

/**
 * Sets the callback used by the autocompletion generator.
 *
 * @param {Function} callback
 */
const setAutocompleteExtrasCallback = (callback) => {
    autocompleteExtrasCallback = callback;
}

// Since code inputs are shadows, we cant hardcode the value from the parent
// block in an extension, we use this to initialize a default value.
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

/**
 * Import autocompletion in our editors as well as add our
 * own custom completor to the editor so the user can directly
 * access Scratch internals such as the vm, blockly, and more.
 */
let langToolsNeedsInit = true;
const importAceAutoComplete = () => {
    // Ace should be fully loaded by the time this runs.
    if (langToolsNeedsInit) {
        langToolsNeedsInit = false;
        const langTools = ace.require("ace/ext/language_tools");

        // Custom autocomplete
        const ScratchContextCompleter = {
            getCompletions: function(editor, session, pos, prefix, callback) {
                const line = session.getLine(pos.row).slice(0, pos.column - prefix.length);
                const matches = line.match(/([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*)\.$/);
                const chain = matches ? matches[1].split(".") : [];

                let current = window;
                for (const segment of chain) {
                    if (current && current[segment]) {
                        current = current[segment];
                    } else {
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
                    list.push(...autocompleteExtrasCallback());
                    list.push("vm");
                    list.push("sprite");
                    list.push("target");
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

/**
 * Initializes the code editor input.
 */
const initCodeInput = async function () {
    importAcePackages();

    // Element reused by the custom input api
    const recyclableDiv = document.createElement("div");
    recyclableDiv.setAttribute("style", `display: flex; justify-content: center; padding-top: 10px; width: 250px; height: 100px;`);

    const unloadedEditor = document.createElement("div");
    unloadedEditor.setAttribute("style", "background: #272822; border-radius: 10px; border: none; width: 100%; height: calc(100% - 20px);");
    recyclableDiv.appendChild(unloadedEditor);

    const resizeHandleCSS = "position: absolute; right: 5px; bottom: 15px; width: 12px; height: 12px; background: #ffffff40; cursor: se-resize; border-radius: 0px 0 50px 0; z-index: 999;";

    // Register our code input.
    const ScratchBlocks = window.ScratchBlocks; // This will inevitably be called by a built-in extension. Which does not have direct access to the GUI.
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
            importAceAutoComplete();

            const editor = ace.edit(editorId);
            editor.setOptions(EDITOR_OPTIONS);

            editor.session.setMode("ace/mode/javascript");
            editor.setTheme("ace/theme/monokai");
            editor.setOption("hasCssTransforms", true);
            editor.session.on("change", () => field.setValue(editor.getValue()));

            const defaultValue = getDefaultValue(field, parent);
            field.setValue(defaultValue);
            editor.setValue(defaultValue);
            editor.clearSelection();

            // Blockly will prevent us from focusining on our textarea
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

            // Add a editor resizing button.
            const resizeHandle = document.createElement("div");
            resizeHandle.setAttribute("style", resizeHandleCSS + `pointer-events: ${isDraggable ? "none" : "all"}`);
            input.appendChild(resizeHandle);

            resizeHandle.addEventListener("mousedown", (e) => {
                if (parent.isInFlyout) return;

                e.preventDefault();
                editor.blur();
                ScratchBlocks.mainWorkspace.allowDragging = false;
                parent.setMovable(false);
                input.removeEventListener("mouseleave", unfocusListener);

                let isResizing = true;
                let startX = e.clientX;
                let startY = e.clientY;
                let startW = input.offsetWidth;
                let startH = input.offsetHeight;

                function onMouseMove(ev) {
                    if (!isResizing) return;

                    const newW = Math.max(MAX_EDITOR_WIDTH, startW + (ev.clientX - startX));
                    const newH = Math.max(MAX_EDITOR_HEIGHT, startH + (ev.clientY - startY));

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
                    input.style.pointerEvents = "all";
                    isResizing = false;
                    ScratchBlocks.mainWorkspace.allowDragging = true;
                    parent.setMovable(true);
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                }

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });

            // Monkey patch this method since we would otherwise have to use MutationObservers.
            // Since we would have to use multiple observers, it will lag the editor. This patch
            // fixes dragged blocks from being 'dropped' when the mouse hovers over the code editor.
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

                return ogSetAtt.call(parent.svgGroup_, ...args);
            }
        },
        () => { /* no work needs to be done here */ },
        () => { /* no work needs to be done here */ }
    );
}

module.exports = {
    initCodeInput,
    setAutocompleteExtrasCallback,
};
