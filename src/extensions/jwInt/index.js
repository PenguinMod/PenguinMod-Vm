const BlockType = require('../../extension-support/block-type');
const BlockShape = require('../../extension-support/block-shape');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

function span(text) {
    let el = document.createElement('span');
    el.innerHTML = text;
    el.style.display = 'hidden';
    el.style.whiteSpace = 'nowrap';
    el.style.width = '100%';
    el.style.textAlign = 'center';
    return el
}

class IntType {
    customId = "jwInt"

    constructor(x = 0n) {
        this.number = x;
    }

    static toInt(x) {
        if (x instanceof IntType) return x;

        x = Cast.toString(x).replaceAll(/\s+/g, "");

        let match = /([+-])?([0-9]+(?:\.[0-9]*)?)?e([+-])?([0-9]+)/g.exec(x);
        if (match) {
            let sign = match[1] == "-" ? -1n : 1n;
            let exp = (match[3] == "-" ? -1n : 1n) * BigInt(match[4]);

            let temp = (match[2] ?? "1").split(".");
            temp[1] ??= "";
            temp[0] = temp[0].replace(/^0+/g, "");
            temp[1].replace(/0+$/g, "");

            let mant;
            mant = temp[1];
            exp -= BigInt(temp[1].length);
            if (temp[0].length > 0) {
                mant = temp[0] + mant;
            }

            if (exp < 0n) {
                mant = mant.slice(0, -Number(exp));
                exp = 0n;
            }

            x = sign * BigInt(mant) * 10n ** exp;
            return new IntType(x);
        }

        try {
            return new IntType(BigInt(x));
        } catch (e) {}
        try {
            x = Math.round(Cast.toNumber(x));
            return new IntType(BigInt(x));
        } catch (e) {}
        return new IntType();
    }

    jwArrayHandler() {
        if (this.number >= BigInt(1e6)) {
            return this.toExponential(4);
        } else {
            return this.toString();
        }
    }

    toString(radix = 10) {
        return this.number.toString(radix);
    }

    toExponential(precision) {
        let str = this.toString();
        let exp = str.length - 1;
        let mant = str.replace(/0+$/, "");
        if (precision !== undefined) mant = mant.substring(0, precision + 1);
        mant = mant.length == 1 ? mant : (mant.substring(0, 1) + "." + mant.substring(1));
        return mant + "e+" + exp;
    }
    
    toMonitorContent = () => span(this.toString())
    toReporterContent = () => span(this.toString())
}

const jwInt = {
    Type: IntType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.BUMPED,
        forceOutputType: "jwInt",
        disableMonitor: true
    },
    Argument: {
        type: ArgumentType.STRING,
        defaultValue: "10",
        exemptFromNormalization: true
    },
}

class Extension {
    constructor() {
        vm.jwInt = jwInt;
        vm.runtime.registerSerializer(
            "jwInt",
            v => v.number.toString(),
            v => new IntType(BigInt(v))
        );
    }

