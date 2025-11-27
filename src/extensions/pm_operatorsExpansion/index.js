const BlockType = require("../../extension-support/block-type");
const ArgumentType = require("../../extension-support/argument-type");
const createTranslate = require("../../extension-support/tw-l10n");
const Cast = require("../../util/cast");
const MathJS = require("./mathjs.js");

const translate = createTranslate(vm);

const joinWords = [
  "apple", "banana", "pear",
  "orange", "mango", "strawberry",
  "pineapple", "grape", "kiwi"
];

function generateJoinTranslations(amount, word, type) {
  switch (type) {
    case 1:
      const obj = {};
      for (let i = 0; i < amount; i++) {
        let text = `${word} `;
        for (let j = 0; j < amount; j++) {
          text += `[STRING${j + 1}]`;
        }
        obj[`join${i + 1}`] = text;
      }
      return obj;
  }
}

function generateJoin(amount) {
  const argumentTextArray = [];
  const argumentss = {};
  for (let i = 0; i < amount; i++) {
    argumentTextArray.push(`[STRING${i + 1}]`);
    argumentss[`STRING${i + 1}`] = {
      type: ArgumentType.STRING,
      defaultValue: joinWords[i] + ((i === (amount - 1)) ? "" : " ")
    };
  }

  const opcode = `join${amount}`;
  return {
    opcode: opcode,
    text: translate({
      id: opcode,
      default: `join ${argumentTextArray.join(" ")}`
    }),
    blockType: BlockType.REPORTER,
    hideFromPalette: true,
    disableMonitor: true,
    arguments: argumentss
  };
}
function initMegaJoins(amount) {
  const joins = [];
  for (let i = 3; i < amount; i++) joins.push(generateJoin(i + 1));

  return joins.map((e, index) => {
    const switches = [];
    for (let i = 3; i < amount; i++) {
      if (i == index + 3) {
        switches.push({ isNoop: true });
        continue;
      }
      switches.push(`join${i + 1}`);
    }
    e["switchText"] = `join x${index + 4}`;
    e["switches"] = switches;
    return e;
  });
}

function generateJoinList(shown) {
  if (!shown) return "";

  let xml = "";
  for (let i = 2; i < 9; i++) {
    if (i === 2) xml += `<block type="operator_join">`;
    else if (i === 3) xml += `<block type="operator_join3">`;
    else xml += `<block type="pmOperatorsExpansion_join${i}">`;
    for (let j = 1; j <= i; j++) {
      xml += `<value name="STRING${j}">`;
      xml += `<shadow type="text"><field name="TEXT">${(joinWords[j - 1] ?? "...") + " "}</field></shadow>`;
      xml += `</value>`;
    }
    xml += `</block>`;
  }

  return xml;
}

/**
 * Operators Expansion Class
 * @constructor
 */
class pmOperatorsExpansion {
  constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     * @type {runtime}
     */
    this.runtime = runtime;
    translate.setup({
      "zh-cn": {
        ...generateJoinTranslations(9, "连接字符串", 1)
      },
      "zh-tw": {
        ...generateJoinTranslations(9, "字串組合", 1)
      }
    });
    this.runtime.registerCompiledExtensionBlocks("pmOperatorsExpansion", this.getCompileInfo());

