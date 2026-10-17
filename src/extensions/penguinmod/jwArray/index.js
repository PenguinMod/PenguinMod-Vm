const ArgumentType = require('../../../extension-support/argument-type');
const BlockShape = require('../../../extension-support/block-shape');
const BlockType = require('../../../extension-support/block-type');
const ImageURI = require('../../../extension-support/image-uri');
const Cast = require('../../../util/cast');
const pmSymbol = require('../../../util/symbol.js');

let arrayLimit = 2 ** 32 - 1;

/**
* @param {number} x
* @returns {string}
*/
function formatNumber(x) {
    if (x >= 1e6) {
        return x.toExponential(4);
    } else {
        x = Math.floor(x * 1000) / 1000;
        return x.toFixed(Math.min(3, (String(x).split('.')[1] || '').length));
    }
}

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

function clampIndex(x) {
    return Math.min(Math.max(Math.floor(x), 0), arrayLimit);
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

function isObject(x) {
    return x !== null && typeof x === "object" && [null, Object.prototype].includes(Object.getPrototypeOf(x));
}

function isPlainObject(value) {
    if (typeof value !== 'object' || value === null) {
        return false
    }

    const prototype = Object.getPrototypeOf(value)
    return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value)
}

class ArrayType {
    customId = "jwArray"

    array = []

    constructor(array = [], safe = false) {
        this.array = safe ? array : array.map(ArrayType.forArray)
    }

    static toArray(x, readOnly = false) {
        if (x instanceof ArrayType) return readOnly ? x : new ArrayType([...x.array], true)
        if (x instanceof Array) return readOnly ? new ArrayType(x) : new ArrayType([...x])
        if (x === "" || x === null || x === undefined) return new ArrayType([], true)
        if (typeof x == "object" && typeof x.toJSON == "function") {
            let parsed = x.toJSON()
            if (parsed instanceof Array) return new ArrayType(parsed)
            if (isObject(parsed)) return new ArrayType(Object.values(parsed))
            return new ArrayType([parsed])
        }
        try {
            let parsed = JSON.parse(x)
            if (parsed instanceof Array) return new ArrayType(parsed)
        } catch {}
        return new ArrayType([x], true)
    }

    static validArray(x) {
        if (x instanceof ArrayType) return true;
        if (x instanceof Array) return true;
        if (x === null) return false;
        if (typeof x == "object" && typeof x.toJSON == "function") return true;
        try {
            let parsed = JSON.parse(Cast.toString(x));
            if (parsed instanceof Array) return true;
        } catch {}
        return false;
    }

    static forArray(x) {
        if (x instanceof ArrayType) return new ArrayType([...x.array], true)
        if (x instanceof Array) return new ArrayType([...x])
        if (vm.dogeiscutObject && isObject(x)) return new vm.dogeiscutObject.Type(Object.entries(x))
        return x
    }

    static display(x) {
        try {
            switch (typeof x) {
                case "object":
                    if (x === null) return '<i style="opacity: 0.75;">null</i>'
                    if (typeof x.jwArrayHandler == "function") return x.jwArrayHandler()
                    return "Object"
                case "undefined":
                    return "null"
                case "number":
                    return formatNumber(x)
                case "boolean":
                    return x ? "true" : "false"
                case "string":
                    return `"${escapeHTML(Cast.toString(x))}"`
            }
        } catch {}
        return "?"
    }

    static parseLength(length) {
        return clampIndex(length)
    }

    jwArrayHandler() {
        return `Array<${formatNumber(this.array.length)}>`
    }

    toString(pretty = false) {
        return JSON.stringify(this.toJSON(), null, pretty ? "\t" : null)
    }
    toJSON() {
        return this.array.map(v => {
            if (typeof v == "object" && v !== null) {
                if (v.toJSON && typeof v.toJSON == "function") return v.toJSON()
                if (v.toString && typeof v.toString == "function") return v.toString()
                return JSON.stringify(v)
            }
            return v
        })
    }

