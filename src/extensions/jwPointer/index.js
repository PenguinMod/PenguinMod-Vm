const BlockType = require('../../extension-support/block-type');
const BlockShape = require('../../extension-support/block-shape');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.width = '100%'
    el.style.boxSizing = 'border-box'
    el.style.textAlign = 'center'
    return el
}

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
};

const pointerLimit = Number.MAX_SAFE_INTEGER;
let currentPointerID = 0;

const pointers = new Map();

class PointerType {
    customId = "jwPointer"

    constructor(pointerID) {
        this.pointerID = pointerID;
    }

    static create() {
        currentPointerID++;
        let id = currentPointerID;
        if (currentPointerID == pointerLimit) currentPointerID = 1; // your a madman if you achieve this

        let pointer = new PointerType(id);
        pointer.init();
        return pointer;
    }

    static toPointer(x) {
        if (x instanceof PointerType) return x;

        let num = Cast.toNumber(x);
        if (num > 0 && num <= pointerLimit) return new PointerType(num);

        return new PointerType(0);
    }

    init() {
        pointers.set(this.pointerID, null);
    }

    destroy() {
        pointers.delete(this.pointerID);
    }

    get value() {
        try {
            let value = pointers.get(this.pointerID);
            if (value === undefined) {
                return null;
            }
            return value;
        } catch (e) {
            return null;
        }
    }

    set value(value) {
        if (!pointers.has(this.pointerID)) return;
        pointers.set(this.pointerID, value);
    }

    jwArrayHandler() {
        if (!pointers.has(this.pointerID)) return "Pointer";
        if (this.value === null) return "Pointer&lt;null&gt;";
        if (this.value instanceof PointerType) return "Pointer&lt;...&gt;";
        if (this.value.jwArrayHandler) return `Pointer&lt;${this.value.jwArrayHandler()}&gt;`;
        return `Pointer&lt;${vm.jwArray.Type.display(this.value)}&gt;`;
    }

    toString() {
        return this.pointerID.toString();
    }

    toReporterContent() {
        let destroyed = !pointers.has(this.pointerID);

        let root = document.createElement('div')
        root.style.display = "flex";
        root.style.flexDirection = "column";
        root.style.maxWidth = "100%";
        let pointer = span(`Pointer | ${destroyed ? "Invalid" : this.pointerID}`);
        pointer.style.opacity = "0.5";
        root.appendChild(pointer);
        if (!destroyed) {
            let value
            try {
                if (this.value === null) {
                    value = span("null")
                } else if (this.value instanceof PointerType) {
                    value = span("(Pointer)")
                } else {
                    value = this.value.toReporterContent ? this.value.toReporterContent() : span(escapeHTML(Cast.toString(this.value)))
                }
            } catch (e) {
                value = span("(Recursive)")
            }
            value.style.maxWidth = "100%";
            value.style.overflow = "auto";
            root.appendChild(value);
        }
        return root
    }
}

const Pointer = {
    Type: PointerType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "Pointer",
        disableMonitor: true,
    },
    Argument: {
        check: ["Pointer"],
        exemptFromNormalization: true,
        neglectTypes: ["jwPointer"]
    },
    pointers
};

class Extension {
    constructor() {
        vm.jwPointer = Pointer
        vm.runtime.registerSerializer(
            "jwPointer", 
            v => [v.pointerID, pointers.has(v.pointerID)], 
            v => {
                currentPointerID = Math.max(v[0]+1, currentPointerID);
                return new Pointer.Type(v[0]);
            }
        );

        vm.runtime.on("PROJECT_START", this.destroyAll.bind(this))
    }

