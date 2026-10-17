const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

function span(text) {
    let el = document.createElement('span');
    el.innerHTML = text;
    el.style.display = 'hidden';
    el.style.whiteSpace = 'nowrap';
    el.style.width = '100%';
    el.style.textAlign = 'center';
    return el;
};

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
};

class RegularExpressionType {
    customId = "dogeiscutRegularExpression"

    regex = /(?:)/

    constructor(regex = /(?:)/, lastIndex = 0) {
        this.regex = regex
        this.lastIndex = lastIndex
    }

    static toRegularExpression(x) {
        if (x === null || x === undefined) return new RegularExpressionType()

        if (x instanceof RegExp) return new RegularExpressionType(x, x.lastIndex)

        if (x instanceof RegularExpressionType) {
            return new RegularExpressionType(x.regex, x.lastIndex)
        }

        if (typeof x === 'object') {
            if ('pattern' in x && 'flags' in x) {
                
            } else if ('PATTERN' in x && 'FLAGS' in x) {
                x = { pattern: String(x.PATTERN), flags: String(x.FLAGS) }
            } else {
                try {
                    x = { pattern: JSON.stringify(x), flags: "" }
                } catch {
                    x = { pattern: String(x), flags: "" }
                }
            }
        } else if (Array.isArray(x)) {
            if (x.length > 1) {
                x = { pattern: String(x[0]), flags: String(x[1]) }
            } else {
                try {
                    x = { pattern: JSON.stringify(x), flags: "" }
                } catch {
                    x = { pattern: String(x), flags: "" }
                }
            }
        } else if (typeof x === 'string') {
            const match = x.match(/^\/(.+)\/(\S*)$/) // using regex to capture regex... ironic
            if (match) {
                try {
                    x = { pattern: x[1], flags: x[2] }
                } catch {
                    try {
                        x = { pattern: x[1], flags: "" }
                    } catch {
                        x = { pattern: x, flags: "" }
                    }
                }
            }
        } else {
            x = { pattern: String(x), flags: "" }
        }

        function filterRawFlags(rawFlags) {
            if (rawFlags === "") {
                return rawFlags;
            }

            const allowed = 'dgimsuvy';

            let flagArray = [...new Set(rawFlags)].filter(f => allowed.includes(f))

            if (flagArray.includes('v') && flagArray.includes('u')) {
                flagArray = flagArray.filter(f => f !== 'u');
            }

            return flagArray.join('');
        }

        try {
            return new RegularExpressionType(new RegExp(x.pattern, filterRawFlags(x.flags)));
        } catch {}
        try {
            return new RegularExpressionType(new RegExp(RegExp.escape(x.pattern), filterRawFlags(x.flags)));
        } catch {}
        
        return new RegularExpressionType(); // abysmal failure :(
    }

    toString() {
        return `/${this.source}/${this.flags}`;
    }

    jwArrayHandler = () => this.toString()
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')

        root.style.display = 'flex'
        root.style.flexDirection = 'column'
        root.style.justifyContent = 'center'
        root.style.fontWeight = 'bold'

        root.appendChild(span(escapeHTML(this.toString())))

        return root
    }

    // makes things easy for me
    get dotAll() {
        return Cast.toBoolean(this.regex.dotAll)
    }
    get flags() {
        return Cast.toString(this.regex.flags)
    }
    get global() {
        return Cast.toBoolean(this.regex.global)
    }
    get hasIndices() {
        return Cast.toBoolean(this.regex.hasIndices)
    }
    get ignoreCase() {
        return Cast.toBoolean(this.regex.ignoreCase)
    }
    get multiline() {
        return Cast.toBoolean(this.regex.multiline)
    }
    get source() {
        return Cast.toString(this.regex.source)
    }
    get unicode() {
        return Cast.toBoolean(this.regex.unicode)
    }
    get unicodeSets() {
        return Cast.toBoolean(this.regex.unicodeSets)
    }
    get lastIndex() {
        return Cast.toNumber(this.regex.lastIndex)
    }
    set lastIndex(newLastIndex) {
        this.regex.lastIndex = Cast.toNumber(newLastIndex)
    }

    static convertEvilArrayIHateToObject(baseArray) {
        if (baseArray) {
            let newObj = Object.create(null);
            newObj.array = jwArray.Type.toArray([...baseArray])
            newObj.index = Cast.toNumber(baseArray.index)
            newObj.input = Cast.toString(baseArray.input)
            if (baseArray.groups) {
                newObj.groups = dogeiscutObject.Type.toObject(baseArray.groups)
            }
            if (baseArray.indices) {
                newObj.indices = Object.create(null);
                newObj.indices.array = jwArray.Type.toArray([...baseArray.indices])
                if (baseArray.indices.groups) {
                    newObj.indices.groups = dogeiscutObject.Type.toObject(baseArray.indices.groups)
                }
            }
            return dogeiscutObject.Type.toObject(newObj)
        }
        return ""
    }

    exec(string) {
        // returns an array or null. need arrays ext
        // also this array aparently has additional properties.. i love js 
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
        let baseArray = this.regex.exec(string)
        return RegularExpressionType.convertEvilArrayIHateToObject(baseArray)
    }
    test(string) {
        return Cast.toBoolean(this.regex.test(string))
    }
}

