const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');

const blockIconURI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAFACAMAAAD6TlWYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAPUExURQAAAP+xNQDiGgCU/wAAAJEQGGoAAAAFdFJOU/////8A+7YOUwAAAAlwSFlzAAAOwwAADsMBx2+oZAAABA5JREFUeF7t0EtuW0EUA9F8vP81Z8JRAwzbLuk5COoMBb1LdP34EGJAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEHos4M+HZfbtDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0KPBfxfGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEZsBfh/z8z/r9SfnsywwIGRAyIGRAyICQASEDQp8OeMrfvk06vEzOXjPgIWevGfCQs9cMeMjZawY85Ow1Ax5y9poBDzl7zYCHnL2GA57y2dvlvW+TmcmARWYmAxaZmQxYZGYyYJGZyYBFZiYDFpmZDFhkZnp5wFPOvFze+TaZmQxYZGYyYJGZyYBFZiYDFpmZDFhkZjJgkZnJgEVmprcHPOXsl+V9j8lsZcAhs5UBh8xWBhwyWxlwyGxlwCGzlQGHzFYGHDJbPR7wlJlreddjMlsZcMhsZcAhs5UBh8xWBhwyWxlwyGxlwCGzlQGHzFbfHvCU2SrvekxmKwMOma0MOGS2MuCQ2cqAQ2YrAw6ZrQw4ZLYy4JDZyoBDZisDDpmtDDhktjLgkNnKgENmKwMOma0MOGS2MuCQ2erbA2bmWt71mMxWBhwyWxlwyGxlwCGzlQGHzFYGHDJbGXDIbGXAIbPV4wFz9svyrsdktjLgkNnKgENmKwMOma0MOGS2MuCQ2cqAQ2YrAw6Zrd4eMGdeLu97m8xMBiwyMxmwyMxkwCIzkwGLzEwGLDIzGbDIzGTAIjPTywPms7fLO98mM5MBi8xMBiwyMxmwyMxkwCIzkwGLzEwGLDIzGbDIzIQD5m/fJu99mZy9ZsBDzl4z4CFnrxnwkLPXDHjI2WsGPOTsNQMecvaaAQ85e+3TAfPzPysdruWzLzMgZEDIgJABIQNCBoQMCM2A+jsDQgaEDAgZEDIgZEDIgJABIQNCBoQMCBkQMiBkQMiAkAEhA0IGhAwIGRAyIGRAyICQASEDQgaEDAgZEDIgZEDIgMjHxx+IPExM0h8siAAAAABJRU5ErkJggg=="

/**
 * Class for Unite blocks
 * @constructor
 */
