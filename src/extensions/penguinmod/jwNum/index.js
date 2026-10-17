const BlockType = require('../../../extension-support/block-type')
const BlockShape = require('../../../extension-support/block-shape')
const ArgumentType = require('../../../extension-support/argument-type')
const Cast = require('../../../util/cast')

const ExpantaNum = require('./expantanum.js')

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

class NumType {
    customId = "jwNum"

    number = ExpantaNum(0)

    constructor(x) {
        this.number = ExpantaNum(x)
    }

    static toNum(x) {
        if (x instanceof NumType) return new NumType(x.number)
        try {
            let parsed = JSON.parse(x)
            if (typeof parsed == 'object') return new NumType(parsed)
        } catch {}
        return new NumType(x)
    }

    jwArrayHandler() {
        return this.number.toStringWithDecimalPlaces(3)
    }

    toString() {
        return this.number.toStringWithDecimalPlaces(7)
    }
    toMonitorContent = () => span(this.toString())
    toReporterContent = () => span(this.toString())
}

const jwNum = {
    Type: NumType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "jwNum",
        disableMonitor: true
    },
    Argument: {
        type: ArgumentType.STRING,
        defaultValue: "10",
        exemptFromNormalization: true
    },
    ExpantaNum
}

class Extension {
    constructor() {
        vm.jwNum = jwNum
        vm.runtime.registerSerializer(
            "jwNum",
            v => v.number.toJSON(),
            v => {
                let x = new ExpantaNum(0)
                try {
                    x = ExpantaNum.fromJSON(v)
                } catch {}
                return new jwNum.Type(x)
            }
        )
    }

