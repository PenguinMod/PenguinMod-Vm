const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

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
            color1: "#3bd471",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS13aWR0aDogMnB4OyBwYWludC1vcmRlcjogc3Ryb2tlOyBmaWxsOiByZ2IoNTksIDIxMiwgMTEzKTsgc3Ryb2tlOiByZ2IoNTMsIDE5MCwgMTAyKTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOSIgcnk9IjkiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDEzLjU3OCAxMy42MTMgUSAxMi42NDggMTMuNjEzIDExLjk2NCAxMy4zMzYgUSAxMS4yNzkgMTMuMDU4IDEwLjc5IDEyLjYwMiBRIDEwLjMwMSAxMi4xNDYgOS45MjYgMTEuNjE2IFEgOS41NTEgMTEuMDg2IDkuMjI1IDEwLjUzMiBRIDguODk5IDkuOTc4IDguNTMzIDkuNTI5IFEgOC4xNjYgOS4wODEgNy43MSA4LjgwNCBRIDcuMjUzIDguNTI3IDYuNjE3IDguNTI3IFEgNi4xNDUgOC41MjcgNS43NyA4Ljc0NyBRIDUuMzk1IDguOTY3IDUuMTgzIDkuMzI2IFEgNC45NzEgOS42ODQgNC45NzEgMTAuMTU3IFEgNC45NzEgMTAuNjEzIDUuMTgzIDEwLjk4IFEgNS4zOTUgMTEuMzQ3IDUuNzcgMTEuNTY3IFEgNi4xNDUgMTEuNzg3IDYuNjE3IDExLjc4NyBRIDcuMjUzIDExLjc4NyA3LjcxIDExLjUxIFEgOC4xNjYgMTEuMjMzIDguNTMzIDEwLjc4NSBRIDguODk5IDEwLjMzNiA5LjIyNSA5Ljc5OCBRIDkuNTUxIDkuMjYxIDkuOTI2IDguNzE0IFEgMTAuMzAxIDguMTY4IDEwLjc5IDcuNzEyIFEgMTEuMjc5IDcuMjU2IDExLjk2NCA2Ljk3OSBRIDEyLjY0OCA2LjcwMSAxMy41NzggNi43MDEgUSAxNC41NzIgNi43MDEgMTUuMzU0IDcuMTU4IFEgMTYuMTM3IDcuNjE0IDE2LjU5MyA4LjM4IFEgMTcuMDQ5IDkuMTQ2IDE3LjA0OSAxMC4xNDEgUSAxNy4wNDkgMTEuMTM1IDE2LjU5MyAxMS45MTcgUSAxNi4xMzcgMTIuNyAxNS4zNTQgMTMuMTU2IFEgMTQuNTcyIDEzLjYxMyAxMy41NzggMTMuNjEzIFogTSA2LjQ1NCAxMy42MTMgUSA1LjQ2IDEzLjYxMyA0LjY2MSAxMy4xNTYgUSAzLjg2MyAxMi43IDMuNDA2IDExLjkxNyBRIDIuOTUgMTEuMTM1IDIuOTUgMTAuMTU3IFEgMi45NSA5LjE2MyAzLjQwNiA4LjM4OCBRIDMuODYzIDcuNjE0IDQuNjYxIDcuMTU4IFEgNS40NiA2LjcwMSA2LjQ1NCA2LjcwMSBRIDcuMzY3IDYuNzAxIDguMDUyIDYuOTc5IFEgOC43MzYgNy4yNTYgOS4yMjUgNy43MTIgUSA5LjcxNCA4LjE2OCAxMC4wODkgOC43MDYgUSAxMC40NjQgOS4yNDQgMTAuNzk4IDkuNzkgUSAxMS4xMzMgMTAuMzM2IDExLjQ4MyAxMC43ODUgUSAxMS44MzMgMTEuMjMzIDEyLjI5OCAxMS41MSBRIDEyLjc2MyAxMS43ODcgMTMuMzgyIDExLjc4NyBRIDEzLjg1NSAxMS43ODcgMTQuMjMgMTEuNTc1IFEgMTQuNjA0IDExLjM2MyAxNC44MDggMTAuOTg4IFEgMTUuMDEyIDEwLjYxMyAxNS4wMTIgMTAuMTQxIFEgMTUuMDEyIDkuNjg0IDE0LjgwOCA5LjMxOCBRIDE0LjYwNCA4Ljk1MSAxNC4yMyA4LjczOSBRIDEzLjg1NSA4LjUyNyAxMy4zODIgOC41MjcgUSAxMi43NjMgOC41MjcgMTIuMjk4IDguODA0IFEgMTEuODMzIDkuMDgxIDExLjQ4MyA5LjUyOSBRIDExLjEzMyA5Ljk3OCAxMC43OTggMTAuNTI0IFEgMTAuNDY0IDExLjA3IDEwLjA4OSAxMS42MDggUSA5LjcxNCAxMi4xNDYgOS4yMjUgMTIuNjAyIFEgOC43MzYgMTMuMDU4IDguMDUyIDEzLjMzNiBRIDcuMzY3IDEzLjYxMyA2LjQ1NCAxMy42MTMgWiIgc3R5bGU9ImZpbGw6IHJnYigyNTUsIDI1NSwgMjU1KTsgdGV4dC13cmFwLW1vZGU6IG5vd3JhcDsiPjwvcGF0aD4KPC9zdmc+",
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

        return A.number.toStringWithDecimalPlaces(B)
    }

    toHyperE({A}) {
        A = jwNum.Type.toNum(A)

        return A.number.toHyperE()
    }
}

module.exports = Extension