class jwUnite {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        alert('unite is deprecated, please use the blocks in the toolbox')
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jwUnite',
            name: 'Unite',
            blockIconURI: blockIconURI,
            color: '#7ddcff',
            blockText: "#575e75",
            blocks: [
                {
                    opcode: 'always',
                    text: 'always',
                    disableMonitor: true,
                    blockType: BlockType.HAT
                },
                {
                    opcode: 'whenanything',
                    text: 'when [ANYTHING]',
                    disableMonitor: true,
                    blockType: BlockType.HAT,
                    arguments: {
                        ANYTHING: {
                            type: ArgumentType.BOOLEAN,
                        }
                    }
                },
                "---",
                {
                    opcode: 'getspritewithattrib',
                    text: 'get sprite with [var] set to [val]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        var: {
                            type: ArgumentType.STRING,
                            defaultValue: "my variable"
                        },
                        val: {
                            type: ArgumentType.STRING,
                            defaultValue: "0"
                        }
                    }
                },
                "---",
                {
                    opcode: 'backToGreenFlag',
                    text: 'run [FLAG]',
                    terminal: true,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        FLAG: {
                            type: ArgumentType.IMAGE,
                            dataURI: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABmJLR0QA/wD/AP+gvaeTAAACJ0lEQVRIid2Uy09TQRSHv2kv1VR5hhQQqwlYGtqCmtbHokhDTNQtEVz4B/gfmBCDXoyGmLj3kbBwY2LY6MpHWJDUoBukKsTKQ6I2paWGBipCo73jBii30BpI78ZfMpkzMznznTOPAwZLbFgt/ZWY011k9gzysSdZLICStdJXkPRjSns41hcH2Y7EjmAVmESKFyjyCaPqr50AzBtWbeAsEKDE0oy7w4rnfAXNbWU0nlY40CQwmX0kY73UBr4QGw5vu5vndg31Zy6wv3OGhecZfQbrajk3Rp2zXRdCqe0Irg5o8k8w+uwWR9VLmE13eaeNgarRqtoQ4jKKdpUy+wLy+3Hg2vaAQlIsbk51ZUjNJ/n8egBv5CBan2Bf5TL1nlkafGkWYz8YeVy94bIjwHpOpTY/vs7Nc1WAHQCNr5sXTLsA/EOaNBagabph8QEyYzAA3QkZkYGeUOAVyTlWUt/I/M5gLa/GpDjYXFryuumPaCsgMWsl+ilEfLoOSQTBClBBuW2GExcXsVi9hQFSF8RWQGT8MNCLwzXAYHc2nNabbQzdu4/TH6ThpBMhbDmef1iKhRgf8iHFo/wAeEpIfUgoZ/bD9SAB1Us42MPUiJOaxhBVh5YwKYKfib3MhZtYXS5B0sl79VUhQH4Nq6vADbzqHaJTbUQn3QjKECKOlG8Iqblh7apUsFayX661gjLgH/zPgPm1PlFMQPaSHa4HTIcnSFW8LSbAcP0F3uGqEimnx6MAAAAASUVORK5CYII=',
                            alt: 'Blue Flag'
                        }
                    }
                },
                "---",
                {
                    opcode: 'trueBoolean',
                    text: 'true',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                },
                {
                    opcode: 'falseBoolean',
                    text: 'false',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                },
                {
                    opcode: 'randomBoolean',
                    text: 'random',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                },
                "---",
                {
                    opcode: 'mobile',
                    text: 'mobile?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                },
                "---",
                {
                    opcode: 'thing_is_text',
                    text: '[TEXT1] is text?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        TEXT1: {
                            type: ArgumentType.STRING,
                            defaultValue: 'world'
                        }
                    }
                },
                {
                    opcode: 'thing_is_number',
                    text: '[TEXT1] is number?',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        TEXT1: {
                            type: ArgumentType.STRING,
                            defaultValue: '10'
                        }
                    }
                },
                {
                    opcode: 'if_return_else_return',
                    text: 'if [boolean] is true [TEXT1] is false [TEXT2]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        boolean: {
                            type: ArgumentType.BOOLEAN
                        },
                        TEXT1: {
                            type: ArgumentType.STRING,
                            defaultValue: 'foo'
                        },
                        TEXT2: {
                            type: ArgumentType.STRING,
                            defaultValue: 'bar'
                        }
                    }
                },
                {
                    opcode: 'indexOfTextInText',
                    text: 'index of [TEXT1] in [TEXT2]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEXT1: {
                            type: ArgumentType.STRING,
                            defaultValue: 'world'
                        },
                        TEXT2: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello world!'
                        }
                    }
                },
                {
                    opcode: 'regextest',
                    text: 'test [text] with regex [reg]',
                    disableMonitor: true,
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        text: {
                            type: ArgumentType.STRING,
                            defaultValue: 'foo bar'
                        },
                        reg: {
                            type: ArgumentType.STRING,
                            defaultValue: '/foo/g'
                        }
                    }
                },
                {
                    opcode: 'regexmatch',
                    text: 'match [text] with regex [reg]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        text: {
                            type: ArgumentType.STRING,
                            defaultValue: 'foo bar'
                        },
                        reg: {
                            type: ArgumentType.STRING,
                            defaultValue: '/foo/g'
                        }
                    }
                },
                {
                    opcode: 'replaceAll',
                    text: 'in [text] replace all [term] with [res]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        text: {
                            type: ArgumentType.STRING,
                            defaultValue: 'foo bar'
                        },
                        term: {
                            type: ArgumentType.STRING,
                            defaultValue: 'foo'
                        },
                        res: {
                            type: ArgumentType.STRING,
                            defaultValue: 'bar'
                        }
                    }
                },
                {
                    opcode: 'getLettersFromIndexToIndexInText',
                    text: 'letters from [INDEX1] to [INDEX2] in [TEXT]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        INDEX1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        },
                        INDEX2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        },
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello!'
                        }
                    }
                },
                {
                    opcode: 'readLineInMultilineText',
                    text: 'read line [LINE] in [TEXT]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        LINE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Text with multiple lines here'
                        }
                    }
                },
                {
                    opcode: 'newLine',
                    text: 'newline',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'stringify',
                    text: '[ONE] as string',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ONE: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo"
                        }
                }},
                {
                    opcode: 'lerpFunc',
                    text: 'interpolate [ONE] to [TWO] by [AMOUNT]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ONE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        TWO: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        },
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.5
                        }
                    }
                },
                {
                    opcode: 'advMath',
                    text: '[ONE] [OPTION] [TWO]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        ONE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        OPTION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "^",
                            menu: 'advMath'
                        },
                        TWO: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 2
                        }
                    }
                },
                {
                    opcode: 'constrainnumber',
                    text: 'constrain [inp] min [min] max [max]',
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        inp: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        },
                        min: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1,
                        },
                        max: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                "---",
                {
                    opcode: 'setReplacer',
                    text: 'replacer [REPLACER] to [VALUE]',
                    arguments: {
                        REPLACER: {
                            type: ArgumentType.STRING,
                            defaultValue: "foo",
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "bar"
                        },
                    },
                    disableMonitor: true,
                    blockType: BlockType.COMMAND,
                },
                {
                    opcode: 'replaceWithReplacers',
                    text: 'replace [STRING] with replacers',
                    
                    arguments: {
                        STRING: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello {foo}!"
                        },
                    },
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                },
            ],
            menus: {
                advMath: [
                    '^',
                    'root',
                    'log'
                ]/*
                sprites: {
                    items: 'getAllSprites',
                    acceptReporters: true
                }
                */
            }
        };
    }
    /*
    getAllSprites() {
        return this.runtime.targets.map(x => {
            return {
                text: x.sprite ? x.sprite.name : `Unkown ${x.id}`,
                value: x.id
            }
        })
    */

    replacers = {}
    knownLinks = {}

    always(args, util) {
        return true;
    }

    whenanything(args, util) {
        return Boolean(args.ANYTHING || false)
    }

    backToGreenFlag(args, util) {
        if (vm) vm.greenFlag()
    }

    trueBoolean() {return true}
    falseBoolean() {return false}
    randomBoolean() {return Boolean(Math.round(Math.random()))}

    indexOfTextInText(args, util) {
        const lookfor = String(args.TEXT1);
        const searchin = String(args.TEXT2);
        let index = 0;
        if (searchin.includes(lookfor)) {
            index = searchin.indexOf(lookfor) + 1;
        }
        return index;
    }
    getLettersFromIndexToIndexInText(args, util) {
        const index1 = (Number(args.INDEX1) ? Number(args.INDEX1) : 1) - 1;
        const index2 = (Number(args.INDEX2) ? Number(args.INDEX2) : 1) - 1;
        const string = String(args.TEXT);
        const substring = string.substring(index1, index2);
        return substring;
    }
    readLineInMultilineText(args, util) {
        const line = (Number(args.LINE) ? Number(args.LINE) : 1) - 1;
        const text = String(args.TEXT);
        const readline = text.split("\n")[line] || "";
        return readline;
    }
    newLine() { return "\n" }
    stringify(args, util) {return args.ONE}

    lerpFunc(args, util) {
        const one = isNaN(Number(args.ONE)) ? 0 : Number(args.ONE);
        const two = isNaN(Number(args.TWO)) ? 0 : Number(args.TWO);
        const amount = isNaN(Number(args.AMOUNT)) ? 0 : Number(args.AMOUNT);
        let lerped = one;
        lerped += ((two - one) / (amount / (amount * amount)));
        return lerped;
    }
    advMath(args, util) {
        const one = isNaN(Number(args.ONE)) ? 0 : Number(args.ONE)
        const two = isNaN(Number(args.TWO)) ? 0 : Number(args.TWO)
        const operator = String(args.OPTION)
        switch(operator) {
            case "^": return one ** two
            case "root": return one ** 1/two
            case "log": return Math.log(two) / Math.log(one)
            default: return 0
        }
    }

    setReplacer(args, util) {
        this.replacers["{" + String(args.REPLACER) + "}"] = String(args.VALUE || "")
    }
    replaceWithReplacers(args, util) {
        let string = String(args.STRING || "")
        for (const replacer of Object.keys(this.replacers)) {
            string = string.replaceAll(replacer, this.replacers[replacer])
        }
        return string
    }

    thing_is_number(args, util) {
        // i hate js
        // i also hate regex
        // so im gonna do this the lazy way
        // no. String(Number(value)) === value does infact do the job X)
        // also what was originaly here was inificiant as hell
        return String(Number(args.TEXT1)) == args.TEXT1 && !isNaN(Number(args.TEXT1))
    }
    thing_is_text(args, util) {
        // WHY IS NAN NOT EQUAL TO ITSELF
        // HOW IS NAN A NUMBER
        // because nan is how numbers say the value put into me is not a number
        return isNaN(Number(args.TEXT1))
    }

    if_return_else_return(args) {
        return args.boolean ? args.TEXT1 : args.TEXT2
    }
    mobile(args, util) {
        return navigator.userAgent.includes("Mobile") || window.matchMedia("(max-width: 767px)").matches
    }
    getspritewithattrib(args, util) {
        // strip out usless data
        const sprites = util.runtime.targets.map(x => {
            return {
                id: x.id, 
                name: x.sprite ? x.sprite.name : "Unkown",
                variables: Object.values(x.variables).reduce((obj, value) => {
                    if (!value.name) return obj
                    obj[value.name] = String(value.value)
                    return obj
                }, {})
            }
        })
        // get the target with variable x set to y
        let res = "No sprites found"
        for (
            // define the index and the sprite
            let idx = 1, sprite = sprites[0]; 
            // standard for loop thing
            idx < sprites.length;
            // set sprite to a new item  
            sprite = sprites[idx++]
        ) {
            if (sprite.variables[args.var] == args.val) {
                res = `{"id": "${sprite.id}", "name": "${sprite.name}"}`
                break
            }
        }
        
        return res
    }

    constrainnumber(args) {
        return Math.min(Math.max(args.min, args.inp), args.max)
    }

    regextest(args) {
        try {
            const regex = new RegExp(args.reg)
            return regex.test(args.text)
        } catch (e) {
            return false;
        }
    }

    regexmatch(args) {
        try {
            const regex = new RegExp(args.reg)
            const matches = args.text.match(regex)
            return JSON.stringify(matches ? matches : [])
        } catch (e) {
            return "[]";
        }
    }
    replaceAll(args) {
        return args.text.replaceAll(args.term, args.res)
    }
}

module.exports = jwUnite;
