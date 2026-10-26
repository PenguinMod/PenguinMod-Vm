const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');

class Extension {
    getInfo() {
        return {
            id: "jwXml",
            name: "XML",
            color1: "#ffbb3d",
            color2: "#cc9837",
            blocks: [
                {
                    opcode: 'createNewXML',
                    text: "generate xml [ROOT] with:",
                    arguments: {
                        ROOT: {
                            type: ArgumentType.STRING,
                            defaultValue: "root"
                        }
                    },
                    blockType: BlockType.CONDITIONAL
                },
                {
                    opcode: 'addText',
                    text: "add text [TEXT]",
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'addChild',
                    text: "add child [CHILD]",
                    arguments: {
                        CHILD: {}
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'addAttribute',
                    text: "add attribute [ATT] as [TEXT]",
                    arguments: {
                        ATT: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        },
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "bar"
                        }
                    },
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'generated',
                    text: "xml generated",
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'clear',
                    text: "clear (ADVANCED)",
                    blockType: BlockType.COMMAND
                },
                "---",
                {
                    opcode: 'getChild',
                    text: "get child [NUM] from [XML]",
                    arguments: {
                        NUM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getNamed',
                    text: "get element [STR] from [XML]",
                    arguments: {
                        STR: {
                            type: ArgumentType.STRING,
                            defaultValue: "element"
                        }
                    },
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getAttr',
                    text: "get attribute [ATT] from [XML]",
                    arguments: {
                        ATT: {
                            type: ArgumentType.STRING,
                            defaultValue: "attribute"
                        }
                    },
                    blockType: BlockType.REPORTER
                }
            ]
        };
    }

    xmlsInGeneration = []

    _XMLToString(xml) {
        return xml.outerHTML
    }

    _StringToXML(str) {
        return new DOMParser().parseFromString(str, 'application/xml').firstChild;
    }

    createNewXML({ROOT}, util) {
        this.xmlsInGeneration.unshift(document.createElement(ROOT))
        util.startBranch(1, false)
    }

    addText({TEXT}) {
        this.xmlsInGeneration[0].append(TEXT)
    }

    addChild({CHILD}) {
        CHILD = this._StringToXML(CHILD)
        this.xmlsInGeneration[0].appendChild(CHILD)
    }

    addAttribute({ATT, TEXT}) {
        this.xmlsInGeneration[0].setAttribute(ATT, TEXT)
    }

    generated() {
        try {
            return this._XMLToString(this.xmlsInGeneration[0])
        } catch {
            return ""
        }
    }

    clear() {
        this.xmlsInGeneration.shift()
    }

    getChild({NUM, XML}) {
        try {
            NUM -= 1
            XML = this._StringToXML(XML)
            return ((typeof XML.childNodes[NUM]) !== 'string' ? this._XMLToString(XML.childNodes[NUM]) : XML.childNodes[NUM]) || ""
        } catch {
            return ""
        }
    }

    getNamed({STR, XML}) {
        try {
            XML = this._StringToXML(XML)
            return this._XMLToString(Array.from(XML.children).find((el) => el.localName == "".toLowerCase())) || ""
        } catch {
            return ""
        }
    }

    getAttr({ATT, XML}) {
        try {
            XML = this._StringToXML(XML)
            return XML.getAttribute(ATT) || ""
        } catch {
            return ""
        }
    }
}

module.exports = Extension