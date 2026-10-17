const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

const template = {
    extensions: ["colours_operators"]
};

function generateJoin(inputs) {
    return {
        opcode: `join${inputs}`,
        func: 'joinMultiple',
        text: `join${Array(inputs).fill().map((_, i) => ` [STRING${i + 1}]`).join("")}`,
        blockType: BlockType.REPORTER,
        arguments: Object.fromEntries(Array(inputs).fill().map((_, i) => [`STRING${i + 1}`, {
            type: ArgumentType.STRING
        }])),
        hideFromPalette: true,
        ...template
    };
}

class Extension {
    getInfo() {
        return {
            id: "pmOperatorsExpansion",
            name: "Operators Expansion",
            color: "#59c059",
            blocks: [
                //legacy joins
                generateJoin(4),
                generateJoin(5),
                generateJoin(6),
                generateJoin(7),
                generateJoin(8),
                generateJoin(9),

                {
                    opcode: "typeOfValue",
                    text: "type of [INPUT]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INPUT: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                    },
                    ...template
                },
                "---",
                {
                    opcode: "orIfFalsey",
                    text: "[ONE] || [TWO]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        ONE: {
                            type: ArgumentType.STRING,
                            defaultValue: "a"
                        },
                        TWO: {
                            type: ArgumentType.STRING,
                            defaultValue: "b"
                        }
                    },
                    ...template
                },
                {
                    opcode: "nullishCoalescing",
                    text: "[ONE] ?? [TWO]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        ONE: {
                            type: ArgumentType.STRING,
                            defaultValue: "a"
                        },
                        TWO: {
                            type: ArgumentType.STRING,
                            defaultValue: "b"
                        }
                    },
                    ...template
                },
                {
                    opcode: "ifIsTruthy",
                    text: "if [ONE] is true then [TWO]",
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        ONE: {
                            type: ArgumentType.BOOLEAN
                        },
                        TWO: {
                            type: ArgumentType.STRING,
                        }
                    },
                    hideFromPalette: true,
                    ...template
                },
                "---",
                {
                    opcode: "binnaryAnd",
                    text: "[num1] and [num2]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 32
                        },
                        num2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    },
                    ...template
                },
                {
                    opcode: "binnaryOr",
                    text: "[num1] or [num2]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 7
                        },
                        num2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 8
                        }
                    },
                    ...template
                },
                {
                    opcode: "binnaryXor",
                    text: "[num1] xor [num2]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 7
                        },
                        num2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    },
                    ...template
                },
                {
                    opcode: "shiftLeft",
                    text: "[num1] << [num2]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        num2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    },
                    ...template
                },
                {
                    opcode: "shiftRight",
                    text: "[num1] >> [num2]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 32
                        },
                        num2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    },
                    ...template
                },
                {
                    opcode: "binnaryNot",
                    text: "~ [num1]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        num1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    },
                    ...template
                }
            ]
        };
    }

    joinMultiple(args) {
        return Object.values(args).map(Cast.toString).join("");
    }

    typeOfValue({INPUT}) {
        if (INPUT === null || INPUT === undefined) return 'null';
        if (typeof INPUT === 'boolean') return 'boolean';
        if (typeof INPUT === 'number') return 'number';
        if (typeof INPUT === 'string') return 'string';
        if (INPUT instanceof Array) return 'array';
        if (typeof INPUT === 'object') {
            const prototype = Object.getPrototypeOf(INPUT);
            if (prototype === null || prototype === Object.prototype) return 'object';
            else if (INPUT.customId) return INPUT.customId;
        }
        return 'unknown';
    }

    orIfFalsey({ONE, TWO}) {
        return ONE || TWO;
    }

    nullishCoalescing({ONE, TWO}) {
        return ONE ?? TWO;
    }

    ifIsTruthy({ONE, TWO}) {
        return Cast.toBoolean(ONE) && TWO;
    }

    binnaryAnd({num1, num2}) {
        num1 = Cast.toNumber(num1);
        num2 = Cast.toNumber(num2);

        return num1 & num2;
    }

    binnaryOr({num1, num2}) {
        num1 = Cast.toNumber(num1);
        num2 = Cast.toNumber(num2);

        return num1 | num2;
    }

    binnaryXor({num1, num2}) {
        num1 = Cast.toNumber(num1);
        num2 = Cast.toNumber(num2);

        return num1 ^ num2;
    }

    shiftLeft({num1, num2}) {
        num1 = Cast.toNumber(num1);
        num2 = Cast.toNumber(num2);

        return num1 << num2;
    }

    shiftRight({num1, num2}) {
        num1 = Cast.toNumber(num1);
        num2 = Cast.toNumber(num2);

        return num1 >> num2;
    }

    binnaryNot({num1}) {
        num1 = Cast.toNumber(num1);

        return ~num1;
    }
}

module.exports = Extension