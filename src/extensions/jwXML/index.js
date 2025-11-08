const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

const fxp = require('./xml.js')

function span(text) {
    let el = document.createElement('span')
    el.innerText = text
    el.style.width = '100%'
    return el
}

class XMLType {
    customId = "jwXML"

    /** @type {Array<string | XMLType>} */
    children

    /** @type {Object<string, string>} */
    attributes

    /** @type {string} */
    name

    constructor(name, children = [], attributes = {}) {
        this.name = XMLType.safeName(name)

        this.children = children
        this.attributes = attributes
    }

    static toXML(v) {
        if (v instanceof XMLType) return new XMLType(v.name, [...v.children], {...v.attributes})
        if (v === null || v === undefined) return new XMLType()
        
        let parsed = XMLType.stringToMultiple(Cast.toString(v)).filter(v => v instanceof XMLType)
        if (parsed.length > 0) return parsed[0]

        return new XMLType("node", [Cast.toString(v)])
    }

    static stringToMultiple(v) {
        let parsed = (new fxp.default({
            ignoreAttributes: false,
            attributeNamePrefix : "",
            allowBooleanAttributes: true,
            textNodeName: "#text",
            preserveOrder: true,
            ignoreDeclaration: true,
            ignorePiTags: true
        })).parse(`${v}`)

        let parse = v => {
            let output = []
            for (let item of v) {
                if (item["#text"]) {
                    output.push(item["#text"])
                    continue
                }

                let attributes = {}
                if (item[":@"]) {
                    for (let [attr, value] of Object.entries(item[":@"])) {
                        attributes[attr] = Cast.toString(value)
                    }
                }

                let name
                for (let key of Object.keys(item)) {
                    if (key !== "#text" && key !== ":@") {
                        name = key
                        break
                    }
                }

                let children = parse(item[name])

                output.push(new XMLType(name, children, attributes))
            }
            return output
        }

        return parse(parsed)
    }

    static forXML(v) {
        if (v instanceof XMLType) return v
        return Cast.toString(v)
    }

    static safeName(name) {
        name ??= "node"
        return /^[A-z_][A-z0-9_\-:]*$/.exec(name) ? name : "node"
    }

    static safeText(text) {
        return [
            ["&", "&amp;"],
            ["<", "&lt;"],
            [">", "&gt;"],
            ['"', "&quot;"],
            ["'", "&apos;"],
            ["\r\n", "&#10;"],
            ["\n", "&#10;"],
            ["\t", "&#9;"]
        ].reduce((a, b) => a.replaceAll(b[0], b[1]), text)
    }

    static safeDisplayText(text) {
        return [
            "\r",
            "\n",
            "\t"
        ].reduce((a, b) => a.replaceAll(b, ""), text)
    }

    jwArrayHandler() {
        return XMLType.safeText(`<${this.name} />`)
    }

    toString(pretty = false, depth = 0) {
        let output = "\t".repeat(pretty ? depth : 0) + `<${this.name}`
        
        for (let [attr, value] of Object.entries(this.attributes)) {
            output += ` ${attr}="${XMLType.safeText(value)}"`
        }

        if (this.children.length === 0) {
            output += " />"
        } else {
            output += ">" + (pretty ? "\n" : "")
            for (let child of this.children) {
                output += (
                    child instanceof XMLType ?
                    child.toString(pretty, depth + 1) :
                    ("\t".repeat(pretty ? depth + 1 : 0) + XMLType.safeText(child))
                ) + (pretty ? "\n" : "")
            }
            output += "\t".repeat(pretty ? depth : 0) + `</${this.name}>`
        }

        return output
    }
    
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        const childrenLimit = 50

        let output = `<${this.name}`

        for (let [attr, value] of Object.entries(this.attributes)) {
            output += ` ${attr}="${XMLType.safeText(value)}"`
        }

        if (this.children.length === 0) {
            output += " />"
        } else {
            output += ">\n"

            for (let child of this.children.slice(0, childrenLimit)) {
                output += "\t"
                if (child instanceof XMLType) {
                    output += `<${child.name}`
                    for (let [attr, value] of Object.entries(child.attributes)) {
                        output += ` ${attr}="${XMLType.safeText(value)}"`
                    }
                    if (child.children.length === 0) {
                        output += " />"
                    } else {
                        output += `>...</${child.name}>`
                    }
                } else {
                    output += `"${XMLType.safeDisplayText(child)}"`
                }
                output += "\n"
            }

            if (this.children.length > childrenLimit) {
                output += `\t... (${this.children.length - childrenLimit} nodes)\n`
            }

            output += `</${this.name}>`
        }

