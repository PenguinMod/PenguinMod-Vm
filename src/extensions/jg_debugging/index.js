const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const xmlEscape = require('../../util/xml-escape');

const noopSwitch = { isNoop: true };

/**
 * @param {string} line The line with the quote
 * @param {number} index The point where the quote appears
 */
const isEscapedQuote = (line, index) => {
    const quote = line.charAt(index);
    if (quote !== '"') return false;
    let lastIndex = index - 1;
    let escaped = false;
    while (line.charAt(lastIndex) === "\\") {
        escaped = !escaped;
        lastIndex -= 1;
    }
    return escaped;
}
const CommandDescriptions = {
    "help": "List all commands and how to use them.\n\tSpecify a command after to only include that explanation.",
    "exit": "Closes the debugger.",
    "start": "Restarts the project like the flag was clicked.",
    "stop": "Stops the project.",
    "pause": "Pauses the project.",
    "resume": "Resumes the project.",
    "broadcast": "Starts a broadcast by name.",
    "getvar": "Gets the value of a variable by name.\n\tAdd a sprite name to specify a variable in a sprite.",
    "setvar": "Sets the value of a variable by name.\n\tAdd a sprite name to specify a variable in a sprite.",
    "getlist": "Gets the value of a list by name.\n\tReturns an array.\n\tAdd a sprite name to specify a list in a sprite.",
    "setlist": "Sets the value of a list by name.\n\tThe list will be set to the array specified.\n\tUse a sprite name as the first parameter instead to specify a list in a sprite.",
};

/**
 * Class for Debugging blocks
 * @constructor
 */
class jgDebuggingBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The console element.
         * @type {HTMLDivElement}
         */
        this.console = document.body.appendChild(document.createElement("div"));
        this.console.style = 'display: none;'
            + 'position: absolute; left: 40px; top: 40px;'
            + 'resize: both; border-radius: 8px;'
            + 'box-shadow: 0px 0px 10px black; border: 1px solid rgba(0, 0, 0, 0.15);'
            + 'background: black; font-family: monospace;'
            + 'min-height: 3rem; min-width: 128px; width: 480px; height: 480px;'
            + 'overflow: hidden; z-index: 1000000;';

        this.consoleHeader = this.console.appendChild(document.createElement("div"));
        this.consoleHeader.style = 'width: 100%; height: 2rem;'
            + 'position: absolute; left: 0px; top: 0px;'
            + 'display: flex; flex-direction: column; align-items: center;'
            + 'justify-content: center; color: white; cursor: move;'
            + 'background: #333333; z-index: 1000001; user-select: none;';
        this.consoleHeader.innerHTML = '<p>Debugger</p>';

        this.consoleLogs = this.console.appendChild(document.createElement("div"));
        this.consoleLogs.style = 'width: 100%; height: calc(100% - 3rem);'
            + 'position: absolute; left: 0px; top: 2rem;'
            + 'color: white; cursor: text; overflow: auto;'
            + 'background: transparent; outline: unset !important;'
            + 'border: 0; margin: 0; padding: 0; font-family: monospace;'
            + 'display: flex; flex-direction: column; align-items: flex-start;'
            + 'z-index: 1000005; user-select: text;';

        this.consoleBar = this.console.appendChild(document.createElement("div"));
        this.consoleBar.style = 'width: 100%; height: 1rem;'
            + 'position: absolute; left: 0px; bottom: 0px;'
            + 'display: flex; flex-direction: row;'
            + 'color: white; cursor: text; background: black;'
            + 'z-index: 1000001; user-select: none;';

        this.consoleBarInput = this.consoleBar.appendChild(document.createElement("input"));
        this.consoleBarInput.style = 'width: calc(100% - 16px); height: 100%;'
            + 'position: absolute; left: 16px; top: 0px;'
            + 'border: 0; padding: 0; margin: 0; font-family: monospace;'
            + 'color: white; cursor: text; background: black;'
            + 'z-index: 1000003; user-select: none; outline: unset !important;';
        const consoleBarIndicator = this.consoleBar.appendChild(document.createElement("div"));
        consoleBarIndicator.style = 'width: 16px; height: 100%;'
            + 'position: absolute; left: 0px; top: 0px;'
            + 'color: white; cursor: text;'
            + 'z-index: 1000002; user-select: none;';
        consoleBarIndicator.innerHTML = '>';
        consoleBarIndicator.onclick = () => {
            this.consoleBarInput.focus();
        };
        // this.consoleLogs.onclick = () => {
        //     this.consoleBarInput.focus();
        // };

        this.consoleBarInput.onkeydown = (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            if (e.key.toLowerCase() !== "enter") return;
            const command = this.consoleBarInput.value;
            this.consoleBarInput.value = "";
            this._addLog(`> ${command}`, "opacity: 0.7;");
            let parsed = {};
            try {
                parsed = this._parseCommand(command);
            } catch (err) {
                this._addLog(`${err}`, "color: red;");
                return;
            }
            console.log(parsed);
            this._runCommand(parsed);
        };

        // setup events for moving the console around
        let mouseDown = false;
        let clickDifferenceX = 0;
        let clickDifferenceY = 0;
        // let oldConsoleHeight = 480;
        this.consoleHeader.onmousedown = (e) => {
            // if (e.button === 2) {
            //     e.preventDefault();
            //     let newHeight = getComputedStyle(this.consoleHeader, null).height;
            //     if (this.console.style.height === newHeight) {
            //         newHeight = oldConsoleHeight;
            //     } else {
            //         oldConsoleHeight = this.console.style.height;
            //     }
            //     this.console.style.height = newHeight;
            //     return;
            // }
            if (e.button !== 0) return;
            mouseDown = true;
            e.preventDefault();
            const rect = this.console.getBoundingClientRect();
            clickDifferenceX = e.clientX - rect.left;
            clickDifferenceY = e.clientY - rect.top;
        };
        document.addEventListener('mousemove', (e) => {
            if (!mouseDown) {
                return;
            }
            e.preventDefault();
            this.console.style.left = `${e.clientX - clickDifferenceX}px`;
            this.console.style.top = `${e.clientY - clickDifferenceY}px`;
        });
        document.addEventListener('mouseup', (e) => {
            if (!mouseDown) {
                return;
            }
            mouseDown = false;
        });

        this._logs = [];
        this.commandSet = {};
        this.commandExplanations = {};
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgDebugging',
            name: 'Debugging',
            color1: '#878787',
            color2: '#757575',
            blocks: [
                {
                    opcode: 'openDebugger',
                    text: 'open debugger',
                    blockType: BlockType.COMMAND,
                    switches: [ noopSwitch, 'closeDebugger' ]
                },
                {
                    opcode: 'closeDebugger',
                    text: 'close debugger',
                    blockType: BlockType.COMMAND,
                    switches: [ 'openDebugger', noopSwitch ]
                },
                '---',
                {
                    opcode: 'log',
                    text: 'log [INFO]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INFO: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello!"
                        }
                    },
                    switches: [ noopSwitch, 'warn', 'error' ],
                    switchText: 'log'
                },
                {
                    opcode: 'warn',
                    text: 'warn [INFO]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INFO: {
                            type: ArgumentType.STRING,
                            defaultValue: "Warning"
                        }
                    },
                    switches: [ 'log', noopSwitch, 'error' ],
                    switchText: 'warn'
                },
                {
                    opcode: 'error',
                    text: 'error [INFO]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        INFO: {
                            type: ArgumentType.STRING,
                            defaultValue: "Error"
                        }
                    },
                    switches: [ 'log', 'warn', noopSwitch ],
                    switchText: 'error'
                },
                '---',
                {
                    opcode: 'breakpoint',
                    blockType: BlockType.COMMAND,
                }
            ]
        };
    }

    _addLog(log, style) {
        const logElement = this.consoleLogs.appendChild(document.createElement("p"));
        this._logs.push(log);
        logElement.style = 'white-space: break-spaces;';
        if (style) {
            logElement.style = `white-space: break-spaces; ${style}`;
        }
        logElement.innerHTML = xmlEscape(log);
        this.consoleLogs.scrollBy(0, 1000000);
    }
    _parseCommand(command) {
        const rawCommand = Cast.toString(command);
        const data = {
            command: '',
            args: []
        };
        let chunk = '';
        let readingCommand = true;
        let isInString = false;
        let idx = -1; // idx gets added to at the start since there a bunch of continue statemnets
        for (const letter of rawCommand.split('')) {
            idx++;
            if (readingCommand) {
                if (letter === ' ' || letter === '\t') {
                    if (chunk.length <= 0) {
                        throw new SyntaxError('No command before white-space');
                    }
                    data.command = chunk;
                    chunk = '';
                    readingCommand = false;
                    continue;
                }
                chunk += letter;
                continue;
            }
            // we are reading args
            if (!isInString) {
                if (letter !== '"') {
                    if (letter === ' ' || letter === '\t') {
                        data.args.push(chunk);
                        chunk = '';
                        continue;
                    }
                    chunk += letter;
                    continue;
                } else {
                    if (chunk.length > 0) {
                        // ex: run thing"Hello!"
                        throw new SyntaxError("Cannot prefix string argument");
                    }
                    isInString = true;
                    continue;
                }
            }
            // we are inside of a string
            if (letter === '"' && !isEscapedQuote(rawCommand, idx)) {
                isInString = false;
                data.args.push(JSON.parse(`"${chunk}"`));
                chunk = '';
            } else {
                chunk += letter;
            }
        }
        // reached end of the command
        if (isInString) throw new SyntaxError('String never terminates in command');
        if (readingCommand && chunk.length > 0) {
            data.command = chunk;
            readingCommand = false;
        } else if (chunk.length > 0) {
            data.args.push(chunk);
        }
        return data;
    }
    _runCommand(parsedCommand) {
        if (!parsedCommand) return;
        if (!parsedCommand.command) return;
        const command = parsedCommand.command;
        const args = parsedCommand.args;
        switch (command) {
            case 'help': {
                if (args.length > 0) {
                    const command = args[0];
                    let explanation = "No description defined for this command.";
                    if (command in this.commandExplanations) {
                        explanation = this.commandExplanations[command];
                    } else if (command in CommandDescriptions) {
                        explanation = CommandDescriptions[command];
                    }
                    this._addLog(`- Command: ${command}\n${explanation}`);
                    break;
                }
                const commadnDescriptions = {
                    ...this.commandExplanations,
                    ...CommandDescriptions,
                };
                let log = "";
                for (const commandName in commadnDescriptions) {
                    log += `${commandName} - ${commadnDescriptions[commandName]}\n`;
                }
                this._addLog(log);
                break;
            }
            case 'exit':
                this.closeDebugger();
                break;
            default:
                if (!(command in this.commandSet)) {
                    this._addLog(`Command "${command}" not found. Check "help" for command list.`, "color: red;");
                    break;
                }
                try {
                    this.commandSet[command](...args);
                } catch (err) {
                    this._addLog(`Error: ${err}`, "color: red;");
                }
                break;
        }
    }
    _findBlockFromId(id, target) {
        if (!target) return;
        if (!target.blocks) return;
        if (!target.blocks._blocks) return;
        const block = target.blocks._blocks[id];
        return block;
    }

    openDebugger() {
        this.console.style.display = '';
    }
    closeDebugger() {
        this.console.style.display = 'none';
    }

    log(args) {
        const text = Cast.toString(args.INFO);
        console.log(text);
        this._addLog(text);
    }
    warn(args) {
        const text = Cast.toString(args.INFO);
        console.warn(text);
        this._addLog(text, "color: yellow;");
    }
    error(args, util) {
        // create error stack
        const stack = [];
        const target = util.target;
        const thread = util.thread;
        if (thread.stackClick) {
            stack.push('clicked blocks');
        }
        const commandBlockId = thread.peekStack();
        const block = this._findBlockFromId(commandBlockId, target);
        if (block) {
            stack.push(`block ${block.opcode}`);
        } else {
            stack.push(`block ${commandBlockId}`);
        }
        const eventBlock = this._findBlockFromId(thread.topBlock, target);
        if (eventBlock) {
            stack.push(`event ${eventBlock.opcode}`);
        } else {
            stack.push(`event ${thread.topBlock}`);
        }
        stack.push(`sprite ${target.sprite.name}`);

        const text = `Error: ${Cast.toString(args.INFO)}`
            + `\n${stack.map(text => (`\tat ${text}`)).join("\n")}`;
        console.error(text);
        this._addLog(text, "color: red;");
    }

    breakpoint() {
        this.runtime.pause();
    }
}

module.exports = jgDebuggingBlocks;
