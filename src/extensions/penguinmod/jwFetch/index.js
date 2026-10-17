const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

let dogeiscutObject = {
    Type: class {},
    Block: {},
    Argument: {}
};

class Extension {
    constructor() {
        vm.extensionManager.addExtensionDependency("jwFetch", "dogeiscutObject", () => dogeiscutObject = vm.dogeiscutObject);

        vm.extensionManager.extendCompiler("jwFetch", this.extendCompiler.bind(this));
    }

    getInfo() {
        return {
            id: "jwFetch",
            name: "Requests",
            color: "#42b0f5",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYig2NiwgMTc2LCAyNDUpOyBzdHJva2U6IHJnYig1MywgMTQxLCAxOTYpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDMuOTMgMTAgQyAzLjkzIDE0LjY3MyA4Ljk4OSAxNy41OTMgMTMuMDM1IDE1LjI1NyBDIDE0LjkxMyAxNC4xNzMgMTYuMDcgMTIuMTY4IDE2LjA3IDEwIEMgMTYuMDcgNS4zMjcgMTEuMDExIDIuNDA2IDYuOTY1IDQuNzQzIEMgNS4wODcgNS44MjcgMy45MyA3LjgzIDMuOTMgMTAgTSAxMCAzLjkzIEwgMTAgMTYuMDcgQyAxNC4wNDcgMTIuMDIzIDE0LjA0NyA3Ljk3NiAxMCAzLjkzIEMgNS45NTMgNy45NzYgNS45NTMgMTIuMDIzIDEwIDE2LjA3IE0gMTYuMDcgMTAgTCAzLjkzIDEwIE0gMTQuODU2IDEzLjY0MiBDIDExLjYxOCAxMi4wMjMgOC4zODIgMTIuMDIzIDUuMTQ0IDEzLjY0MiBNIDE0Ljg1NiA2LjM1OCBDIDExLjYxOCA3Ljk3NiA4LjM4MiA3Ljk3NiA1LjE0NCA2LjM1OCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiIHN0eWxlPSJzdHJva2Utd2lkdGg6IDE7IHN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: "fetch",
                    text: "[METHOD] [URL] with headers [HEADERS]",
                    dualBlock: true,
                    arguments: {
                        METHOD: {
                            menu: "methods",
                            defaultValue: "GET"
                        },
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://projects.penguinmod.com/api/v1"
                        },
                        HEADERS: dogeiscutObject.Argument
                    },
                    ...dogeiscutObject.Block
                },
                {
                    opcode: "fetchBody",
                    text: "[METHOD] [URL] with headers [HEADERS] and body [BODY]",
                    dualBlock: true,
                    arguments: {
                        METHOD: {
                            menu: "methodsBody",
                            defaultValue: "POST"
                        },
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://projects.penguinmod.com/api/v1"
                        },
                        HEADERS: dogeiscutObject.Argument,
                        BODY: {
                            type: ArgumentType.STRING
                        }
                    },
                    ...dogeiscutObject.Block
                },
                "---",
                {
                    opcode: "canFetch",
                    text: "request to fetch [URL]",
                    blockType: BlockType.BOOLEAN,
                    dualBlock: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://projects.penguinmod.com/api/v1"
                        }
                    }
                }
            ],
            menus: {
                methods: {
                    acceptReporters: true,
                    items: [
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "HEAD",
                        "OPTIONS",
                        "TRACE",
                        // "CONNECT", i dont know if this actually works
                    ]
                },
                methodsBody: {
                    acceptReporters: true,
                    items: [
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                    ]
                }
            }
        };
    }

    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            FETCH: 'jwFetch.fetch',
            CAN_FETCH: 'jwFetch.canFetch'
        };

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwFetch_fetch':
                        case 'jwFetch_fetchBody':
                            return new IntermediateInput(opcodes.FETCH, InputType.CUSTOM_TYPE, {
                                method: this.descendInputOfBlock(block, 'METHOD').toType(InputType.STRING),
                                url: this.descendInputOfBlock(block, 'URL').toType(InputType.STRING),
                                headers: this.descendInputOfBlock(block, 'HEADERS'),
                                body: block.opcode === 'jwFetch_fetchBody' ? this.descendInputOfBlock(block, 'BODY') : this.createConstantInput(null)
                            }, true);
                        case 'jwFetch_canFetch':
                            return new IntermediateInput(opcodes.CAN_FETCH, InputType.BOOLEAN, {
                                url: this.descendInputOfBlock(block, 'URL').toType(InputType.STRING)
                            }, true);
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwFetch_fetch':
                        case 'jwFetch_fetchBody':
                            return new IntermediateStackBlock(opcodes.FETCH, {
                                method: this.descendInputOfBlock(block, 'METHOD').toType(InputType.STRING),
                                url: this.descendInputOfBlock(block, 'URL').toType(InputType.STRING),
                                headers: this.descendInputOfBlock(block, 'HEADERS'),
                                body: block.opcode === 'jwFetch_fetchBody' ? this.descendInputOfBlock(block, 'BODY').toType(InputType.STRING) : this.createConstantInput(null)
                            }, true);
                        case 'jwFetch_canFetch':
                            return new IntermediateStackBlock(opcodes.CAN_FETCH, {
                                url: this.descendInputOfBlock(block, 'URL').toType(InputType.STRING)
                            }, true);
                    }
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.FETCH:
                            return `(yield* vm.runtime.ext_jwFetch._fetch(thread, ${this.descendInput(node.method)}, ${this.descendInput(node.url)}, vm.dogeiscutObject.Type.toObject(${this.descendInput(node.headers)}), ${this.descendInput(node.body)}))`;
                        case opcodes.CAN_FETCH:
                            return `(yield* vm.runtime.ext_jwFetch._canFetch(thread, ${this.descendInput(node.url)}))`;
                    }
                },
                command(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.FETCH:
                            this.source += `yield* vm.runtime.ext_jwFetch._fetch(thread, ${this.descendInput(node.method)}, ${this.descendInput(node.url)}, vm.dogeiscutObject.Type.toObject(${this.descendInput(node.headers)}), ${this.descendInput(node.body)}, true);\n`;
                            return true;
                        case opcodes.CAN_FETCH:
                            this.source += `yield* vm.runtime.ext_jwFetch._canFetch(thread, ${this.descendInput(node.url)}, true);\n`;
                            return true;
                    }
                }
            }
        };
    }

    _waitPromise = function*(thread, promise) {
        let returnValue;
        let isError = false;
        thread.status = 1;
        promise
            .then(value => {
                thread.status = 0;
                returnValue = value;
            }, error => {
                thread.status = 0;
                returnValue = error;
                isError = true;
            });
        yield;
        if (isError) throw returnValue;
        return returnValue;
    }

    _fetch = function*(thread, method, url, headers, body, strict = false) {
        yield* this._canFetch(thread, url, true);
        return yield* this._waitPromise(thread, (async function() {
            const startTime = Date.now();
            const response = await fetch(url, {
                method: method.toUpperCase(),
                headers: headers.toJSON(),
                body: body === '' ? null : body
            });
            if (strict) {
                if (!response.ok) throw `Request ${url} returned status ${response.status}`;
            }

            return vm.dogeiscutObject.Type.toObject({
                status: response.status,
                ok: response.ok,
                redirected: response.redirected,
                time: (Date.now() - startTime) / 1000,
                body: await response.text(),
                headers: vm.dogeiscutObject.Type.toObject(Object.fromEntries(response.headers.entries())),
                url: response.url
            });
        })());
    }

    _canFetch = function*(thread, url, strict = false) {
        return yield* this._waitPromise(thread, (async function() {
            let output = await vm.securityManager.canFetch(url);
            if (strict && !output) {
                throw `Permission to fetch ${url} denied.`;
            }
            return output;
        })());
    }
}

module.exports = Extension;