    getInfo() {
        return {
            id: "jwNum",
            name: "Infinity",
            color: "#3bd471",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS13aWR0aDogMjsgcGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogcmdiKDU5LCAyMTIsIDExMyk7IHN0cm9rZTogcmdiKDQ3LCAxNjksIDkwKTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOSIgcnk9IjkiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDEzLjU3OSAxMy40NTYgQyAxMi45NTkgMTMuNDU2IDEyLjQyMSAxMy4zNjMgMTEuOTY1IDEzLjE3OSBDIDExLjUwOCAxMi45OTMgMTEuMTE3IDEyLjc0OSAxMC43OTEgMTIuNDQ1IEMgMTAuNDY1IDEyLjE0MSAxMC4xNzcgMTEuODEyIDkuOTI3IDExLjQ1OSBDIDkuNjc3IDExLjEwNSA5LjQ0MyAxMC43NDQgOS4yMjYgMTAuMzc1IEMgOS4wMDggMTAuMDA1IDguNzc4IDkuNjcxIDguNTM0IDkuMzcyIEMgOC4yODkgOS4wNzMgOC4wMTUgOC44MzEgNy43MTEgOC42NDcgQyA3LjQwNiA4LjQ2MiA3LjA0MiA4LjM3IDYuNjE4IDguMzcgQyA2LjMwMyA4LjM3IDYuMDIxIDguNDQzIDUuNzcxIDguNTkgQyA1LjUyMSA4LjczNiA1LjMyNSA4LjkyOSA1LjE4NCA5LjE2OSBDIDUuMDQyIDkuNDA3IDQuOTcyIDkuNjg0IDQuOTcyIDEwIEMgNC45NzIgMTAuMzA0IDUuMDQyIDEwLjU3OCA1LjE4NCAxMC44MjMgQyA1LjMyNSAxMS4wNjcgNS41MjEgMTEuMjYzIDUuNzcxIDExLjQxIEMgNi4wMjEgMTEuNTU2IDYuMzAzIDExLjYzIDYuNjE4IDExLjYzIEMgNy4wNDIgMTEuNjMgNy40MDYgMTEuNTM3IDcuNzExIDExLjM1MyBDIDguMDE1IDExLjE2OCA4LjI4OSAxMC45MjYgOC41MzQgMTAuNjI4IEMgOC43NzggMTAuMzI4IDkuMDA4IDkuOTk5IDkuMjI2IDkuNjQxIEMgOS40NDMgOS4yODMgOS42NzcgOC45MjEgOS45MjcgOC41NTcgQyAxMC4xNzcgOC4xOTMgMTAuNDY1IDcuODU5IDEwLjc5MSA3LjU1NSBDIDExLjExNyA3LjI1MSAxMS41MDggNy4wMDYgMTEuOTY1IDYuODIyIEMgMTIuNDIxIDYuNjM2IDEyLjk1OSA2LjU0NCAxMy41NzkgNi41NDQgQyAxNC4yNDEgNi41NDQgMTQuODMzIDYuNjk2IDE1LjM1NSA3LjAwMSBDIDE1Ljg3NyA3LjMwNSAxNi4yOSA3LjcxMiAxNi41OTQgOC4yMjMgQyAxNi44OTggOC43MzMgMTcuMDUgOS4zMiAxNy4wNSA5Ljk4NCBDIDE3LjA1IDEwLjY0NiAxNi44OTggMTEuMjM4IDE2LjU5NCAxMS43NiBDIDE2LjI5IDEyLjI4MiAxNS44NzcgMTIuNjk1IDE1LjM1NSAxMi45OTkgQyAxNC44MzMgMTMuMzAzIDE0LjI0MSAxMy40NTYgMTMuNTc5IDEzLjQ1NiBaIE0gNi40NTUgMTMuNDU2IEMgNS43OTIgMTMuNDU2IDUuMTk0IDEzLjMwMyA0LjY2MiAxMi45OTkgQyA0LjEzIDEyLjY5NSAzLjcxMSAxMi4yODIgMy40MDcgMTEuNzYgQyAzLjEwMyAxMS4yMzggMi45NTEgMTAuNjUyIDIuOTUxIDEwIEMgMi45NTEgOS4zMzcgMy4xMDMgOC43NDcgMy40MDcgOC4yMzEgQyAzLjcxMSA3LjcxNSA0LjEzIDcuMzA1IDQuNjYyIDcuMDAxIEMgNS4xOTQgNi42OTYgNS43OTIgNi41NDQgNi40NTUgNi41NDQgQyA3LjA2MyA2LjU0NCA3LjU5NiA2LjYzNiA4LjA1MyA2LjgyMiBDIDguNTA5IDcuMDA2IDguOSA3LjI1MSA5LjIyNiA3LjU1NSBDIDkuNTUyIDcuODU5IDkuODQgOC4xOSAxMC4wOSA4LjU0OSBDIDEwLjM0IDguOTA3IDEwLjU3NiA5LjI2OSAxMC43OTkgOS42MzMgQyAxMS4wMjIgOS45OTcgMTEuMjUgMTAuMzI4IDExLjQ4NCAxMC42MjggQyAxMS43MTcgMTAuOTI2IDExLjk4OSAxMS4xNjggMTIuMjk5IDExLjM1MyBDIDEyLjYwOSAxMS41MzcgMTIuOTcgMTEuNjMgMTMuMzgzIDExLjYzIEMgMTMuNjk4IDExLjYzIDEzLjk4MSAxMS41NTkgMTQuMjMxIDExLjQxOCBDIDE0LjQ4IDExLjI3NiAxNC42NzMgMTEuMDgxIDE0LjgwOSAxMC44MzEgQyAxNC45NDUgMTAuNTgxIDE1LjAxMyAxMC4yOTggMTUuMDEzIDkuOTg0IEMgMTUuMDEzIDkuNjc5IDE0Ljk0NSA5LjQwNSAxNC44MDkgOS4xNjEgQyAxNC42NzMgOC45MTYgMTQuNDggOC43MjMgMTQuMjMxIDguNTgyIEMgMTMuOTgxIDguNDQgMTMuNjk4IDguMzcgMTMuMzgzIDguMzcgQyAxMi45NyA4LjM3IDEyLjYwOSA4LjQ2MiAxMi4yOTkgOC42NDcgQyAxMS45ODkgOC44MzEgMTEuNzE3IDkuMDczIDExLjQ4NCA5LjM3MiBDIDExLjI1IDkuNjcxIDExLjAyMiAxMC4wMDMgMTAuNzk5IDEwLjM2NyBDIDEwLjU3NiAxMC43MzEgMTAuMzQgMTEuMDkyIDEwLjA5IDExLjQ1MSBDIDkuODQgMTEuODA5IDkuNTUyIDEyLjE0MSA5LjIyNiAxMi40NDUgQyA4LjkgMTIuNzQ5IDguNTA5IDEyLjk5MyA4LjA1MyAxMy4xNzkgQyA3LjU5NiAxMy4zNjMgNy4wNjMgMTMuNDU2IDYuNDU1IDEzLjQ1NiBaIiBzdHlsZT0iZmlsbDogcmdiKDI1NSwgMjU1LCAyNTUpOyB0ZXh0LXdyYXAtbW9kZTogbm93cmFwOyBzdHJva2Utd2lkdGg6IDE7Ij48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: 'add',
                    text: '[A] + [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'sub',
                    text: '[A] - [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'mul',
                    text: '[A] * [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'div',
                    text: '[A] / [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'pow',
                    text: '[A] ^ [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'fact',
                    text: '[A]!',
                    arguments: {
                        A: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                "---",
                {
                    opcode: 'eq',
                    text: '[A] = [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    }
                },
                {
                    opcode: 'gt',
                    text: '[A] > [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    }
                },
                {
                    opcode: 'gte',
                    text: '[A] >= [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    }
                },
                {
                    opcode: 'lt',
                    text: '[A] < [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    }
                },
                {
                    opcode: 'lte',
                    text: '[A] <= [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    }
                },
                "---",
                {
                    opcode: 'root',
                    text: 'root [A] [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'ssqrt',
                    text: 'square super-root [A]',
                    arguments: {
                        A: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'log',
                    text: 'log [A] [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'slog',
                    text: 'super log [A] [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                "---",
                {
                    opcode: 'mod',
                    text: '[A] % [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'round',
                    text: '[A] [B]',
                    arguments: {
                        A: {
                            type: ArgumentType.STRING,
                            menu: 'round',
                            defaultValue: 'round'
                        },
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'isInteger',
                    text: 'is [A] an integer?',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwNum.Argument
                    }
                },
                "---",
                {
                    opcode: 'hyper',
                    text: '[A] hyper [B] [C]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument,
                        C: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'arrow',
                    text: '[A] arrow [B] [C]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument,
                        C: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'reverseArrow',
                    text: '[C] reverse arrow [B] [A]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument,
                        C: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                {
                    opcode: 'expansion',
                    text: '[A] expansion [B]',
                    arguments: {
                        A: jwNum.Argument,
                        B: jwNum.Argument
                    },
                    ...jwNum.Block
                },
                "---",
                {
                    opcode: 'toString',
                    text: '[A] to string',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        A: jwNum.Argument
                    }
                },
                {
                    opcode: 'toStringD',
                    text: '[A] to string with [B] decimal places',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        A: jwNum.Argument,
                        B: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 20,
                        }
                    }
                },
                {
                    opcode: 'toHyperE',
                    text: '[A] to hyper E',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        A: jwNum.Argument
                    }
                }
            ],
            menus: {
                round: {
                    acceptReporters: true,
                    items: [
                        'ceil',
                        'round',
                        'floor'
                    ]
                },
            }
        }
    }

    add({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.add(B.number))
    }

    sub({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.sub(B.number))
    }

    mul({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.mul(B.number))
    }

    div({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.div(B.number))
    }

    pow({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.pow(B.number))
    }

    fact({A}) {
        A = jwNum.Type.toNum(A)

        return new jwNum.Type(A.number.fact())
    }

    eq({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return A.number.eq(B.number)
    }

    gt({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return A.number.gt(B.number)
    }

    gte({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return A.number.gte(B.number)
    }

    lt({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return A.number.lt(B.number)
    }

    lte({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return A.number.lte(B.number)
    }

    root({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(B.number.root(A.number))
    }

    ssqrt({A}) {
        A = jwNum.Type.toNum(A)

        return new jwNum.Type(A.number.ssqrt())
    }

    log({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(B.number.logBase(A.number))
    }

    slog({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(B.number.slog(A.number))
    }

    mod({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.mod(B.number))
    }

    round({A, B}) {
        A = Cast.toString(A).toLowerCase()
        B = jwNum.Type.toNum(B)

        switch (A) {
            case "ceiling":
            case "ceil":
                return new jwNum.Type(B.number.ceil())
            case "round":
                return new jwNum.Type(B.number.round())
            case "floor":
                return new jwNum.Type(B.number.floor())
            default: return new jwNum.Type(B)
        }
    }

    isInteger({A}) {
        A = jwNum.Type.toNum(A)

        return A.number.isint()
    }

    hyper({A, B, C}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)
        C = jwNum.Type.toNum(C)

        return new jwNum.Type(ExpantaNum.hyper(B.number)(A.number, C.number))
    }

    arrow({A, B, C}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)
        C = jwNum.Type.toNum(C)

        return new jwNum.Type(A.number.arrow(B.number)(C.number))
    }

    reverseArrow({A, B, C}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)
        C = jwNum.Type.toNum(C)

        return new jwNum.Type(A.number.arrow_height_inverse(B.number)(C.number))
    }

    expansion({A, B}) {
        A = jwNum.Type.toNum(A)
        B = jwNum.Type.toNum(B)

        return new jwNum.Type(A.number.expansion(B.number))
    }

    toString({A}) {
        A = jwNum.Type.toNum(A)

        return A.number.toString()
    }

    toStringD({A, B}) {
        A = jwNum.Type.toNum(A)
        B = Cast.toNumber(B)

        return A.number.toStringWithDecimalPlaces(Math.max(Math.min(99, B), 0))
    }

    toHyperE({A}) {
        A = jwNum.Type.toNum(A)

        return A.number.toHyperE()
    }
}

module.exports = Extension