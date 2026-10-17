const BlockType = require('../../../extension-support/block-type')
const BlockShape = require('../../../extension-support/block-shape')
const ArgumentType = require('../../../extension-support/argument-type')
const Cast = require('../../../util/cast')

const createElement = (type, properties = {}, parent) => {
    const el = document.createElement(type);
    Object.entries(properties).forEach(([k, v]) => el[k] = v);
    if (parent) parent.appendChild(el);
    return el;
}

const style = `
.jwDebugger-root {
    display: flex;
    flex-direction: column;
    padding: 1em;
    height: 100%;
    gap: 1em;
}

.jwDebugger-bar {
    display: flex;
    justify-content: flex-end;
    gap: 0.5em;
}

.jwDebugger-bar button {
    border: none;
    background-color: var(--looks-secondary);
    color: #fff;
    padding: 0.25em 0.5em;
    border-radius: 0.25em;
    margin-right: auto;
}

.jwDebugger-bar input[type="checkbox"] {
    width: 1em;
}
.jwDebugger-bar input[type="checkbox"].jwDebugger-debug { accent-color: #19f; }
.jwDebugger-bar input[type="checkbox"].jwDebugger-log { accent-color: #888; }
.jwDebugger-bar input[type="checkbox"].jwDebugger-warn { accent-color: #fa1; }
.jwDebugger-bar input[type="checkbox"].jwDebugger-error { accent-color: #f13; }

.jwDebugger-list {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    border: 1px solid var(--ui-black-transparent);
    border-radius: 8px;
    background-color: var(--ui-modal-background);
    overflow-y: scroll;
    height: 0px; /* this fixes it scaling weirdly dont ask me how lmao */
}

.jwDebugger-list > * {
    padding: 0.5em;
    display: flex;
    overflow-x: auto;
    flex-shrink: 0;
}

.jwDebugger-list > .jwDebugger-debug { background-color: #19f5; }
.jwDebugger-list > .jwDebugger-log { background-color: #8882; }
.jwDebugger-list > .jwDebugger-warn { background-color: #fa15; }
.jwDebugger-list > .jwDebugger-error { background-color: #f135; }

.jwDebugger-list:not(.jwDebugger-debugShow) > .jwDebugger-debug { display: none; }
.jwDebugger-list:not(.jwDebugger-logShow) > .jwDebugger-log { display: none; }
.jwDebugger-list:not(.jwDebugger-warnShow) > .jwDebugger-warn { display: none; }
.jwDebugger-list:not(.jwDebugger-errorShow) > .jwDebugger-error { display: none; }

.jwDebugger-timestamp {
    font-size: 0.75em;
    opacity: 0.5;
    padding-right: 0.5em;
    padding-top: 0.125em;
    padding-bottom: 0.125em;
}

.jwDebugger-bubble {
    background-color: var(--ui-modal-background);
    padding: 4px;
    border: 1px solid var(--ui-black-transparent);
    border-radius: 4px;
    box-sizing: border-box;
}
`

const LOG_LIMIT = 1000;

