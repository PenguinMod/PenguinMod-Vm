const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

class DateType {
    customId = "jwDate"

    date = new Date(0)

    constructor(date = new Date(0)) {
        this.date = date
    }

    static from(x) {
        if (x instanceof DateType) return new DateType(x.date)
        if (x instanceof Date) return new DateType(x)
        if (typeof x == 'number' || Number(x) == x) return new DateType(new Date(Number(x)))
        if (typeof x == 'string') return new DateType(new Date(x))
        return new DateType()
    }

    jwArrayHandler(expectsPlainString, context) {
        return this.date.toLocaleDateString()
    }

    toString() {
        return this.date.toLocaleString()
    }
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.flexDirection = 'column'
        root.style.justifyContent = 'center'

        root.appendChild(span(this.date.toLocaleDateString()))
        root.appendChild(span(this.date.toLocaleTimeString()))

        return root
    }
}

const jwDate = {
    Type: DateType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.TICKET,
        forceOutputType: "jwDate",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.TICKET,
        check: ["jwDate"]
    }
}

class Extension {
    constructor() {
        vm.jwDate = jwDate
        vm.runtime.registerSerializer(
            "jwDate",
            v => v.date.valueOf(),
            v => jwDate.Type.from(v)
        )
    }

    getInfo() {
        return {
            id: "jwDate",
            name: "Dates",
            color1: "#ff788a",
            blocks: [
                {
                    opcode: 'now',
                    text: 'now',
                    ...jwDate.Block
                },
                {
                    opcode: 'epoch',
                    text: 'unix epoch',
                    ...jwDate.Block
                },
                {
                    opcode: 'parse',
                    text: 'parse [INPUT]',
                    arguments: {
                        INPUT: {
                            type: ArgumentType.String,
                            defaultValue: "1/1/1970 01:23",
                            exemptFromNormalization: true
                        }
                    },
                    ...jwDate.Block
                }
            ],
            menus: {}
        }
    }

    now() {
        return jwDate.Type.from(Date.now())
    }

    epoch() {
        return jwDate.Type.from(0)
    }

    parse({INPUT}) {
        return jwDate.Type.from(INPUT)
    }
}

module.exports = Extension