    static tableDisplay(source, border = '1px solid #77777777', keyBackground = '#77777724', background = '#ffffff00', entryLimit = 1000) {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.flexDirection = 'column'

        const renderArray = (array) => {
            const table = document.createElement('table')
            table.style.borderCollapse = 'collapse'
            table.style.margin = '2px 0'
            table.style.fontSize = '12px'
            table.style.background = background
            table.style.border = border

            const limitedArray = array.slice(0, entryLimit)

            if (limitedArray.length === 0) {
                const text = span(`<i style="opacity: 0.75;">${escapeHTML("<Blank Array>")}</i>`)

                return text.outerHTML
            }

            const filledArray = Array.from(limitedArray, value => value ?? null); // we love sparse arrays

            filledArray.forEach((value, index) => {
                const centeringDiv = document.createElement('div')
                centeringDiv.style.display = 'flex'
                centeringDiv.style.justifyContent = 'center'

                const row = document.createElement('tr')

                const valueCell = document.createElement('td')
                valueCell.style.border = border
                valueCell.style.padding = '2px 6px'
                valueCell.style.background = background

                centeringDiv.innerHTML = render(value, border, keyBackground, background, entryLimit)

                valueCell.appendChild(centeringDiv)
                row.appendChild(valueCell)
                table.appendChild(row)
            })

            if (array.length > entryLimit) {
                const moreRow = document.createElement('tr')
                const moreCell = document.createElement('td')
                moreCell.colSpan = 2
                moreCell.textContent = `... ${array.length - entryLimit} more values`
                moreCell.style.textAlign = 'center'
                moreCell.style.fontStyle = 'italic'
                moreCell.style.color = border
                moreRow.appendChild(moreCell)
                table.appendChild(moreRow)
            }

            return table.outerHTML
        }

        const renderMap = (map) => {
            const table = document.createElement('table')
            table.style.borderCollapse = 'collapse'
            table.style.margin = '2px 0'
            table.style.fontSize = '12px'
            table.style.background = background
            table.style.border = border

            const limitedMap = new Map(Array.from(map).slice(0, entryLimit))

            if (limitedMap.size === 0) {
                const text = span(`<i style="opacity: 0.75;">${escapeHTML("<Blank Object>")}</i>`)

                return text.outerHTML
            }

            limitedMap.forEach((value, key) => {
                const keyCenteringDiv = document.createElement('div')
                keyCenteringDiv.style.display = 'flex'
                keyCenteringDiv.style.justifyContent = 'center'

                const valueCenteringDiv = document.createElement('div')
                valueCenteringDiv.style.display = 'flex'
                valueCenteringDiv.style.justifyContent = 'center'

                const row = document.createElement('tr')

                const keyCell = document.createElement('td')
                keyCell.style.border = border
                keyCell.style.padding = '2px 6px'
                keyCell.style.background = keyBackground
                keyCell.style.fontWeight = 'bold';

                keyCenteringDiv.innerHTML = renderKey(key)

                const valueCell = document.createElement('td')
                valueCell.style.border = border
                valueCell.style.padding = '2px 6px'
                valueCell.style.background = background

                valueCenteringDiv.innerHTML = render(value, border, keyBackground, background)

                keyCell.appendChild(keyCenteringDiv)
                row.appendChild(keyCell)
                valueCell.appendChild(valueCenteringDiv)
                row.appendChild(valueCell)
                table.appendChild(row)
            })

            if (map.size > entryLimit) {
                const moreRow = document.createElement('tr')
                const moreCell = document.createElement('td')
                moreCell.colSpan = 2
                moreCell.textContent = `... ${map.size - entryLimit} more entries`
                moreCell.style.textAlign = 'center'
                moreCell.style.fontStyle = 'italic'
                moreCell.style.color = border
                moreRow.appendChild(moreCell)
                table.appendChild(moreRow)
            }

            return table.outerHTML
        }

        const renderKey = (x) => {
            if (typeof x === "symbol") {
                return `<i style="opacity: 0.5;">${escapeHTML(x.description)}</i>`
            }
            return escapeHTML(String(x))
        }

        const render = (x) => {
            try {
                const nullDraw = '<i style="opacity: 0.75;">null</i>'
                switch (typeof x) {
                    case "object":
                        if (x === null || x === undefined) return nullDraw
                        if (x instanceof Array) {
                            return renderArray(x)
                        }
                        if (x instanceof Map) {
                            return renderMap(x)
                        }
                        if (typeof x.jwArrayHandler == "function") {
                            return x.jwArrayHandler(x)
                        }
                        if (typeof x.dogeiscutObjectHandler == "function") {
                            return x.dogeiscutObjectHandler(x)
                        }
                        return "Object"
                    case "undefined":
                        return nullDraw
                    case "number":
                        return formatNumber(x)
                    case "boolean":
                        return x ? "true" : "false"
                    case "string":
                        return `"${escapeHTML(Cast.toString(x))}"`
                    case "symbol":
                        return `<i style="opacity: 0.5;">${escapeHTML(x.description)}</i>`
                }
            } catch { }
            return "?"
        }

        const normalize = (input) => {
            if (input instanceof ArrayType) {
                return input.array.map(v => normalize(v))
            }
            if (vm.dogeiscutObject && input instanceof vm.dogeiscutObject.Type) {
                return new Map(Array.from(input.map).map(([k, v]) => [vm.dogeiscutObject.Type.forKey(k), normalize(v)]))
            }
            if (isPlainObject(input)) {
                return new Map(Object.entries(input).map(([k, v]) => [vm.dogeiscutObject.Type.forKey(k), normalize(v)]))
            }
            return input
        }

        source = normalize(source)

        root.innerHTML = render(source, border, keyBackground, background)
        root.appendChild(span(`${source instanceof Map ? "Size" : "Length"}: ${source.size ?? source.length}`))

        return root
    }