        return span(output)
    }

    serialize() {
        return {
            name: this.name,
            children: this.children.map(v => v instanceof XMLType ? v.serialize() : v),
            attributes: this.attributes
        }
    }

    static deserialize(data) {
        return new XMLType(
            data.name,
            data.children.map(v => (typeof v === "object" && v !== null) ? XMLType.deserialize(v) : v),
            data.attributes
        )
    }
}

let XML = {
    Type: XMLType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.INDENTED,
        forceOutputType: "jwXML",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.INDENTED,
        check: ["jwXML"],
        exemptFromNormalization: true
    },
    fxp
}

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
}

class Extension {
    constructor() {
        vm.jwXML = XML
        vm.runtime.registerSerializer(
            "jwXML", 
            v => v.serialize(), 
            v => XML.Type.deserialize(v)
        );

        if (!vm.jwArray) vm.extensionManager.loadExtensionIdSync('jwArray')
        jwArray = vm.jwArray
    }

    getInfo() {
        return {
            id: "jwXML",
            name: "XML",
            color1: "#8dd941",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDExMiwgMTczLCA1Mik7IGZpbGw6IHJnYigxNDEsIDIxNywgNjUpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDguMjg3IDYuMjE0IEwgNC41IDEzLjc4NiBNIDEyLjA3MyA2LjIxNCBMIDE1Ljg2IDEwIEwgMTIuMDczIDEzLjc4NiIgc3Ryb2tlPSIjZmZmIiBmaWxsPSJub25lIiBzdHlsZT0ic3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2Utd2lkdGg6IDJweDsiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: "newNode",
                    text: "new node [NAME]",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        }
                    },
                    ...XML.Block
                },
                {
                    opcode: "parse",
                    text: "parse [INPUT] as node",
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: '<name />',
                            exemptFromNormalization: true
                        }
                    },
                    ...XML.Block
                },
                {
                    opcode: "parseMultiple",
                    text: "parse [INPUT] as nodes",
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: '<one /><two />',
                            exemptFromNormalization: true
                        }
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: "getName",
                    text: "name of [NODE]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NODE: XML.Argument
                    }
                },
                {
                    opcode: "setName",
                    text: "set name of [NODE] to [NAME]",
                    arguments: {
                        NODE: XML.Argument,
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        }
                    },
                    ...XML.Block
                },
                "---",
                {
                    opcode: "appendChild",
                    text: "append [CHILD] to [NODE]",
                    arguments: {
                        CHILD: {
                            type: ArgumentType.STRING,
                            defaultValue: 'text / node',
                            exemptFromNormalization: true
                        },
                        NODE: XML.Argument
                    },
                    ...XML.Block
                },
                {
                    opcode: "removeChildren",
                    text: "remove children of [NODE]",
                    arguments: {
                        NODE: XML.Argument
                    },
                    ...XML.Block
                },

                {
                    opcode: "getChildren",
                    text: "children of [NODE]",
                    arguments: {
                        NODE: XML.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: "setChildren",
                    text: "set children of [NODE] to [CHILDREN]",
                    arguments: {
                        NODE: XML.Argument,
                        CHILDREN: jwArray.Argument
                    },
                    ...XML.Block
                },
                "---",
                {
                    opcode: "getAttribute",
                    text: "attribute [ATTRIBUTE] of [NODE]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ATTRIBUTE: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        },
                        NODE: XML.Argument
                    },
                },
                {
                    opcode: "setAttribute",
                    text: "set attribute [ATTRIBUTE] of [NODE] to [VALUE]",
                    arguments: {
                        ATTRIBUTE: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        },
                        NODE: XML.Argument,
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "value"
                        },
                    },
                    ...XML.Block
                },
                {
                    opcode: "removeAttribute",
                    text: "remove attribute [ATTRIBUTE] of [NODE]",
                    arguments: {
                        ATTRIBUTE: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        },
                        NODE: XML.Argument
                    },
                    ...XML.Block
                },
                {
                    opcode: "removeAttributes",
                    text: "remove all attributes of [NODE]",
                    arguments: {
                        NODE: XML.Argument
                    },
                    ...XML.Block
                },
                {
                    opcode: "hasAttribute",
                    text: "[NODE] has attribute [ATTRIBUTE]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        NODE: XML.Argument,
                        ATTRIBUTE: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        }
                    }
                },
                {
                    opcode: "getAttributes",
                    text: "attributes of [NODE]",
                    arguments: {
                        NODE: XML.Argument
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: "toString",
                    text: "stringify [NODE] [FORMAT]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NODE: XML.Argument,
                        FORMAT: {
                            menu: "stringifyFormat",
                            defaultValue: "compact"
                        }
                    }
                },
                "---",
                {
                    opcode: "validName",
                    text: "is [NAME] valid name",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        }
                    }
                },
                {
                    opcode: "toStringSafe",
                    text: "make [TEXT] XML safe",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: '<unsafe>'
                        }
                    }
                },
                {
                    opcode: "filterArray",
                    text: "elements named [NAME] in [INPUT]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "name"
                        },
                        INPUT: jwArray.Argument
                    },
                    ...jwArray.Block,
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

    newNode({NAME}) {
        NAME = Cast.toString(NAME)

        return new XML.Type(XML.Type.safeName(NAME))
    }

    parse({INPUT}) {
        return XML.Type.toXML(INPUT)
    }

    parseMultiple({INPUT}) {
        if (INPUT instanceof XML.Type) return new jwArray.Type([INPUT], true)
        if (INPUT instanceof jwArray.Type) return new jwArray.Type(INPUT.array.map(v => XML.Type.toXML(v)), true)

        return new jwArray.Type(XML.Type.stringToMultiple(Cast.toString(INPUT)), true)
    }

    getName({NODE}) {
        NODE = XML.Type.toXML(NODE)
        
        return NODE.name
    }

    setName({NODE, NAME}) {
        NODE = XML.Type.toXML(NODE)
        NAME = Cast.toString(NAME)

        NODE.name = XML.Type.safeName(NAME)
        return NODE
    }

    appendChild({NODE, CHILD}) {
        NODE = XML.Type.toXML(NODE)
        CHILD = XML.Type.forXML(CHILD)

        NODE.children.push(CHILD)
        return NODE
    }

    removeChildren({NODE}) {
        NODE = XML.Type.toXML(NODE)

        NODE.children = []
        return NODE
    }

    getChildren({NODE}) {
        NODE = XML.Type.toXML(NODE)

        return new jwArray.Type(NODE.children, true)
    }

    setChildren({NODE, CHILDREN}) {
        NODE = XML.Type.toXML(NODE)
        CHILDREN = jwArray.Type.toArray(CHILDREN).array.map(v => XML.Type.forXML(v))

        NODE.children = CHILDREN
        return NODE
    }

    getAttribute({NODE, ATTRIBUTE}) {
        NODE = XML.Type.toXML(NODE)
        ATTRIBUTE = Cast.toString(ATTRIBUTE)

        return NODE.attributes[ATTRIBUTE] === undefined ? "" : NODE.attributes[ATTRIBUTE]
    }

    setAttribute({NODE, ATTRIBUTE, VALUE}) {
        NODE = XML.Type.toXML(NODE)
        ATTRIBUTE = Cast.toString(ATTRIBUTE)
        VALUE = Cast.toString(VALUE)

        if (this.validName({NAME: ATTRIBUTE})) {
            NODE.attributes[ATTRIBUTE] = VALUE
        }

        return NODE
    }

    removeAttribute({NODE, ATTRIBUTE}) {
        NODE = XML.Type.toXML(NODE)
        ATTRIBUTE = Cast.toString(ATTRIBUTE)

        delete NODE.attributes[ATTRIBUTE]
        return NODE
    }

    removeAttributes({NODE}) {
        NODE = XML.Type.toXML(NODE)

        NODE.attributes = {}
        return NODE
    }

    hasAttribute({NODE, ATTRIBUTE}) {
        NODE = XML.Type.toXML(NODE)
        ATTRIBUTE = Cast.toString(ATTRIBUTE)

        return NODE.attributes[ATTRIBUTE] !== undefined
    }

    getAttributes({NODE}) {
        NODE = XML.Type.toXML(NODE)

        return new jwArray.Type(Object.keys(NODE.attributes), true)
    }

    toString({NODE, FORMAT}) {
        NODE = XML.Type.toXML(NODE)

        return NODE.toString(FORMAT === "pretty")
    }

    validName({NAME}) {
        NAME = Cast.toString(NAME)

        return XML.Type.safeName(NAME) === NAME
    }

    toStringSafe({TEXT}) {
        TEXT = Cast.toString(TEXT)

        return XML.Type.safeText(TEXT)
    }

    filterArray({NAME, INPUT}) {
        NAME = Cast.toString(NAME)
        INPUT = jwArray.Type.toArray(INPUT)

        if (!this.validName({NAME})) return new jwArray.Type([], true)
        INPUT.array = INPUT.array.filter(v => v instanceof XML.Type && v.name === NAME)

        return INPUT
    }
}

module.exports = Extension