    getInfo() {
        return {
            id: "jwPointer",
            name: "Pointers",
            color1: "#8511d3",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS1saW5lam9pbjogcm91bmQ7IHBhaW50LW9yZGVyOiBmaWxsOyBzdHJva2Utd2lkdGg6IDE7IGZpbGw6IHJnYigxMzMsIDE3LCAyMTEpOyBzdHJva2U6IHJnYigxMDYsIDE0LCAxNjkpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDUuMjIzIDguNTMgQyA0LjczMiA4LjUzIDQuNDg4IDguNzc2IDQuNDg4IDkuMjY1IEwgNC40ODggMTAuODgyIEMgNC40ODggMTEuMjc0IDQuNzMyIDExLjQ3IDUuMjIzIDExLjQ3IEwgOC44OTggMTEuNDcgQyA5LjcwOSAxMS40NyAxMC4zNjggMTIuMTI4IDEwLjM2OCAxMi45NCBMIDEwLjM2OCAxNC40MDkgQyAxMC4zNjggMTUuMzkgMTAuODU3IDE1LjM5IDExLjgzNyAxNC40MDkgTCAxNC43NzcgMTEuNDcgQyAxNS43NTYgMTAuNDg5IDE1Ljc1NiA5LjUxMSAxNC43NzcgOC41MyBMIDExLjgzNyA1LjU5MSBDIDEwLjg1NyA0LjYxIDEwLjM2OCA0LjYxIDEwLjM2OCA1LjU5MSBMIDEwLjM2OCA3LjA2IEMgMTAuMzY4IDcuODcyIDkuNzA5IDguNTMgOC44OTggOC41MyBMIDUuMjIzIDguNTMgWiIgZmlsbD0iI2ZmZiIgc3R5bGU9InN0cm9rZS13aWR0aDogMTsiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: "create",
                    text: "create pointer",
                    ...Pointer.Block
                },
                {
                    opcode: "createC",
                    text: "create pointer",
                    blockType: BlockType.COMMAND,
                },
                {
                    opcode: "createData",
                    text: "create pointer to data [DATA]",
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "data",
                            exemptFromNormalization: true
                        }
                    },
                    ...Pointer.Block
                },
                {
                    opcode: "createDataC",
                    text: "create pointer to data [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "data",
                            exemptFromNormalization: true
                        }
                    }
                },
                "---",
                {
                    opcode: "findID",
                    text: "get pointer of ID [ID]",
                    arguments: {
                        ID: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...Pointer.Block
                },
                "---",
                {
                    opcode: "getData",
                    text: "value of [POINTER]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        POINTER: Pointer.Argument
                    }
                },
                {
                    opcode: "getID",
                    text: "ID of [POINTER]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        POINTER: Pointer.Argument
                    }
                },
                {
                    opcode: "isDestroyed",
                    text: "is [POINTER] valid?",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POINTER: Pointer.Argument
                    }
                },
                "---",
                {
                    opcode: "setData",
                    text: "set [POINTER] to [DATA]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        POINTER: Pointer.Argument,
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "data",
                            exemptFromNormalization: true
                        }
                    }
                },
                {
                    opcode: "changeData",
                    text: "change [POINTER] by [AMOUNT]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        POINTER: Pointer.Argument,
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                "---",
                {
                    opcode: "destroy",
                    text: "delete [POINTER]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        POINTER: Pointer.Argument
                    }
                },
                {
                    opcode: "destroyAll",
                    text: "delete all pointers",
                    blockType: BlockType.COMMAND
                },
                "---",
                {
                    opcode: "lastID",
                    text: "last pointer ID",
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: "isPointer",
                    text: "is [INPUT] a pointer?",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        INPUT: Pointer.Argument
                    }
                },
                ...(vm.runtime.ext_jwArray ? ["---"] : []),
                {
                    opcode: "allPointers",
                    text: "all pointers",
                    blockType: BlockType.REPORTER,
                    blockShape: BlockShape.SQUARE,
                    hideFromPalette: !vm.runtime.ext_jwArray,
                    ...(vm.jwArray ? vm.jwArray.Block : {})
                }
            ]
        }
    }

    create() {
        return Pointer.Type.create();
    }

    createC() {
        Pointer.Type.create();
    }

    createData({DATA}) {
        let pointer = Pointer.Type.create();
        pointer.value = DATA;
        return pointer;
    }

    createDataC({DATA}) {
        Pointer.Type.create().value = DATA;
    }

    findID({ID}) {
        ID = Cast.toNumber(ID);
        if (!pointers.has(ID)) return new Pointer.Type(0);
        return new Pointer.Type(ID);
    }

    getData({POINTER}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        return POINTER.value;
    }

    getID({POINTER}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        return POINTER.pointerID;
    }

    isDestroyed({POINTER}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        return pointers.has(POINTER.pointerID);
    }

    setData({POINTER, DATA}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        POINTER.value = DATA;
    }

    changeData({POINTER, AMOUNT}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        AMOUNT = Cast.toNumber(AMOUNT);

        POINTER.value = Cast.toNumber(POINTER.value) + AMOUNT;
    }

    destroy({POINTER}) {
        POINTER = Pointer.Type.toPointer(POINTER);
        POINTER.destroy();
    }

    destroyAll() {
        pointers.clear();
    }

    lastID() {
        return currentPointerID;
    }

    isPointer({INPUT}) {
        return INPUT instanceof Pointer.Type
    }

    allPointers() {
        if (!vm.jwArray) return 0;
        let array = Array.from(pointers.keys()).map(v => new Pointer.Type(v));
        return vm.jwArray.Type.toArray(array);
    }
}

module.exports = Extension;