    toMonitorContent() {
        return ArrayType.tableDisplay(this, '1px solid #fff', '#ffffff33', 'ffffff00')
    }

    toReporterContent() {
        return ArrayType.tableDisplay(this)
    }

    flat(depth = 1) {
        depth = Math.floor(depth)
        if (depth < 1) return this
        return new ArrayType(this.array.reduce((o, v) => {
            if (v instanceof ArrayType) return [...o, ...v.flat(depth - 1).array]
            return [...o, v]
        }, []), true)
    }

    get length() {
        return this.array.length
    }

    static range(start, end) {
        let array = Array(this.parseLength(end - start + 1))
            .fill(0)
            .map((v, i) => start + i);
        return new ArrayType(array, true);
    }

    static splitChars(string, chars) {
        chars = Math.max(1, Math.floor(chars));
        let array = [];
        for (let i = 0; i < string.length; i += chars) {
            array.push(string.slice(i, i + chars));
        }
        return new ArrayType(array, true);
    }

    indexOf(value) {
        return this.array.findIndex(v => vm.runtime.equals(v, value)) + 1;
    }

    has(value) {
        return this.array.some(v => vm.runtime.equals(v, value));
    }

    set(index, value) {
        this.array[index - 1] = ArrayType.forArray(value);
        return this;
    }

    append(value) {
        this.array.push(ArrayType.forArray(value));
        return this;
    }

    insert(value, index) {
        this.array.splice(index - 1, 0, ArrayType.forArray(value));
        return this;
    }

    static concat(...arrays) {
        return new ArrayType(Array.prototype.concat(...arrays.map(v => v.array)), true);
    }
    concat(...arrays) {
        return ArrayType.concat(this, ...arrays);
    }

    fill(value) {
        this.array.fill(ArrayType.forArray(value));
        return this;
    }

    reverse() {
        this.array.reverse();
        return this;
    }

    splice(index, items) {
        this.array.splice(index - 1, items);
        return this;
    }

    repeat(times) {
        this.array = Array(times).fill(this.array).flat();
        return this;
    }

    [pmSymbol.equals](other) {
        return this === other || (this.array.length == other.array.length && this.array.every((v, i) => vm.runtime.equals(v, other.array[i])));
    }
    
    shuffle() {
        const arr = this.array;
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return this;
    }
}

const jwArray = {
    Type: ArrayType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.SQUARE,
        outputCheck: "Array",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.SQUARE,
        exemptFromNormalization: true,
        check: ["Array"]
    }
}