const dogeiscutRegularExpressions = {
    Type: RegularExpressionType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.SLANTED,
        forceOutputType: "dogeiscutRegularExpressions",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.SLANTED,
        check: ["dogeiscutRegularExpressions"],
    },
};

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
};

let dogeiscutObject = {
    Type: class {},
    Block: {},
    Argument: {}
};

class Extension {
    constructor() {
        vm.extensionManager.addExtensionDependency("dogeiscutRegularExpressions", "jwArray", () => jwArray = vm.jwArray);
        vm.extensionManager.addExtensionDependency("dogeiscutRegularExpressions", "dogeiscutObject", () => dogeiscutObject = vm.dogeiscutObject);

        vm.dogeiscutRegularExpressions = dogeiscutRegularExpressions;
        vm.runtime.registerSerializer(
            "dogeiscutRegularExpression", 
            v => ({ source: v.source, flags: v.flags, lastIndex: v.lastIndex }), 
            v => {
                let regex = dogeiscutRegularExpressions.Type.toRegularExpression(new RegExp(v.source, v.flags));
                regex.lastIndex = v.lastIndex;
                return regex;
            }
        );
    }
    getInfo() {
        return {
            id: "dogeiscutRegularExpressions",
            name: "Regular Expressions",
            color1: "#BB2EAD",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpzZXJpZj0iaHR0cDovL3d3dy5zZXJpZi5jb20vIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMjAgMjAiIHZlcnNpb249IjEuMSIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgc3R5bGU9ImZpbGwtcnVsZTpldmVub2RkO2NsaXAtcnVsZTpldmVub2RkOyI+CiAgICA8Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI5IiBzdHlsZT0iZmlsbDogI0JCMkVBRDtzdHJva2U6ICM5NTI0OEE7c3Ryb2tlLXdpZHRoOjJweDsiLz4KICAgIDxnIHRyYW5zZm9ybT0ibWF0cml4KDEuMDI2NDg2LDAsMCwxLjAyNjQ4NiwtMTk2LjE3NjEzMSwtMTM0Ljc4MjIzNykiPgogICAgICAgIDxwYXRoIGQ9Ik0xOTUuOTc4LDE0Ni42NzdDMTk1LjI0NCwxNDUuOTIzIDE5NC42OTQsMTQ1LjA3OCAxOTQuMzI5LDE0NC4xNEMxOTMuOTY0LDE0My4yMDMgMTkzLjc4MSwxNDIuMTcxIDE5My43ODEsMTQxLjA0NkMxOTMuNzgxLDEzOS45MjEgMTkzLjk2NCwxMzguODkgMTk0LjMyOSwxMzcuOTUzQzE5NC42OTQsMTM3LjAxNSAxOTUuMjQ0LDEzNi4xNjkgMTk1Ljk3OCwxMzUuNDE2TDE5Ni45MTYsMTM2LjU3QzE5Ni4zODUsMTM3LjE3NSAxOTUuOTg3LDEzNy44NDkgMTk1LjcyMywxMzguNTkxQzE5NS40NiwxMzkuMzM0IDE5NS4zMjgsMTQwLjE1MiAxOTUuMzI4LDE0MS4wNDZDMTk1LjMyOCwxNDEuOTQxIDE5NS40NiwxNDIuNzYgMTk1LjcyMywxNDMuNTA0QzE5NS45ODcsMTQ0LjI0OSAxOTYuMzg1LDE0NC45MjMgMTk2LjkxNiwxNDUuNTI5TDE5NS45NzgsMTQ2LjY3N1oiIHN0eWxlPSJmaWxsOndoaXRlO2ZpbGwtcnVsZTpub256ZXJvOyIvPgogICAgICAgIDxyZWN0IHg9IjE5Ny40NzIiIHk9IjE0My4yMzgiIHdpZHRoPSIxLjYwNSIgaGVpZ2h0PSIxLjYwNSIgc3R5bGU9ImZpbGw6d2hpdGU7ZmlsbC1ydWxlOm5vbnplcm87Ii8+CiAgICAgICAgPHBhdGggZD0iTTIwMS43MiwxMzguMjYzTDIwMi43MTEsMTM3LjU0OEwyMDQuMDI5LDEzOS4zNTlMMjAzLjAzOSwxNDAuMDhMMjAxLjcyLDEzOC4yNjNaTTIwMC40MDIsMTM5LjM1OUwyMDEuNzIsMTM3LjU0OEwyMDIuNzExLDEzOC4yNjNMMjAxLjM5MiwxNDAuMDhMMjAwLjQwMiwxMzkuMzU5Wk0xOTkuODkyLDEzNy43OTRMMjAwLjI3MywxMzYuNjI4TDIwMi40MDYsMTM3LjMyNkwyMDIuMDI1LDEzOC40ODZMMTk5Ljg5MiwxMzcuNzk0Wk0yMDEuNjAzLDEzNS42NjJMMjAyLjgyOCwxMzUuNjYyTDIwMi44MjgsMTM3LjkwNkwyMDEuNjAzLDEzNy45MDZMMjAxLjYwMywxMzUuNjYyWk0yMDIuMDI1LDEzNy4zMjZMMjA0LjE1OCwxMzYuNjI4TDIwNC41MzksMTM3Ljc5NEwyMDIuNDA2LDEzOC40ODZMMjAyLjAyNSwxMzcuMzI2WiIgc3R5bGU9ImZpbGw6d2hpdGU7ZmlsbC1ydWxlOm5vbnplcm87Ii8+CiAgICAgICAgPHBhdGggZD0iTTIwNC43OTcsMTQ1LjUyOUMyMDUuMzI4LDE0NC45MjMgMjA1LjcyNSwxNDQuMjQ5IDIwNS45ODksMTQzLjUwNEMyMDYuMjUzLDE0Mi43NiAyMDYuMzg1LDE0MS45NDEgMjA2LjM4NSwxNDEuMDQ2QzIwNi4zODUsMTQwLjE1MiAyMDYuMjUzLDEzOS4zMzQgMjA1Ljk4OSwxMzguNTkxQzIwNS43MjUsMTM3Ljg0OSAyMDUuMzI4LDEzNy4xNzUgMjA0Ljc5NywxMzYuNTdMMjA1LjczNCwxMzUuNDE2QzIwNi40NjgsMTM2LjE2OSAyMDcuMDE4LDEzNy4wMTUgMjA3LjM4NCwxMzcuOTUzQzIwNy43NDksMTM4Ljg5IDIwNy45MzEsMTM5LjkyMSAyMDcuOTMxLDE0MS4wNDZDMjA3LjkzMSwxNDIuMTcxIDIwNy43NDksMTQzLjIwMyAyMDcuMzg0LDE0NC4xNEMyMDcuMDE4LDE0NS4wNzggMjA2LjQ2OCwxNDUuOTIzIDIwNS43MzQsMTQ2LjY3N0wyMDQuNzk3LDE0NS41MjlaIiBzdHlsZT0iZmlsbDp3aGl0ZTtmaWxsLXJ1bGU6bm9uemVybzsiLz4KICAgIDwvZz4KPC9zdmc+",
            blocks: [
                {
                    opcode: 'regex',
                    text: 'regular expression [PATTERN] [FLAGS]',
                    arguments: {
                        PATTERN: {
                            type: ArgumentType.STRING,
                            defaultValue: "(.*)"
                        },
                        FLAGS: {
                            type: ArgumentType.STRING,
                            defaultValue: "gm"
                        }
                    },
                    ...dogeiscutRegularExpressions.Block
                },
                {
                    opcode: 'escape',
                    text: 'escape [STRING] for regex',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "(.*)"
                        },
                    },
                },
                '---',
                {
                    opcode: 'sourceOf',
                    text: 'source of [REGEX]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                    },
                },
                {
                    opcode: 'flagsOf',
                    text: 'flags of [REGEX]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                    },
                },
                '---',
                {
                    opcode: 'test',
                    text: 'test [STRING] for [REGEX]',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true,
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        REGEX: dogeiscutRegularExpressions.Argument
                    },
                },
                {
                    opcode: 'search',
                    text: 'search [STRING] with [REGEX]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        REGEX: dogeiscutRegularExpressions.Argument
                    },
                },
                '---',
                {
                    opcode: 'replace',
                    text: 'replace [REGEX] in [A] with [B]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        A: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        B: {
                            type: ArgumentType.STRING,
                            defaultValue: "bar"
                        },
                    },
                },
                {
                    opcode: 'replaceAll',
                    text: 'replace all [REGEX] in [A] with [B]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        A: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        B: {
                            type: ArgumentType.STRING,
                            defaultValue: "bar"
                        },
                    },
                },
                '---',
                {
                    opcode: 'split',
                    text: 'split [STRING] by [REGEX]',
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        REGEX: dogeiscutRegularExpressions.Argument,
                    },
                    ...jwArray.Block,
                },
                {
                    opcode: 'match',
                    text: 'match [REGEX] with [STRING]',
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                    },
                    ...jwArray.Block,
                },
                {
                    opcode: 'matchAll',
                    text: 'match all [REGEX] with [STRING]',
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                    },
                    ...jwArray.Block,
                },
                '---',
                {
                    opcode: 'exec',
                    text: 'execute [REGEX] on [STRING]',
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                    },
                    ...dogeiscutObject.Block
                },
                {
                    opcode: 'getLastIndex',
                    text: 'get last index of [REGEX]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                    },
                },
                {
                    opcode: 'setLastIndex',
                    text: 'set last index of [REGEX] to [INDEX]',
                    arguments: {
                        REGEX: dogeiscutRegularExpressions.Argument,
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                    },
                    hideFromPalette: true,
                },
                {
                    blockType: BlockType.XML,
                    xml: `<block type="dogeiscutRegularExpressions_setLastIndex" ><value name="INDEX"><shadow type="math_whole_number" ><field name="NUM">0</field></shadow></value></block>`
                },
            ],
            menus: {}
        }
    }

    regex({ PATTERN, FLAGS }) {
        PATTERN = Cast.toString(PATTERN)
        FLAGS = Cast.toString(FLAGS)
        return RegularExpressionType.toRegularExpression({ PATTERN, FLAGS })
    }

    test({ STRING, REGEX }) {
        STRING = Cast.toString(STRING)
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return REGEX.test(STRING)
    }

    exec({ STRING, REGEX }) {
        STRING = Cast.toString(STRING)
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return REGEX.exec(STRING)
    }

    getLastIndex({ REGEX }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return REGEX.lastIndex
    }

    setLastIndex({ REGEX, INDEX }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        INDEX = Cast.toNumber(INDEX)
        REGEX.lastIndex = INDEX
        //return REGEX
    }

    search({ STRING, REGEX }) {
        STRING = Cast.toString(STRING)
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return Cast.toNumber(STRING.search(REGEX.regex))
    }

    split({ REGEX, STRING }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        STRING = Cast.toString(STRING)
        return jwArray.Type.toArray(STRING.split(REGEX.regex))
    }

    replace({ REGEX, A, B }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        A = Cast.toString(A)
        B = Cast.toString(B)
        return Cast.toString(A.replace(REGEX.regex, B))
    }

    replaceAll({ REGEX, A, B }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        A = Cast.toString(A)
        B = Cast.toString(B)
        try {
            return Cast.toString(A.replaceAll(REGEX.regex, B))
        } catch {
            return ""
        }
    }

    match({ REGEX, STRING }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        STRING = Cast.toString(STRING)
        return jwArray.Type.toArray(STRING.match(REGEX.regex))
    }

    matchAll({ REGEX, STRING }) {
        // ok so turns out match all returns an iterator and we kinda sorta dont have an extension to handle that so im turning it into an array
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        STRING = Cast.toString(STRING)
        try {
            return jwArray.Type.toArray([...STRING.matchAll(REGEX.regex)].map((x) => RegularExpressionType.convertEvilArrayIHateToObject(x)))
        } catch {
            return new jwArray.Type();
        }
    } 

    sourceOf({ REGEX }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return REGEX.source
    }

    flagsOf({ REGEX }) {
        REGEX = RegularExpressionType.toRegularExpression(REGEX)
        return REGEX.flags
    }

    escape({ STRING }) {
        STRING = Cast.toString(STRING)
        return Cast.toString(RegExp.escape(STRING))
    }
}

module.exports = Extension;