    getInfo() {
        return {
            id: "jwInt",
            name: "Integers",
            color1: "#fc874a",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYigyNTIsIDEzNSwgNzQpOyBzdHJva2U6IHJnYigyMDIsIDEwOCwgNTkpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5LjUiIHJ5PSI5LjUiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDYuMjY4IDYuMjY4IEwgNi4yNjggNS4zMzYgTCAxMy43MzIgNS4zMzYgTCA5LjA2NyAxNC42NjQgTCA2LjI2OCAxNC42NjQgTCAxMC45MzMgNS4zMzYgTSAxMy43MzIgMTMuNzMyIEwgMTMuNzMyIDE0LjY2NCBMIDYuMjY4IDE0LjY2NCIgc3Ryb2tlPSIjZmZmIiBmaWxsPSJub25lIiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2Utd2lkdGg6IDEuNXB4OyI+PC9wYXRoPgo8L3N2Zz4=",
            blocks: [
                {
                    opcode: "parse",
                    text: "parse [INPUT] as integer",
                    arguments: {
                        INPUT: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                "---",
                {
                    opcode: "add",
                    text: "[A] + [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "sub",
                    text: "[A] - [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "mul",
                    text: "[A] * [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "div",
                    text: "[A] / [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "pow",
                    text: "[A] ^ [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "mod",
                    text: "[A] % [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                "---",
                {
                    opcode: "eq",
                    text: "[A] = [B]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    }
                },
                {
                    opcode: "gt",
                    text: "[A] > [B]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    }
                },
                {
                    opcode: "gte",
                    text: "[A] >= [B]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    }
                },
                {
                    opcode: "lt",
                    text: "[A] < [B]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    }
                },
                {
                    opcode: "lte",
                    text: "[A] <= [B]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    }
                },
                "---",
                {
                    opcode: "and",
                    text: "[A] and [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "or",
                    text: "[A] or [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "xor",
                    text: "[A] xor [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "shiftLeft",
                    text: "[A] << [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "shiftRight",
                    text: "[A] >> [B]",
                    arguments: {
                        A: jwInt.Argument,
                        B: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "not",
                    text: "~ [INT]",
                    arguments: {
                        INT: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                "---",
                {
                    opcode: "mathop",
                    text: "[MATHOP] of [INPUT]",
                    arguments: {
                        MATHOP: {
                            defaultValue: "abs",
                            menu: "mathop"
                        },
                        INPUT: jwInt.Argument
                    },
                    ...jwInt.Block
                },
                {
                    opcode: "truncate",
                    text: "truncate [INT] to [BITS] bits [SIGN]",
                    arguments: {
                        INT: jwInt.Argument,
                        BITS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        SIGN: {
                            defaultValue: "signed",
                            menu: "sign"
                        }
                    },
                    ...jwInt.Block
                },
                "---",
                {
                    opcode: "stringify",
                    text: "stringify [INPUT] [FORMAT]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: jwInt.Argument,
                        FORMAT: {
                            defaultValue: "default",
                            menu: "stringifyFormat"
                        }
                    }
                }
            ],
            menus: {
                mathop: {
                    acceptReporters: false,
                    items: [
                        "abs",
                        "log",
                        "sign"
                    ]
                },
                sign: {
                    acceptReporters: false,
                    items: [
                        "signed",
                        "unsigned"
                    ]
                },
                stringifyFormat: {
                    acceptReporters: false,
                    items: [
                        "default",
                        "scientific",
                        "binary",
                        "hexadecimal",
                        "octal"
                    ]
                }
            }
        }
    }

    parse({INPUT}) {
        return jwInt.Type.toInt(INPUT);
    }

    add({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number + B.number)
    }

    sub({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number - B.number)
    }

    mul({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number * B.number)
    }

    div({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        if (B.number === 0n) return new jwInt.Type();
        return new jwInt.Type(A.number / B.number);
    }

    pow({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        if (A.number == 1n) return new jwInt.Type(1n);
        if (A.number == -1n) return new jwInt.Type(B.number % 2 === 0n ? 1n : -1n);
        if (B.number < 0n) return new jwInt.Type();
        return new jwInt.Type(A.number ** B.number);
    }

    mod({A, B}) {
        A = jwInt.Type.toInt(A);
        B = jwInt.Type.toInt(B);
        if (B.number === 0n) return new jwInt.Type();
        let result = A.number % B.number;
        if (result / B.number < 0n) result += B.number;
        return new jwInt.Type(result);
    }

    eq({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return A.number == B.number
    }

    gt({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return A.number > B.number
    }

    gte({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return A.number >= B.number
    }

    lt({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return A.number < B.number
    }

    lte({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return A.number <= B.number
    }

    and({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number & B.number)
    }

    or({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number | B.number)
    }

    xor({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number ^ B.number)
    }

    shiftLeft({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number << B.number)
    }

    shiftRight({A, B}) {
        A = jwInt.Type.toInt(A)
        B = jwInt.Type.toInt(B)
        return new jwInt.Type(A.number >> B.number)
    }

    not({INT}) {
        INT = jwInt.Type.toInt(INT);
        return new jwInt.Type(~INT.number);
    }

    mathop({MATHOP, INPUT}) {
        INPUT = jwInt.Type.toInt(INPUT);
        switch (MATHOP) {
            case "abs":
                return new jwInt.Type(INPUT.number > 0n ? INPUT.number : -INPUT.number);
            case 'log':
                if (INPUT.number < 1n) return new jwInt.Type(-1n);
                else return new jwInt.Type(INPUT.number.toString().length - 1);
            case "sign":
                if (INPUT.number === 0n) return new jwInt.Type();
                else if (INPUT.number > 0n) return new jwInt.Type(1n);
                else return new jwInt.Type(-1n);
            default: 
                return INPUT;
        }
    }

    truncate({INT, BITS, SIGN}) {
        INT = jwInt.Type.toInt(INT);
        BITS = Cast.toNumber(BITS);
        
        if (BITS < 0) return new jwInt.Type();

        try {
            switch (SIGN) {
                case "signed":
                    return new jwInt.Type(BigInt.asIntN(BITS, INT.number));
                case "unsigned":
                    return new jwInt.Type(BigInt.asUintN(BITS, INT.number));
            }
        } catch (e) {}

        return INT;
    }

    stringify({INPUT, FORMAT}) {
        INPUT = jwInt.Type.toInt(INPUT)
        switch (FORMAT) {
            case "scientific":
                return INPUT.toExponential();
            case "binary":
                return "0b" + INPUT.toString(2);
            case "hexadecimal":
                return "0x" + INPUT.toString(16);
            case "octal":
                return "0o" + INPUT.toString(8);
            default:
                return INPUT.toString();
        }
    }
}

module.exports = Extension;