class Extension {
    constructor() {
        vm.jwArray = jwArray

        vm.runtime.registerSerializer( //this basically copies variable serialization
            "jwArray",
            v => v.array.map(w => {
                if (typeof w == "object" && w != null && w.customId) {
                    return {
                        customType: true,
                        typeId: w.customId,
                        serialized: vm.runtime.serializers[w.customId].serialize(w)
                    };
                }
                return w
            }), 
            v => new jwArray.Type(v.map(w => {
                if (typeof w == "object" && w != null && w.customType) {
                    return vm.runtime.serializers[w.typeId].deserialize(w.serialized)
                }
                return w
            }), true)
        );
        vm.extensionManager.extendCompiler("jwArray", this.extendCompiler.bind(this));
        //vm.runtime.registerCompiledExtensionBlocks('jwArray', this.getCompileInfo());
    }
    getInfo() {
        return {
            id: "jwArray",
            name: "Arrays",
            color: "#ff513d",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIj4KICA8Y2lyY2xlIHN0eWxlPSJzdHJva2Utd2lkdGg6IDJweDsgcGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogcmdiKDI1NSwgODEsIDYxKTsgc3Ryb2tlOiByZ2IoMjA1LCA1OSwgNDQpOyIgY3g9IjEwIiBjeT0iMTAiIHI9IjkiPjwvY2lyY2xlPgogIDxwYXRoIGQ9Ik0gOC4wNzMgNC4yMiBMIDYuMTQ3IDQuMjIgQyA1LjA4MyA0LjIyIDQuMjIgNS4wODMgNC4yMiA2LjE0NyBMIDQuMjIgMTMuODUzIEMgNC4yMiAxNC45MTkgNS4wODMgMTUuNzggNi4xNDcgMTUuNzggTCA4LjA3MyAxNS43OCBMIDguMDczIDEzLjg1MyBMIDYuMTQ3IDEzLjg1MyBMIDYuMTQ3IDYuMTQ3IEwgOC4wNzMgNi4xNDcgTCA4LjA3MyA0LjIyIFogTSAxMS45MjcgMTMuODUzIEwgMTMuODUzIDEzLjg1MyBMIDEzLjg1MyA2LjE0NyBMIDExLjkyNyA2LjE0NyBMIDExLjkyNyA0LjIyIEwgMTMuODUzIDQuMjIgQyAxNC45MTcgNC4yMiAxNS43OCA1LjA4MyAxNS43OCA2LjE0NyBMIDE1Ljc4IDEzLjg1MyBDIDE1Ljc4IDE0LjkxOSAxNC45MTcgMTUuNzggMTMuODUzIDE1Ljc4IEwgMTEuOTI3IDE1Ljc4IEwgMTEuOTI3IDEzLjg1MyBaIiBmaWxsPSIjZmZmIiBzdHlsZT0iIj48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: 'parse',
                    text: 'parse [INPUT] as array',
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: '["a", "b", "c"]',
                            exemptFromNormalization: true
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'validate',
                    text: 'is [INPUT] a valid array?',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: '["a", "b", "c"]',
                            exemptFromNormalization: true
                        }
                    }
                },
                "---",
                {
                    opcode: 'blank',
                    text: 'blank array',
                    hideFromPalette: true,
                    ...jwArray.Block
                },
                {
                    opcode: 'expandable',
                    text: 'new array [EXPANDABLE]',
                    arguments: {
                        EXPANDABLE: {
                            type: ArgumentType.EXPANDABLE,
                            minValue: 0,
                            defaultValue: 0,
                            text: '[VALUE]',
                            arguments: {
                                VALUE: {
                                    type: ArgumentType.STRING
                                }
                            }
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'blankLength',
                    text: 'blank array of length [LENGTH]',
                    arguments: {
                        LENGTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'range',
                    text: 'range from [START] to [END]',
                    arguments: {
                        START: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        END: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'split',
                    text: 'split [STRING] by [DIVIDER]',
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        DIVIDER: {
                            type: ArgumentType.STRING
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'splitChars',
                    text: 'split [STRING] into [CHARS] length items',
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        CHARS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'builder',
                    text: 'array builder [SHADOW]',
                    branches: [{}],
                    arguments: {
                        SHADOW: {
                            fillIn: 'builderCurrent'
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'builderCurrent',
                    text: 'current array',
                    hideFromPalette: true,
                    canDragDuplicate: true,
                    ...jwArray.Block
                },
                {
                    opcode: 'builderAppend',
                    text: 'append [VALUE] to builder',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    }
                },
                {
                    opcode: 'builderSet',
                    text: 'set builder to [ARRAY]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'get',
                    text: 'get [INDEX] in [ARRAY]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'items',
                    text: 'items [X] to [Y] in [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'index',
                    text: 'index of [VALUE] in [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    }
                },
                {
                    opcode: 'has',
                    text: '[ARRAY] has [VALUE]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true
                        }
                    }
                },
                {
                    opcode: 'length',
                    text: 'length of [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'set',
                    text: 'set [INDEX] in [ARRAY] to [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'append',
                    text: 'append [VALUE] to [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'insert',
                    text: 'insert [VALUE] at [INDEX] in [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        },
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'concat',
                    text: 'merge [ONE] [TWO]',
                    arguments: {
                        ONE: jwArray.Argument,
                        TWO: jwArray.Argument
                    },
                    hideFromPalette: true,
                    ...jwArray.Block
                },
                {
                    opcode: 'concatExpandable',
                    text: 'merge [EXPANDABLE]',
                    arguments: {
                        EXPANDABLE: {
                            type: ArgumentType.EXPANDABLE,
                            minValue: 2,
                            defaultValue: 2,
                            text: '[ARRAY]',
                            arguments: {
                                ARRAY: jwArray.Argument
                            }
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'fill',
                    text: 'fill [ARRAY] with [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                            exemptFromNormalization: true
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'reverse',
                    text: 'reverse [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'splice',
                    text: 'splice [ARRAY] at [INDEX] with [ITEMS] items',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        ITEMS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'repeat',
                    text: 'repeat [ARRAY] [TIMES] times',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        TIMES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'flat',
                    text: 'flat [ARRAY] with depth [DEPTH]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        DEPTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'shuffle',
                    text: 'shuffle [ARRAY]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'toString',
                    text: 'stringify [ARRAY] [FORMAT]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        FORMAT: {
                            menu: "stringifyFormat",
                            defaultValue: "compact"
                        }
                    }
                },
                {
                    opcode: 'join',
                    text: 'join [ARRAY] with [DIVIDER]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        DIVIDER: {
                            type: ArgumentType.STRING,
                            defaultValue: ""
                        }
                    }
                },
                {
                    opcode: 'sum',
                    text: 'sum of [ARRAY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ARRAY: jwArray.Argument
                    }
                },
                "---",
                {
                    opcode: 'forEachI',
                    text: 'index',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    canDragDuplicate: true
                },
                {
                    opcode: 'forEachV',
                    text: 'value',
                    blockType: BlockType.REPORTER,
                    hideFromPalette: true,
                    allowDropAnywhere: true,
                    canDragDuplicate: true
                },
                {
                    opcode: 'forEach',
                    text: 'for [I] [V] of [ARRAY]',
                    blockType: BlockType.LOOP,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        }
                    }
                },
                {
                    opcode: 'filter',
                    text: 'filter [ARRAY] [I] [V] [ARROW] [PREDICATE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        },
                        ARROW: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ARROW,
                            flipRTL: true
                        },
                        PREDICATE: {
                            type: ArgumentType.BOOLEAN,
                            defaultValue: true
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'map',
                    text: 'map [ARRAY] [I] [V] [ARROW] [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        },
                        ARROW: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ARROW,
                            flipRTL: true
                        },
                        VALUE: {
                            type: ArgumentType.STRING
                        }
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'basicSort',
                    text: 'sort [ARRAY] [I] [V] [ARROW] [VALUE]',
                    arguments: {
                        ARRAY: jwArray.Argument,
                        I: {
                            fillIn: 'forEachI'
                        },
                        V: {
                            fillIn: 'forEachV'
                        },
                        ARROW: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ARROW,
                            flipRTL: true
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: 'fromList',
                    text: 'array from list [LIST]',
                    arguments: {
                        LIST: {
                            type: ArgumentType.LIST
                        }
                    },
                    extensions: ["colours_data_lists"],
                    ...jwArray.Block
                },
                {
                    opcode: 'toList',
                    text: 'set list [LIST] to [ARRAY]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LIST: {
                            type: ArgumentType.LIST
                        },
                        ARRAY: jwArray.Argument
                    },
                    extensions: ["colours_data_lists"]
                }
            ],
            menus: {
                stringifyFormat: {
                    acceptReporters: false,
                    items: [
                        "compact",
                        "pretty"
                    ]
                }
            }
        };
    }

    extendCompiler({IntermediateStackBlock, IntermediateInput, InputType, InputOpcode}) {
        const opcodes = {
            PARSE: 'jwArray.parse',
            VALIDATE: 'jwArray.validate',

            EXPANDABLE: 'jwArray.expandable',
            BLANK_LENGTH: 'jwArray.blankLength',

            RANGE: 'jwArray.range',
            SPLIT: 'jwArray.split',
            SPLIT_CHARS: 'jwArray.splitChars',

            BUILDER: 'jwArray.builder',
            BUILDER_CURRENT: 'jwArray.builderCurrent',
            BUILDER_APPEND: 'jwArray.builderAppend',
            BUILDER_SET: 'jwArray.builderSet',

            GET: 'jwArray.get',
            ITEMS: 'jwArray.items',
            INDEX: 'jwArray.index',
            HAS: 'jwArray.has',
            LENGTH: 'jwArray.length',

            SET: 'jwArray.set',
            APPEND: 'jwArray.append',
            INSERT: 'jwArray.insert',
            CONCAT: 'jwArray.concat',
            FILL: 'jwArray.fill',

            REVERSE: 'jwArray.reverse',
            SPLICE: 'jwArray.splice',
            REPEAT: 'jwArray.repeat',
            FLAT: 'jwArray.flat',
            SHUFFLE: 'jwArray.shuffle',

            TO_STRING: 'jwArray.toString',
            JOIN: 'jwArray.join',
            SUM: 'jwArray.sum',

            LOOP_INDEX: 'jwArray.loopIndex',
            LOOP_VALUE: 'jwArray.loopValue',
            FOR_EACH: 'jwArray.forEach',
            FILTER: 'jwArray.filter',
            MAP: 'jwArray.map',
            BASIC_SORT: 'jwArray.basicSort',

            FROM_LIST: 'jwArray.fromList',
            TO_LIST: 'jwArray.toList',
        }

        return {
            ir: {
                reporter(block) {
                    switch (block.opcode) {
                        case 'jwArray_parse':
                            return new IntermediateInput(opcodes.PARSE, InputType.CUSTOM_TYPE, {
                                input: this.descendInputOfBlock(block, 'INPUT')
                            });
                        case 'jwArray_validate':
                            return new IntermediateInput(opcodes.VALIDATE, InputType.BOOLEAN, {
                                input: this.descendInputOfBlock(block, 'INPUT')
                            });

                        case 'jwArray_blank':
                            return new IntermediateInput(opcodes.EXPANDABLE, InputType.CUSTOM_TYPE, {
                                values: []
                            });
                        case 'jwArray_blankLength':
                            return new IntermediateInput(opcodes.BLANK_LENGTH, InputType.CUSTOM_TYPE, {
                                len: this.descendInputOfBlock(block, 'LENGTH').toType(InputType.NUMBER)
                            });

                        case 'jwArray_expandable':
                            return new IntermediateInput(opcodes.EXPANDABLE, InputType.CUSTOM_TYPE, {
                                values: this.descendExpandableValue(block, 'EXPANDABLE', 'VALUE')
                            });
                        case 'jwArray_range':
                            return new IntermediateInput(opcodes.RANGE, InputType.CUSTOM_TYPE, {
                                start: this.descendInputOfBlock(block, 'START').toType(InputType.NUMBER),
                                end: this.descendInputOfBlock(block, 'END').toType(InputType.NUMBER)
                            });
                        case 'jwArray_split':
                            return new IntermediateInput(opcodes.SPLIT, InputType.CUSTOM_TYPE, {
                                string: this.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
                                divider: this.descendInputOfBlock(block, 'DIVIDER').toType(InputType.STRING)
                            });
                        case 'jwArray_splitChars':
                            return new IntermediateInput(opcodes.SPLIT_CHARS, InputType.CUSTOM_TYPE, {
                                string: this.descendInputOfBlock(block, 'STRING').toType(InputType.STRING),
                                chars: this.descendInputOfBlock(block, 'CHARS').toType(InputType.NUMBER)
                            });

                        case 'jwArray_builder':
                            return new IntermediateInput(opcodes.BUILDER, InputType.CUSTOM_TYPE, {
                                substack: this.descendSubstack(block, 'SUBSTACK')
                            });
                        case 'jwArray_builderCurrent':
                            return new IntermediateInput(opcodes.BUILDER_CURRENT, InputType.CUSTOM_TYPE);
                        
                        case 'jwArray_get':
                            return new IntermediateInput(opcodes.GET, InputType.ANY, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                index: this.descendInputOfBlock(block, 'INDEX').toType(InputType.NUMBER)
                            });
                        case 'jwArray_items':
                            return new IntermediateInput(opcodes.ITEMS, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                from: this.descendInputOfBlock(block, 'X').toType(InputType.NUMBER),
                                to: this.descendInputOfBlock(block, 'Y').toType(InputType.NUMBER)
                            });
                        case 'jwArray_index':
                            return new IntermediateInput(opcodes.INDEX, InputType.NUMBER_WHOLE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_has':
                            return new IntermediateInput(opcodes.HAS, InputType.BOOLEAN, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_length':
                            return new IntermediateInput(opcodes.LENGTH, InputType.NUMBER_WHOLE, {
                                array: this.descendInputOfBlock(block, 'ARRAY')
                            });

                        case 'jwArray_set':
                            return new IntermediateInput(opcodes.SET, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                index: this.descendInputOfBlock(block, 'INDEX').toType(InputType.NUMBER),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_append':
                            return new IntermediateInput(opcodes.APPEND, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_insert':
                            return new IntermediateInput(opcodes.INSERT, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                index: this.descendInputOfBlock(block, 'INDEX').toType(InputType.NUMBER),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_concat':
                            return new IntermediateInput(opcodes.CONCAT, InputType.CUSTOM_TYPE, {
                                values: [this.descendInputOfBlock(block, 'ONE'), this.descendInputOfBlock(block, 'TWO')]
                            });
                        case 'jwArray_concatExpandable':
                            return new IntermediateInput(opcodes.CONCAT, InputType.CUSTOM_TYPE, {
                                values: this.descendExpandableValue(block, 'EXPANDABLE', 'ARRAY')
                            })
                        case 'jwArray_fill':
                            return new IntermediateInput(opcodes.FILL, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        
                        case 'jwArray_reverse':
                            return new IntermediateInput(opcodes.REVERSE, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY')
                            });
                        case 'jwArray_splice':
                            return new IntermediateInput(opcodes.SPLICE, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                index: this.descendInputOfBlock(block, 'INDEX').toType(InputType.NUMBER),
                                items: this.descendInputOfBlock(block, 'ITEMS').toType(InputType.NUMBER)
                            });
                        case 'jwArray_repeat':
                            return new IntermediateInput(opcodes.REPEAT, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                times: this.descendInputOfBlock(block, 'TIMES').toType(InputType.NUMBER)
                            });
                        case 'jwArray_flat':
                            return new IntermediateInput(opcodes.FLAT, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                depth: this.descendInputOfBlock(block, 'DEPTH').toType(InputType.NUMBER)
                            });
                        case 'jwArray_shuffle':
                            return new IntermediateInput(opcodes.SHUFFLE, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                            });

                        case 'jwArray_toString':
                            return new IntermediateInput(opcodes.TO_STRING, InputType.STRING, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                pretty: block.fields.FORMAT.value === 'pretty'
                            });
                        case 'jwArray_join':
                            return new IntermediateInput(opcodes.JOIN, InputType.STRING, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                divider: this.descendInputOfBlock(block, 'DIVIDER')
                            });
                        case 'jwArray_sum':
                            return new IntermediateInput(opcodes.SUM, InputType.NUMBER, {
                                array: this.descendInputOfBlock(block, 'ARRAY')
                            });
                        
                        case 'jwArray_forEachI':
                            return new IntermediateInput(opcodes.LOOP_INDEX, InputType.NUMBER_WHOLE);
                        case 'jwArray_forEachV':
                            return new IntermediateInput(opcodes.LOOP_VALUE, InputType.ANY);
                        case 'jwArray_filter':
                            return new IntermediateInput(opcodes.FILTER, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                predicate: this.descendInputOfBlock(block, 'PREDICATE').toType(InputType.BOOLEAN)
                            }, true);
                        case 'jwArray_map':
                            return new IntermediateInput(opcodes.MAP, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            }, true);
                        case 'jwArray_basicSort':
                            return new IntermediateInput(opcodes.BASIC_SORT, InputType.CUSTOM_TYPE, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                value: this.descendInputOfBlock(block, 'VALUE')
                            }, true);

                        case 'jwArray_fromList':
                            return new IntermediateInput(opcodes.FROM_LIST, InputType.CUSTOM_TYPE, {
                                list: this.descendVariable(block, 'LIST', 'list')
                            });
                    }
                },
                command(block) {
                    switch (block.opcode) {
                        case 'jwArray_builderAppend':
                            return new IntermediateStackBlock(opcodes.BUILDER_APPEND, {
                                value: this.descendInputOfBlock(block, 'VALUE')
                            });
                        case 'jwArray_builderSet':
                            return new IntermediateStackBlock(opcodes.BUILDER_SET, {
                                array: this.descendInputOfBlock(block, 'ARRAY')
                            });
                        
                        case 'jwArray_forEach':
                            return new IntermediateStackBlock(opcodes.FOR_EACH, {
                                array: this.descendInputOfBlock(block, 'ARRAY'),
                                substack: this.descendSubstack(block, 'SUBSTACK')
                            }, true);
                            
                        case 'jwArray_toList':
                            return new IntermediateStackBlock(opcodes.TO_LIST, {
                                list: this.descendVariable(block, 'LIST', 'list'),
                                array: this.descendInputOfBlock(block, 'ARRAY')
                            });
                    }
                }
            },
            js: {
                reporter(block) {
                    const node = block.inputs;

                    switch (block.opcode) {
                        case opcodes.PARSE:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.input)}, true)`;
                        case opcodes.VALIDATE:
                            return `vm.jwArray.Type.validArray(${this.descendInput(node.input)})`;

                        case opcodes.EXPANDABLE:
                            return `(new vm.jwArray.Type([${node.values.map(v => this.descendInput(v)).join(', ')}]${node.values.length == 0 ? ', true' : ''}))`
                        case opcodes.BLANK_LENGTH:
                            return `(new vm.jwArray.Type(Array(vm.jwArray.Type.parseLength(${this.descendInput(node.len)})).fill(null), true))`;

                        case opcodes.RANGE:
                            return `vm.jwArray.Type.range(${this.descendInput(node.start)}, ${this.descendInput(node.end)})`;
                        case opcodes.SPLIT:
                            return `(new vm.jwArray.Type(${this.descendInput(node.string)}.split(${this.descendInput(node.divider)}), true))`;
                        case opcodes.SPLIT_CHARS:
                            return `vm.jwArray.Type.splitChars(${this.descendInput(node.string)}, ${this.descendInput(node.chars)})`;
                        
                        case opcodes.BUILDER: {
                            let source = "";
                            source += `vm.jwArray.Type.toArray(${this.script.yields ? "yield* (function*" : "(function"}() {\n`
                            source += `let _jwArrayBuilder = [];\n`
                            source += this.descendStackInline(node.substack, {allowReturns: true, inLoop: false});
                            source += `return _jwArrayBuilder;\n`
                            source += `})(), true)`;
                            return source;
                        }
                        case opcodes.BUILDER_CURRENT:
                            return `(new vm.jwArray.Type(typeof _jwArrayBuilder !== "undefined" ? _jwArrayBuilder : [], true))`;
                        
                        case opcodes.GET:
                            return `(vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).array[${this.descendInput(node.index)}-1] ?? null)`;
                        case opcodes.ITEMS:
                            return `(new vm.jwArray.Type(vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).array.slice(Math.max(${this.descendInput(node.from)} - 1, 0), Math.max(${this.descendInput(node.to)}, 0)), true))`;
                        case opcodes.INDEX:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).indexOf(${this.descendInput(node.value)})`;
                        case opcodes.HAS:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).has(${this.descendInput(node.value)})`;
                        case opcodes.LENGTH:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).length`;

                        case opcodes.SET:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).set(${this.descendInput(node.index)}, ${this.descendInput(node.value)})`;
                        case opcodes.APPEND:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).append(${this.descendInput(node.value)})`;
                        case opcodes.INSERT:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).insert(${this.descendInput(node.value)}, ${this.descendInput(node.index)})`;
                        case opcodes.CONCAT:
                            return `vm.jwArray.Type.concat(${node.values.map(v => `vm.jwArray.Type.toArray(${this.descendInput(v)}, true)`).join(', ')})`;
                        case opcodes.FILL:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).fill(${this.descendInput(node.value)})`;
                        
                        case opcodes.REVERSE:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).reverse()`;
                        case opcodes.SPLICE:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).splice(${this.descendInput(node.index)}, ${this.descendInput(node.items)})`;
                        case opcodes.REPEAT:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).repeat(${this.descendInput(node.times)})`;
                        case opcodes.FLAT:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).flat(${this.descendInput(node.depth)})`;
                        case opcodes.SHUFFLE:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).shuffle()`;
                        
                        case opcodes.TO_STRING:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).toString(${node.pretty ? 'true' : ''})`;
                        case opcodes.JOIN:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).array.join(${this.descendInput(node.divider)})`;
                        case opcodes.SUM:
                            return `vm.jwArray.Type.toArray(${this.descendInput(node.array)}).array.reduce((o, v) => o + (Number(v) || 0), 0)`;
                        
                        case opcodes.LOOP_INDEX:
                            return `(typeof _jwArrayLoop !== "undefined" ? Number(_jwArrayLoop[0]) + 1 : 0)`;
                        case opcodes.LOOP_VALUE:
                            return `(typeof _jwArrayLoop !== "undefined" ? _jwArrayLoop[1] : null)`;
                        case opcodes.FILTER: {
                            let source = "";
                            source += `vm.jwArray.Type.toArray(yield* (function*() {\n`;
                            const array = this.localVariables.next();
                            source += `const ${array} = vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).array;\n`;
                            const output = this.localVariables.next();
                            source += `const ${output} = [];\n`;
                            source += `for (const _jwArrayLoop of Object.entries(${array})) {\n`;
                            source += `if (${this.descendInput(node.predicate)}) ${output}.push(_jwArrayLoop[1]);\n`;
                            source += this.yieldLoopInline();
                            source += `}\n`;
                            source += `return ${output};\n`;
                            source += `}()), true)\n`;
                            return source;
                        }
                        case opcodes.MAP: {
                            let source = "";
                            source += `vm.jwArray.Type.toArray(yield* (function*() {\n`;
                            const array = this.localVariables.next();
                            source += `const ${array} = vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).array;\n`;
                            const output = this.localVariables.next();
                            source += `const ${output} = [];\n`;
                            source += `for (const _jwArrayLoop of Object.entries(${array})) {\n`;
                            source += `${output}.push(${this.descendInput(node.value)});\n`;
                            source += this.yieldLoopInline();
                            source += `}\n`;
                            source += `return ${output};\n`;
                            source += `}()), true)\n`;
                            return source;
                        }
                        case opcodes.BASIC_SORT: {
                            let source = "";
                            source += `vm.jwArray.Type.toArray(yield* (function*() {\n`;
                            const array = this.localVariables.next();
                            source += `const ${array} = vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true).array;\n`;
                            const sortValues = this.localVariables.next();
                            source += `const ${sortValues} = [];\n`;
                            source += `for (const _jwArrayLoop of Object.entries(${array})) {\n`;
                            source += `${sortValues}.push(${this.descendInput(node.value)});\n`;
                            source += this.yieldLoopInline();
                            source += `}\n`;
                            source += `return ${array}.map((_, i) => i)`;
                            source +=   `.sort((a, b) => ${sortValues}[a] > ${sortValues}[b] ? 1 : ${sortValues}[a] < ${sortValues}[b] ? -1 : 0)`;
                            source +=   `.map(i => ${array}[i]);\n`;
                            source += `}()), true)\n`;
                            return source;
                        }

                        case opcodes.FROM_LIST:
                            return `(new vm.jwArray.Type(${this.referenceVariable(node.list)}.value))`;
                    }
                },
                command(block) {
                    const node = block.inputs;
                    switch (block.opcode) {
                        case opcodes.BUILDER_APPEND:
                            this.source += `if (typeof _jwArrayBuilder !== "undefined") _jwArrayBuilder.push(vm.jwArray.Type.forArray(${this.descendInput(node.value)}));\n`;
                            return true;
                        case opcodes.BUILDER_SET:
                            this.source += `if (typeof _jwArrayBuilder !== "undefined") _jwArrayBuilder = vm.jwArray.Type.toArray(${this.descendInput(node.array)}).array;\n`;
                            return true;
                        
                        case opcodes.FOR_EACH:
                            const loopName = this.localVariables.next();
                            const array = this.localVariables.next();
                            this.source += `const ${array} = vm.jwArray.Type.toArray(${this.descendInput(node.array)}, true);\n`;
                            this.source += `${loopName}: for (const _jwArrayLoop of Object.entries(${array}.array)) {\n`;
                            this.descendStack(node.substack, {inLoop: true, loopName});
                            this.yieldLoop();
                            this.source += `}\n`;
                            return true;
                            
                        case opcodes.TO_LIST:
                            this.source += `${this.referenceVariable(node.list)}.value = vm.jwArray.Type.toArray(${this.descendInput(node.array)}).array;\n`;
                            return true;
                    }
                }
            }
        }
    }
}

module.exports = Extension