    this.showJoins = false;
    this.replacers = Object.create(null);
  }

  /**
   * @returns {object} metadata for this extension and its blocks.
   */
  getInfo() {
    return {
      id: "pmOperatorsExpansion",
      name: "Operators Expansion",
      color1: "#59C059",
      color2: "#46B946",
      color3: "#389438",
      blocks: [
        {
          opcode: "shiftLeft",
          text: "[num1] << [num2]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
          switches: [
            { isNoop: true },
            "shiftRight",
            "binnaryAnd",
            "binnaryOr",
            "binnaryXor",
            "binnaryNot",
          ],
          switchText: "lshift"
        },
        {
          opcode: "shiftRight",
          text: "[num1] >> [num2]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
          switches: [
            { isNoop: true },
            "shiftLeft",
            "binnaryAnd",
            "binnaryOr",
            "binnaryXor",
            "binnaryNot",
          ],
          switchText: "rshift"
        },
        {
          opcode: "binnaryAnd",
          text: "[num1] & [num2]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
          switches: [
            { isNoop: true },
            "shiftLeft",
            "shiftRight",
            "binnaryOr",
            "binnaryXor",
            "binnaryNot",
          ],
          switchText: "and"
        },
        {
          opcode: "binnaryOr",
          text: "[num1] | [num2]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
          switches: [
            { isNoop: true },
            "shiftLeft",
            "shiftRight",
            "binnaryAnd",
            "binnaryXor",
            "binnaryNot",
          ],
          switchText: "or"
        },
        {
          opcode: "binnaryXor",
          text: "[num1] ^ [num2]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
          switches: [
            { isNoop: true },
            "shiftLeft",
            "shiftRight",
            "binnaryAnd",
            "binnaryOr",
            "binnaryNot",
          ],
          switchText: "xor"
        },
        {
          opcode: "binnaryNot",
          text: "~ [num1]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            num1: {
              type: ArgumentType.NUMBER,
              defaultValue: 2
            }
          },
          switches: [
            { isNoop: true },
            "shiftLeft",
            "shiftRight",
            "binnaryAnd",
            "binnaryOr",
            "binnaryXor",
          ],
          switchText: "not"
        },
        "---",
        {
          opcode: "orIfFalsey",
          text: "[ONE] or else [TWO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          allowDropAnywhere: true,
          disableMonitor: true,
          arguments: {
            ONE: {
              type: ArgumentType.STRING,
              defaultValue: "a"
            },
            TWO: {
              type: ArgumentType.STRING,
              defaultValue: "b"
            }
          }
        },
        {
          opcode: "ifIsTruthy",
          text: "if [ONE] is true then [TWO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          allowDropAnywhere: true,
          disableMonitor: true,
          arguments: {
            ONE: {
              type: ArgumentType.BOOLEAN
            },
            TWO: {
              type: ArgumentType.STRING,
              defaultValue: "perfect!"
            }
          }
        },
        "---",
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_nand">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_nor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_xor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_xnor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_randomBoolean" />
          `
        },
        "---",
        {
          opcode: "isNumberMultipleOf",
          text: "is [NUM] multiple of [MULTIPLE]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 20
            },
            MULTIPLE: {
              type: ArgumentType.NUMBER,
              defaultValue: 10
            }
          },
          switches: [
            { isNoop: true },
            "isInteger",
            "isPrime",
            "isEven"
          ],
          switchText: "is multiple of?"
        },
        {
          opcode: "isInteger",
          text: "is [NUM] an integer?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 0.5
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isPrime",
            "isEven"
          ],
          switchText: "is integer?"
        },
        {
          opcode: "isPrime",
          text: "is [NUM] a prime number?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 13
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isInteger",
            "isEven"
          ],
          switchText: "is prime?"
        },
        {
          opcode: "isEven",
          text: "is [NUM] even?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 4
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isInteger",
            "isPrime",
          ],
          switchText: "is even?"
        },
        {
          opcode: "betweenNumbers",
          text: "is [NUM] between [MIN] and [MAX]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 5
            },
            MIN: {
              type: ArgumentType.NUMBER,
              defaultValue: 0
            },
            MAX: {
              type: ArgumentType.NUMBER,
              defaultValue: 10
            }
          }
        },
        "---",
        {
          opcode: "evaluateMath",
          text: "answer to [EQUATION]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            EQUATION: {
              type: ArgumentType.STRING,
              defaultValue: "5 * 2"
            }
          }
        },
        {
          opcode: "partOfRatio",
          text: "[PART] part of ratio [RATIO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            PART: {
              type: ArgumentType.STRING,
              menu: "part"
            },
            RATIO: {
              type: ArgumentType.STRING,
              defaultValue: "1:2"
            }
          },
          switches: [
            { isNoop: true },
            "simplifyRatio"
          ],
          switchText: "part of ratio"
        },
        {
          opcode: "simplifyRatio",
          text: "simplify ratio [RATIO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            RATIO: {
              type: ArgumentType.STRING,
              defaultValue: "1:2"
            }
          },
          switches: [
            { isNoop: true },
            "partOfRatio",
          ],
          switchText: "simplify ratio"
        },
        {
          opcode: "pi",
          text: "π",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "euler",
            "infinity"
          ]
        },
        {
          opcode: "euler",
          text: "e",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "pi",
            "infinity"
          ]
        },
        {
          opcode: "infinity",
          text: "∞",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "pi",
            "euler",
          ]
        },
        {
          opcode: "truncateNumber",
          text: "truncate number [NUM]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 2.5
            }
          }
        },
        {
          opcode: "atan2",
          text: "atan2 of x [X] y [Y]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          arguments: {
            X: {
              type: ArgumentType.NUMBER,
              defaultValue: 45
            },
            Y: {
              type: ArgumentType.NUMBER,
              defaultValue: 90
            },
          }
        },
        "---",
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_countAppearTimes">
              <value name="TEXT1">
                <shadow type="text">
                  <field name="TEXT">a</field>
                </shadow>
              </value>
              <value name="TEXT2">
                <shadow type="text">
                  <field name="TEXT">abc abc abc</field>
                </shadow>
              </value>
            </block>
            <block type="operator_readLineInMultilineText">
              <value name="LINE">
                <shadow type="math_number">
                  <field name="NUM">1</field>
                </shadow>
              </value>
              <value name="TEXT">
                <shadow type="text">
                  <field name="TEXT">Text with multiple lines here</field>
                </shadow>
              </value>
            </block>
            <block type="operator_textIncludesLetterFrom">
              <value name="TEXT1">
                <shadow type="text">
                  <field name="TEXT">abcdef</field>
                </shadow>
              </value>
              <value name="TEXT2">
                <shadow type="text">
                  <field name="TEXT">fgh</field>
                </shadow>
              </value>
            </block>
          `
        },
        {
          opcode: "reverseChars",
          text: "reverse [TEXT]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello!"
            }
          },
          switches: [
            { isNoop: true },
            "shuffleChars"
          ],
          switchText: "reverse text"
        },
        {
          opcode: "shuffleChars",
          text: "shuffle [TEXT]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello!"
            }
          },
          switches: [
            { isNoop: true },
            "reverseChars",
          ],
          switchText: "shuffle text"
        },
        {
          opcode: "textAfter",
          text: "text after [TEXT] in [BASE]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello"
            },
            BASE: {
              type: ArgumentType.STRING,
              defaultValue: "Hello world!"
            }
          },
          switches: [
            { isNoop: true },
            "textBefore"
          ],
          switchText: "text after"
        },
        {
          opcode: "textBefore",
          text: "text before [TEXT] in [BASE]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "world"
            },
            BASE: {
              type: ArgumentType.STRING,
              defaultValue: "Hello world!"
            }
          },
          switches: [
            { isNoop: true },
            "textAfter",
          ],
          switchText: "text before"
        },
        "---",
        {
          opcode: "exactlyEqual",
          text: "[ONE] exactly equals [TWO]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
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
        },
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_character_to_code">
              <value name="ONE">
                <shadow type="text">
                  <field name="TEXT">a</field>
                </shadow>
              </value>
            </block>
            <block type="operator_code_to_character">
              <value name="ONE">
                <shadow type="text">
                  <field name="TEXT">97</field>
                </shadow>
              </value>
            </block>
          `
        },
        "---",
        {
          opcode: "setReplacer",
          text: "set replacer [REPLACER] to [TEXT]",
          blockType: BlockType.COMMAND,
          extensions: ["colours_operators"],
          arguments: {
            REPLACER: {
              type: ArgumentType.STRING,
              defaultValue: "${replacer}"
            },
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "world"
            }
          },
          switches: [
            { isNoop: true },
            "resetReplacers"
          ],
          switchText: "set replacer"
        },
        {
          opcode: "resetReplacers",
          text: "reset replacers",
          blockType: BlockType.COMMAND,
          extensions: ["colours_operators"],
          switches: [
            { isNoop: true },
            "setReplacer",
          ],
          switchText: "reset replacers"
        },
        {
          opcode: "applyReplacers",
          text: "apply replacers to [TEXT]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello ${replacer}!"
            }
          }
        },
        "---",
        {
          opcode: "speedToPitch",
          text: "speed [SPEED] to pitch",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            SPEED: {
              type: ArgumentType.NUMBER,
              defaultValue: 2
            },
          },
          switches: [
            { isNoop: true },
            {
              opcode: "pitchToSpeed",
              remapArguments: {
                SPEED: "PITCH"
              }
            }
          ],
          switchText: "speed to pitch"
        },
        {
          opcode: "pitchToSpeed",
          text: "pitch [PITCH] to speed",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            PITCH: {
              type: ArgumentType.NUMBER,
              defaultValue: 120
            },
          },
          switches: [
            { isNoop: true },
            {
              opcode: "speedToPitch",
              remapArguments: {
                PITCH: "SPEED"
              }
            },
          ],
          switchText: "pitch to speed"
        },
        "---",
        {
          func: "toggleJoinVisibility",
          blockType: BlockType.BUTTON,
          text: this.showJoins ? "Hide Old Join Blocks" : "Show Old Join Blocks"
        },
        ...initMegaJoins(9),
        {
          blockType: BlockType.XML,
          xml: generateJoinList(this.showJoins)
        },
      ],
      menus: {
        part: {
          acceptReporters: true,
          items: [
            { text: "first", value: "first" },
            { text: "last", value: "last" },
          ]
        }
      }
    };
  }

  /**
   * Toggles the visibility of the deprecated join blocks
   */
  toggleJoinVisibility() {
    this.showJoins = !this.showJoins;
    this.runtime.extensionManager.refreshBlocks("pmOperatorsExpansion");
  }

  /**
   * This function is used for any compiled blocks in the extension if they exist.
   * Data in this function is given to the IR & JS generators.
   * Data must be valid otherwise errors may occur.
   * @returns {object} functions that create data for compiled blocks.
   */
  getCompileInfo() {
    return {
      ir: {
        shiftLeft: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1"),
          num2: generator.descendInputOfBlock(block, "num2")
        }),
        shiftRight: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1"),
          num2: generator.descendInputOfBlock(block, "num2")
        }),
        binnaryAnd: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1"),
          num2: generator.descendInputOfBlock(block, "num2")
        }),
        binnaryOr: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1"),
          num2: generator.descendInputOfBlock(block, "num2")
        }),
        binnaryXor: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1"),
          num2: generator.descendInputOfBlock(block, "num2")
        }),
        binnaryNot: (generator, block) => ({
          kind: "input",
          num1: generator.descendInputOfBlock(block, "num1")
        }),
        orIfFalsey: (generator, block) => ({
          kind: "input",
          one: generator.descendInputOfBlock(block, "ONE"),
          two: generator.descendInputOfBlock(block, "TWO")
        }),
        ifIsTruthy: (generator, block) => ({
          kind: "input",
          one: generator.descendInputOfBlock(block, "ONE"),
          two: generator.descendInputOfBlock(block, "TWO"),
        }),
        speedToPitch: (generator, block) => ({
          kind: "input",
          speed: generator.descendInputOfBlock(block, "SPEED"),
        }),
        pitchToSpeed: (generator, block) => ({
          kind: "input",
          pitch: generator.descendInputOfBlock(block, "PITCH"),
        }),
        atan2: (generator, block) => ({
          kind: "input",
          x: generator.descendInputOfBlock(block, "X"),
          y: generator.descendInputOfBlock(block, "Y"),
        })
      },
      js: {
        shiftLeft: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();
          const num2 = compiler.descendInput(node.num2).asNumber();

          return new TypedInput(`(${num1} << ${num2})`, TYPE_NUMBER);
        },
        shiftRight: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();
          const num2 = compiler.descendInput(node.num2).asNumber();

          return new TypedInput(`(${num1} >> ${num2})`, TYPE_NUMBER);
        },
        binnaryAnd: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();
          const num2 = compiler.descendInput(node.num2).asNumber();

          return new TypedInput(`(${num1} & ${num2})`, TYPE_NUMBER);
        },
        binnaryOr: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();
          const num2 = compiler.descendInput(node.num2).asNumber();

          return new TypedInput(`(${num1} | ${num2})`, TYPE_NUMBER);
        },
        binnaryXor: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();
          const num2 = compiler.descendInput(node.num2).asNumber();

          return new TypedInput(`(${num1} ^ ${num2})`, TYPE_NUMBER);
        },
        binnaryNot: (node, compiler, {
          TypedInput,
          TYPE_NUMBER
        }) => {
          const num1 = compiler.descendInput(node.num1).asNumber();

          return new TypedInput(`(~${num1})`, TYPE_NUMBER);
        },
        orIfFalsey: (node, compiler, {
          TypedInput,
          TYPE_UNKNOWN
        }) => {
          const num1 = compiler.descendInput(node.one).asUnknown();
          const num2 = compiler.descendInput(node.two).asUnknown();

          return new TypedInput(`(${num1} || ${num2})`, TYPE_UNKNOWN);
        },
        ifIsTruthy: (node, compiler, {
          TypedInput,
          TYPE_UNKNOWN
        }) => {
          const num1 = compiler.descendInput(node.one).asBoolean();
          const num2 = compiler.descendInput(node.two).asUnknown();

          return new TypedInput(`(${num1} && ${num2})`, TYPE_UNKNOWN);
        },
        speedToPitch: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const speed = compiler.descendInput(node.speed).asNumber();
          return new TypedInput(`((1200 * Math.log2(${speed})) / 10)`, TYPE_NUMBER_NAN);
        },
        pitchToSpeed: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const pitch = compiler.descendInput(node.pitch).asNumber();
          return new TypedInput(`(Math.pow(2, (${pitch} * 10) / 1200))`, TYPE_NUMBER_NAN);
        },
        atan2: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const x = compiler.descendInput(node.x).asNumber();
          const y = compiler.descendInput(node.y).asNumber();
          return new TypedInput(`(Math.atan2((${y} * 180) / Math.PI, (${x} * 180) / Math.PI))`, TYPE_NUMBER_NAN);
        }
      }
    };
  }

  // util
  reduce(numerator, denominator) {
    let gcd = function gcd(a, b) {
      return b ? gcd(b, a % b) : a;
    };
    gcd = gcd(numerator, denominator);
    return [numerator / gcd, denominator / gcd];
  }
  checkPrime(number) {
    number = Math.trunc(number);
    if (number <= 1) return false;
    for (let i = 2; i < number; i++) {
      if (number % i === 0) {
        return false;
      }
    }
    return true;
  }

  // useful
  pi() {
    return Math.PI;
  }
  euler() {
    return Math.E;
  }
  infinity() {
    return Infinity;
  }

  partOfRatio(args) {
    const ratio = Cast.toString(args.RATIO);
    const part = Cast.toString(args.PART).toLowerCase();

    if (!ratio.includes(":")) return "";
    const split = ratio.split(":");

    const section = split[Number(part === "last")];
    return Cast.toNumber(section);
  }
  simplifyRatio(args) {
    const ratio = Cast.toString(args.RATIO);
    if (!ratio.includes(":")) return "";
    const split = ratio.split(":");

    const first = Cast.toNumber(split[0]);
    const last = Cast.toNumber(split[1]);

    const reduced = this.reduce(first, last);

    return `${Cast.toNumber(reduced[0])}:${Cast.toNumber(reduced[1])}`;
  }

  truncateNumber(args) {
    const num = Cast.toNumber(args.NUM);
    return Math.trunc(num);
  }

  isNumberMultipleOf(args) {
    const num = Cast.toNumber(args.NUM);
    const mult = Cast.toNumber(args.MULTIPLE);

    return (num % mult) === 0;
  }
  isInteger(args) {
    const num = Cast.toNumber(args.NUM);
    return Math.trunc(num) === num;
  }
  isPrime(args) {
    const num = Cast.toNumber(args.NUM);
    return this.checkPrime(num);
  }
  isEven(args) {
    const num = Cast.toNumber(args.NUM);
    return num % 2 == 0;
  }

  evaluateMath(args) {
    const equation = Cast.toString(args.EQUATION);
    // "" is undefined when evalutated
    if (equation.trim().length === 0) return 0;
    // evalueate
    let answer = 0;
    try {
      answer = MathJS.evaluate(equation);
    } catch {
      // syntax errors cause real errors
      answer = 0;
    }
    // multiline or semi-colon breaks create a ResultSet, we can get the last item in the set for that
    if (typeof answer === "object") {
      if ("entries" in answer) {
        const answers = answer.entries;
        if (answers.length === 0) return 0;
        const lastIdx = answers.length - 1;
        return Number(answers[lastIdx]);
      }
    }
    // Cast.toNumber converts NaN to 0
    return Number(answer);
  }

  exactlyEqual(args) {
    // everyone requested this but watch literally no one use it :trollface:
    return args.ONE === args.TWO;
  }
  betweenNumbers(args) {
    const number = Cast.toNumber(args.NUM);
    let min = Cast.toNumber(args.MIN);
    let max = Cast.toNumber(args.MAX);
    // check that max isnt less than min
    if (max < min) {
      const switchover = max;
      max = min;
      min = switchover;
    }
    return (number <= max) && (number >= min);
  }

  reverseChars(args) {
    const text = Cast.toString(args.TEXT);
    const split = text.split("");
    return split.reverse().join("");
  }
  shuffleChars(args) {
    const text = Cast.toString(args.TEXT);
    const split = text.split("");
    const shuffled = split.sort(() => Math.random() - 0.5);
    return shuffled.join("");
  }

  // join
  join4(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4);
  }
  join5(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4) +
      Cast.toString(args.STRING5);
  }
  join6(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4) +
      Cast.toString(args.STRING5) +
      Cast.toString(args.STRING6);
  }
  join7(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4) +
      Cast.toString(args.STRING5) +
      Cast.toString(args.STRING6) +
      Cast.toString(args.STRING7);
  }
  join8(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4) +
      Cast.toString(args.STRING5) +
      Cast.toString(args.STRING6) +
      Cast.toString(args.STRING7) +
      Cast.toString(args.STRING8);
  }
  join9(args) {
    return Cast.toString(args.STRING1) +
      Cast.toString(args.STRING2) +
      Cast.toString(args.STRING3) +
      Cast.toString(args.STRING4) +
      Cast.toString(args.STRING5) +
      Cast.toString(args.STRING6) +
      Cast.toString(args.STRING7) +
      Cast.toString(args.STRING8) +
      Cast.toString(args.STRING9);
  }

  setReplacer(args) {
    const replacer = Cast.toString(args.REPLACER);
    const text = Cast.toString(args.TEXT);
    this.replacers[replacer] = text;
  }
  resetReplacers() {
    this.replacers = Object.create(null);
  }
  applyReplacers(args) {
    let text = Cast.toString(args.TEXT);
    for (const replacer in this.replacers) {
      const replacementText = this.replacers[replacer];
      text = text.replaceAll(replacer, replacementText);
    }
    return text;
  }

  textAfter(args) {
    const text = Cast.toString(args.TEXT);
    const base = Cast.toString(args.BASE);
    const idx = base.indexOf(text);
    if (idx < 0) return "";
    return base.substring(idx + text.length);
  }
  textBefore(args) {
    const text = Cast.toString(args.TEXT);
    const base = Cast.toString(args.BASE);
    const idx = base.indexOf(text);
    if (idx < 0) return "";
    return base.substring(0, idx);
  }

  // These blocks are compiled
  orIfFalsey(args) { return "" }
  ifIsTruthy(args) { return "" }
  shiftLeft(args) { return "" }
  shiftRight(args) { return "" }
  binnaryAnd(args) { return false }
  binnaryOr(args) { return false }
  binnaryXor(args) { return false }
  binnaryNot(args) { return false }
  speedToPitch(args) { return 0 }
  pitchToSpeed(args) { return 1 }
  atan2(args) { return 0 }
}

module.exports = pmOperatorsExpansion;