class Extension {
    constructor() {
        this.tab = vm.runtime.tabManager.register("jwDebugger", "debugger", "Debugger", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPHBhdGggZD0iTSAxNS41IDExLjUgQyAxNS41IDE0LjUzOCAxMy4wMzggMTcgMTAgMTcgQyA2Ljk2MiAxNyA0LjUgMTQuNTM4IDQuNSAxMS41IEMgNC41IDkuOTA4IDUuMTc2IDguNDc1IDYuMjU3IDcuNDcgQyA2LjMzNSA3LjQ4OSA2LjQxNiA3LjUgNi41IDcuNSBMIDEzLjUgNy41IEMgMTMuNTg0IDcuNSAxMy42NjUgNy40OSAxMy43NDMgNy40NyBDIDE0LjgyNCA4LjQ3NCAxNS41IDkuOTA4IDE1LjUgMTEuNSBaIiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAxOyI+PC9wYXRoPgogIDxwYXRoIGQ9Ik0gMTAgMyBDIDExLjkzMyAzIDEzLjUgNC41NjcgMTMuNSA2LjUgTCA2LjUgNi41IEMgNi41IDQuNTY3IDguMDY3IDMgMTAgMyBaIiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAycHg7Ij48L3BhdGg+CiAgPHBhdGggc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgZmlsbDogbm9uZTsgc3Ryb2tlOiByZ2IoMCwgMCwgMCk7IiBkPSJNIDMuNSAxMS41IEwgNC41IDExLjUiPjwvcGF0aD4KICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigwLCAwLCAwKTsiIGQ9Ik0gMTUuNSAxMS41IEwgMTYuNSAxMS41Ij48L3BhdGg+CiAgPHBhdGggc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgdHJhbnNmb3JtLW9yaWdpbjogMTBweCAxMS41cHg7IGZpbGw6IG5vbmU7IHN0cm9rZTogcmdiKDAsIDAsIDApOyIgZD0iTSAzLjUgMTEuNSBMIDQuNSAxMS41IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjAyNSwgLTAuNSwgMC41LCAwLjg2NjAyNSwgMCwgMCkiPjwvcGF0aD4KICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDE7IHRyYW5zZm9ybS1vcmlnaW46IDEwcHggMTEuNXB4OyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigwLCAwLCAwKTsiIGQ9Ik0gMTUuNSAxMS41IEwgMTYuNSAxMS41IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjAyNSwgLTAuNSwgMC41LCAwLjg2NjAyNSwgMCwgMCkiPjwvcGF0aD4KICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDE7IHRyYW5zZm9ybS1vcmlnaW46IDEwcHggMTEuNXB4OyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigwLCAwLCAwKTsiIGQ9Ik0gMy41IDExLjUgTCA0LjUgMTEuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NjYwMjUsIDAuNSwgLTAuNSwgMC44NjYwMjUsIDAsIDApIj48L3BhdGg+CiAgPHBhdGggc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAxOyB0cmFuc2Zvcm0tb3JpZ2luOiAxMHB4IDExLjVweDsgZmlsbDogbm9uZTsgc3Ryb2tlOiByZ2IoMCwgMCwgMCk7IiBkPSJNIDE1LjUgMTEuNSBMIDE2LjUgMTEuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NjYwMjYsIDAuNSwgLTAuNSwgMC44NjYwMjYsIDAsIDApIj48L3BhdGg+Cjwvc3ZnPg==");
        this.rootElement = createElement('div', {className: "jwDebugger-root"});
        this.tab.setDOM(this.rootElement);
        createElement('style', {innerHTML: style}, document.head);

        this.visibleLogs = {
            debug: false,
            log: true,
            warn: true,
            error: true
        }

        this.barElement = createElement('div', {className: "jwDebugger-bar"}, this.rootElement);
        createElement('button', {
            innerText: "Clear"
        }, this.barElement).addEventListener("click", e => {
            this.listElement.innerHTML = "";
        });

        this.checkboxes = {
            debug: createElement('input', {type: "checkbox", className: "jwDebugger-debug"}, this.barElement),
            log: createElement('input', {type: "checkbox", className: "jwDebugger-log"}, this.barElement),
            warn: createElement('input', {type: "checkbox", className: "jwDebugger-warn"}, this.barElement),
            error: createElement('input', {type: "checkbox", className: "jwDebugger-error"}, this.barElement)
        }
        for (let [k, v] of Object.entries(this.checkboxes)) {
            v.addEventListener('change', e => {
                if (this.visibleLogs[k] !== v.checked) {
                    this.visibleLogs[k] = v.checked;
                    this._updateState();
                }
            })
        }

        this.listElement = createElement('div', {className: "jwDebugger-list"}, this.rootElement);
        this._updateState();

        vm.extensionManager.extendCompiler("jwDebugger", this.extendCompiler.bind(this));
    }

    _updateState() {
        this.listElement.className = "jwDebugger-list"
            + (this.visibleLogs.debug ? " jwDebugger-debugShow" : "")
            + (this.visibleLogs.log ? " jwDebugger-logShow" : "")
            + (this.visibleLogs.warn ? " jwDebugger-warnShow" : "")
            + (this.visibleLogs.error ? " jwDebugger-errorShow" : "");

        for (let [k, v] of Object.entries(this.checkboxes)) {
            v.checked = this.visibleLogs[k];
        }
    }

    serialize() {
        return this.visibleLogs;
    }

    deserialize(data) {
        this.visibleLogs = data;
        this._updateState();
    }

    getInfo() {
        return {
            id: "jwDebugger",
            name: "Debugger",
            color: "#29BEB8",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYig0MSwgMTkwLCAxODQpOyBzdHJva2U6IHJnYig1MSwgMTQwLCAxMzcpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8ZyBzdHlsZT0iIiB0cmFuc2Zvcm09Im1hdHJpeCgwLjc3NDU3OSwgMCwgMCwgMC43NzQ1NzksIDIuMjU0MjEsIDIuMjU0MjEpIj4KICAgIDxwYXRoIGQ9Ik0gMTUuNSAxMS41IEMgMTUuNSAxNC41MzggMTMuMDM4IDE3IDEwIDE3IEMgNi45NjIgMTcgNC41IDE0LjUzOCA0LjUgMTEuNSBDIDQuNSA5LjkwOCA1LjE3NiA4LjQ3NSA2LjI1NyA3LjQ3IEMgNi4zMzUgNy40ODkgNi40MTYgNy41IDYuNSA3LjUgTCAxMy41IDcuNSBDIDEzLjU4NCA3LjUgMTMuNjY1IDcuNDkgMTMuNzQzIDcuNDcgQyAxNC44MjQgOC40NzQgMTUuNSA5LjkwOCAxNS41IDExLjUgWiIgc3R5bGU9InN0cm9rZS13aWR0aDogMTsgZmlsbDogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9wYXRoPgogICAgPHBhdGggZD0iTSAxMCAzIEMgMTEuOTMzIDMgMTMuNSA0LjU2NyAxMy41IDYuNSBMIDYuNSA2LjUgQyA2LjUgNC41NjcgOC4wNjcgMyAxMCAzIFoiIHN0eWxlPSJzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDJweDsgZmlsbDogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9wYXRoPgogICAgPHBhdGggc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgZmlsbDogbm9uZTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IHRyYW5zZm9ybS1ib3g6IGZpbGwtYm94OyB0cmFuc2Zvcm0tb3JpZ2luOiA1MCUgNTAlOyIgZD0iTSAzLjUgMTEuNSBMIDQuNSAxMS41Ij48L3BhdGg+CiAgICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgdHJhbnNmb3JtLWJveDogZmlsbC1ib3g7IHRyYW5zZm9ybS1vcmlnaW46IDUwJSA1MCU7IiBkPSJNIDE1LjUgMTEuNSBMIDE2LjUgMTEuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMSwgMCwgMCwgMSwgMCwgMC4wMDAwMDMpIj48L3BhdGg+CiAgICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgdHJhbnNmb3JtLW9yaWdpbjogMTBweCAxMS41cHg7IiBkPSJNIDMuNSAxMS41IEwgNC41IDExLjUiIHRyYW5zZm9ybT0ibWF0cml4KDAuODY2MDI1LCAtMC41LCAwLjUsIDAuODY2MDI1LCAwLCAwKSI+PC9wYXRoPgogICAgPHBhdGggc3R5bGU9InN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAxOyBmaWxsOiBub25lOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgdHJhbnNmb3JtLW9yaWdpbjogMTBweCAxMS41cHg7IiBkPSJNIDE1LjUgMTEuNSBMIDE2LjUgMTEuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NjYwMjUsIC0wLjUsIDAuNSwgMC44NjYwMjUsIDAsIDApIj48L3BhdGg+CiAgICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDE7IGZpbGw6IG5vbmU7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyB0cmFuc2Zvcm0tb3JpZ2luOiAxMHB4IDExLjVweDsiIGQ9Ik0gMy41IDExLjUgTCA0LjUgMTEuNSIgdHJhbnNmb3JtPSJtYXRyaXgoMC44NjYwMjUsIDAuNSwgLTAuNSwgMC44NjYwMjUsIDAsIDApIj48L3BhdGg+CiAgICA8cGF0aCBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDE7IGZpbGw6IG5vbmU7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyB0cmFuc2Zvcm0tb3JpZ2luOiAxMHB4IDExLjVweDsiIGQ9Ik0gMTUuNSAxMS41IEwgMTYuNSAxMS41IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjg2NjAyNSwgMC41LCAtMC41LCAwLjg2NjAyNSwgMCwgMCkiPjwvcGF0aD4KICA8L2c+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: "log",
                    text: "[LOG] [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LOG: {
                            menu: "logOption",
                            defaultValue: "log"
                        },
                        DATA: {
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: "clear",
                    text: "clear logs",
                    blockType: BlockType.COMMAND
                },
                "---",
                {
                    opcode: "breakpoint",
                    text: "breakpoint",
                    blockType: BlockType.COMMAND
                }
            ],
            menus: {
                logOption: {
                    acceptReporters: false,
                    items: [
                        "debug",
                        "log",
                        "warn",
                        "error"
                    ]
                }
            }
        };
    }

    extendCompiler({IntermediateStackBlock, InputOpcode}) {
        const opcodes = {
            BREAKPOINT: 'jwDebugger.breakpoint'
        }

        return {
            ir: {
                command(block) {
                    switch (block.opcode) {
                        case 'jwDebugger_breakpoint':
                            return new IntermediateStackBlock(opcodes.BREAKPOINT, {}, true);
                    }
                }
            },
            js: {
                command(block) {
                    switch (block.opcode) {
                        case opcodes.BREAKPOINT:
                            this.source += 'runtime.pause();\n';
                            this.source += 'yield;\n';
                            return true;
                    }
                }
            }
        }
    }

    log({LOG, DATA}) {
        const now = new Date(Date.now())
        const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`

        let log = createElement('div', {
            className: `jwDebugger-${LOG}`
        }, this.listElement);
        createElement('span', {
            className: 'jwDebugger-timestamp',
            innerText: timestamp
        }, log);
        if (DATA === null || DATA === undefined) {
            createElement('span', {
                innerHTML: '<i style="opacity: 0.75;">null</i>'
            }, log);
        } else if (typeof DATA === 'object' && ![null, Object.prototype].includes(Object.getPrototypeOf(DATA)) && DATA.toReporterContent) {
            createElement('span', {
                className: 'jwDebugger-bubble'
            }, log).appendChild(DATA.toReporterContent());
        } else {
            createElement('span', {
                innerText: String(DATA)
            }, log);
        }

        if (this.listElement.children.length > LOG_LIMIT) {
            this.listElement.removeChild(this.listElement.children[0]);
        }
    }

    clear() {
        this.listElement.innerHTML = '';
    }
}

module.exports = Extension;