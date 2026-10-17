// @ts-check

const log = require('../util/log');
const BlockType = require('../extension-support/block-type');
const VariablePool = require('./variable-pool');
const jsexecute = require('./jsexecute');
const environment = require('./environment');
const {StackOpcode, InputOpcode, InputType} = require('./enums.js');
const oldCompilerCompatibility = require('./old-compiler-compatibility.js');

// These imports are used by jsdoc comments but eslint doesn't know that
/* eslint-disable no-unused-vars */
const {
    IntermediateStackBlock,
    IntermediateInput,
    IntermediateStack,
    IntermediateScript,
    IntermediateRepresentation
} = require('./intermediate');
/* eslint-enable no-unused-vars */

/**
 * @fileoverview Convert intermediate representations to JavaScript functions.
 */

/* eslint-disable max-len */
/* eslint-disable prefer-template */

const sanitize = string => {
    if (typeof string !== 'string') {
        log.warn(`sanitize got unexpected type: ${typeof string}`);
        string = '' + string;
    }
    return JSON.stringify(string).slice(1, -1);
};

// Pen-related constants
const PEN_EXT = 'runtime.ext_pen';
const PEN_STATE = `${PEN_EXT}._getPenState(target)`;

/**
 * Variable pool used for factory function names.
 */
const factoryNameVariablePool = new VariablePool('factory');

/**
 * Variable pool used for generated functions (non-generator)
 */
const functionNameVariablePool = new VariablePool('fun');

/**
 * Variable pool used for generated generator functions.
 */
const generatorNameVariablePool = new VariablePool('gen');

const isSafeInputForEqualsOptimization = (input, other) => {
    // Only optimize constants
    if (input.opcode !== InputOpcode.CONSTANT) return false;
    // Only optimize when the constant can always be thought of as a number
    if (input.isAlwaysType(InputType.NUMBER) || input.isAlwaysType(InputType.STRING_NUM)) {
        if (other.isSometimesType(InputType.NUMBER_NAN | InputType.STRING_NAN | InputType.BOOLEAN_INTERPRETABLE)) {
            // Never optimize 0 if the other input can be NaN, '' or a boolean.
            // eg. if '< 0 = "" >' was optimized it would turn into `0 === +""`,
            //  which would be true even though Scratch would return false.
            return (+input.inputs.value) !== 0;
        }
        return true;
    }
    return false;
};

/**
 * A frame contains some information about the current substack being compiled.
 * @deprecated
 */
class Frame {
    constructor (isLoop, parent) {
        /**
         * Whether the current stack runs in a loop (while, for)
         * @type {boolean}
         * @readonly
         */
        this.isLoop = isLoop;

        this.parent = parent;

        /**
         * Whether the current block is the last block in the stack.
         * @type {boolean}
         */
        this.isLastBlock = false;
    }
}

class JSGenerator {
    /**
     * @param {IntermediateScript} script
     * @param {IntermediateRepresentation} ir
     * @param {import("../sprites/rendered-target")} target
     */
    constructor (script, ir, target) {
        this.script = script;
        this.ir = ir;
        this.target = target;
        this.source = '';

        this.isWarp = script.isWarp;
        this.isProcedure = script.isProcedure;
        this.warpTimer = script.warpTimer;

        this.globalProcedureData = null;

        this.allowReturns = false;
        this.isLastBlock = false;

        this.inLoop = false;
        this.loopName = null;

        this.inCase = false;
        this.switchName = null;

        /**
         * Stack of frames, most recent is last item.
         * @type {Frame[]}
         * @deprecated
         */
        this.frames = [];

        /**
         * The current Frame.
         * @type {Frame?}
         * @deprecated
         */
        this.currentFrame = null;

        this.localVariables = new VariablePool('a');
        this._setupVariablesPool = new VariablePool('b');
        this._setupVariables = {};
        this.usesTemporaryLocal = false;

        this.descendedIntoModulo = false;
        this.isInHat = false;

        this.runtime = this.target.runtime;
        this.debug = this.target.runtime.debug;

        this.oldCompilerStub = new oldCompilerCompatibility.JSGeneratorStub(this);
    }

    /** @type {Object.<string, Object.<string, Function>>} */
    static compilerExtensions = {};

    /**
     * Enter a new frame
     * @param {Frame} frame New frame.
     * @deprecated
     */
    pushFrame (frame) {
        this.frames.push(frame);
        this.currentFrame = frame;
        this.currentFrame._temp = [this.inLoop, this.loopName];

        this.inLoop = this.inLoop || frame.isLoop;
        this.loopName = null;
    }

    /**
     * Exit the current frame
     * @deprecated
     */
    popFrame () {
        this.inLoop = this.currentFrame._temp[0];
        this.loopName = this.currentFrame._temp[1];

        this.frames.pop();
        this.currentFrame = this.frames[this.frames.length - 1];
    }

    /**
     * @returns {boolean} true if the current block is the last command of a loop
     * @deprecated
     */
    isLastBlockInLoop () {
        return this.isLastBlock && this.inLoop;
    }

    /**
     * @param {IntermediateInput} block Input node to compile.
     * @returns {string} Compiled input.
     */
    descendInput (block) {
        const node = block.inputs;
        switch (block.opcode) {
        case InputOpcode.NOP:
            return `null`;

        case InputOpcode.PROCEDURE_ARGUMENT:
            return `p${node.index}`;

        case InputOpcode.ADDON_CALL:
            return `(${this.descendAddonCall(node)})`;

        case InputOpcode.CAST_BOOLEAN:
            return `toBoolean(${this.descendInput(node.target)})`;
        case InputOpcode.CAST_NUMBER:
            if (node.target.isAlwaysType(InputType.BOOLEAN)) {
                return `(+${this.descendInput(node.target)})`;
            }
            this.usesTemporaryLocal = true;
            if (node.target.isAlwaysType(InputType.NUMBER_OR_NAN)) {
                return `((t = ${this.descendInput(node.target)}) === t ? t : 0)`;
            }
            return `((t = +${this.descendInput(node.target)}) === t ? t : 0)`;
        case InputOpcode.CAST_NUMBER_OR_NAN:
            return `(+${this.descendInput(node.target)})`;
        case InputOpcode.CAST_NUMBER_INDEX:
            return `(${this.descendInput(node.target.toType(InputType.NUMBER_OR_NAN))} | 0)`;
        case InputOpcode.CAST_STRING:
            return `stringify(${this.descendInput(node.target)})`;
        case InputOpcode.CAST_COLOR:
            return `colorToList(${this.descendInput(node.target)})`;

        case InputOpcode.COMPATIBILITY_LAYER:
            // Compatibility layer inputs never use flags.
            return `(${this.generateCompatibilityLayerCall(node, false)})`;

        case InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER:
            return this.oldCompilerStub.descendInputFromNewCompiler(block);

        case InputOpcode.CONSTANT:
            if (block.isAlwaysType(InputType.NULL)) {
                return "null";
            } else if (block.isAlwaysType(InputType.NUMBER)) {
                if (typeof node.value !== 'number') throw new Error(`JS: '${block.type}' type constant had ${typeof node.value} type value. Expected number.`);
                if (Object.is(node.value, -0)) return '-0';
                return node.value.toString();
            } else if (block.isAlwaysType(InputType.BOOLEAN)) {
                if (typeof node.value !== 'boolean') throw new Error(`JS: '${block.type}' type constant had ${typeof node.value} type value. Expected boolean.`);
                return node.value.toString();
            } else if (block.isAlwaysType(InputType.COLOR)) {
                if (!Array.isArray(node.value)) throw new Error(`JS: '${block.type}' type constant was not an array.`);
                if (node.value.length !== 3) throw new Error(`JS: '${block.type}' type constant had an array of length '${node.value.length}'. Expected 3.`);
                for (let i = 0; i < 3; i++) {
                    if (typeof node.value[i] !== 'number') {
                        throw new Error(`JS: '${block.type}' type constant element ${i} had a value of type '${node.value[i]}'. Expected number.`);
                    }
                }
                return `[${node.value[0]},${node.value[1]},${node.value[2]}]`;
            } else if (block.isSometimesType(InputType.STRING)) {
                return `"${sanitize(node.value.toString())}"`;
            } throw new Error(`JS: Unknown constant input type '${block.type}'.`);

        case InputOpcode.CONTROL_COUNTER:
            return 'runtime.ext_scratch3_control._counter';

        //pm control
        case InputOpcode.PM_CONTROL_FROM_TO_INDEX:
            return `(typeof _pmControlFromToIndex !== "undefined" ? _pmControlFromToIndex : 0)`;
        case InputOpcode.PM_CONTROL_IF_ELSE_REPORT:
            return `(${this.descendInput(node.condition)} ? ${this.descendInput(node.whenTrue)} : ${this.descendInput(node.whenFalse)})`
        case InputOpcode.PM_CONTROL_INLINE_BLOCK:
            let stack = this.descendStackInline(node.code, {allowReturns: true});
            return `(yield* (function*() {\n${stack}return "";\n})())`;
        case InputOpcode.PM_CONTROL_IS_CLONE:
            return `(!target.isOriginal)`;
        case InputOpcode.PM_CONTROL_TRY_CATCH_ERROR:
            return `(typeof _pmControlTryCatchError !== "undefined" ? _pmControlTryCatchError : "")`;

        case InputOpcode.LIST_CONTAINS:
            return `listContains(${this.referenceVariable(node.list)}, ${this.descendInput(node.item)})`;
        case InputOpcode.LIST_CONTENTS:
            return `listContents(${this.referenceVariable(node.list)})`;
        case InputOpcode.LIST_GET: {
            if (environment.supportsNullishCoalescing) {
                if (node.index.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
                    return `(${this.referenceVariable(node.list)}.value[${this.descendInput(node.index.toType(InputType.NUMBER_INDEX))} - 1] ?? "")`;
                }
                if (node.index.isConstant('last')) {
                    return `(${this.referenceVariable(node.list)}.value[${this.referenceVariable(node.list)}.value.length - 1] ?? "")`;
                }
            }
            return `listGet(${this.referenceVariable(node.list)}.value, ${this.descendInput(node.index)})`;
        }
        case InputOpcode.LIST_INDEX_OF:
            return `listIndexOf(${this.referenceVariable(node.list)}, ${this.descendInput(node.item)})`;
        case InputOpcode.LIST_LENGTH:
            return `${this.referenceVariable(node.list)}.value.length`;

        //pm lists
        case InputOpcode.PM_LIST_AMOUNT:
            return `runtime.ext_scratch3_data._listAmountOf(${this.referenceVariable(node.list)}, ${this.descendInput(node.item)})`;
        case InputOpcode.PM_LIST_ARRAY_GET:
            return `JSON.stringify(${this.referenceVariable(node.list)}.value)`;
        case InputOpcode.PM_LIST_EMPTY:
            return `(${this.referenceVariable(node.list)}.value.length === 0)`;
        case InputOpcode.PM_LIST_INDEX_EXISTS:
            return `(${this.referenceVariable(node.list)}.value.length >= ${this.descendInput(node.index)})`;
        case InputOpcode.PM_LIST_UPVAR_INDEX:
            return `(typeof _scratch3DataIndex !== "undefined" ? _scratch3DataIndex : 0)`;
        case InputOpcode.PM_LIST_UPVAR_ITEM:
            return `(typeof _scratch3DataItem !== "undefined" ? _scratch3DataItem : "")`;

        case InputOpcode.LOOKS_SIZE_GET:
            return 'Math.round(target.size)';
        case InputOpcode.LOOKS_BACKDROP_NAME:
            return 'stage.getCostumes()[stage.currentCostume].name';
        case InputOpcode.LOOKS_BACKDROP_NUMBER:
            return '(stage.currentCostume + 1)';
        case InputOpcode.LOOKS_COSTUME_NAME:
            return 'target.getCostumes()[target.currentCostume].name';
        case InputOpcode.LOOKS_COSTUME_NUMBER:
            return '(target.currentCostume + 1)';

        //pm looks
        case InputOpcode.PM_LOOKS_BUBBLE_HEIGHT:
            return `runtime.ext_scratch3_looks._getBubbleSize(target, 1)`;
        case InputOpcode.PM_LOOKS_BUBBLE_WIDTH:
            return `runtime.ext_scratch3_looks._getBubbleSize(target, 0)`;
        case InputOpcode.PM_LOOKS_GET_COSTUME_VALUE:
            return `runtime.ext_scratch3_looks._getCostumeValue(target, ${this.descendInput(node.costume)}, ${this.descendInput(node.value)}${node.old ? `, true` : ''})`;
        case InputOpcode.PM_LOOKS_GET_EFFECT:
            return `target.getEffect("${sanitize(node.effect)}")`;
        case InputOpcode.PM_LOOKS_GET_TINT:
            return 'runtime.ext_scratch3_looks._getTintColor(target)';
        case InputOpcode.PM_LOOKS_LAYER_GET:
            return `target.getLayerOrder()`;
        case InputOpcode.PM_LOOKS_STRETCH_X:
            return 'target.stretch[0]';
        case InputOpcode.PM_LOOKS_STRETCH_Y:
            return 'target.stretch[1]';
        case InputOpcode.PM_LOOKS_VISIBLE_GET:
            return `target.visible`;
        case InputOpcode.PM_LOOKS_VISIBLE_SPRITE:
            return `runtime.ext_scratch3_looks._getOtherSpriteVisible(target, ${this.descendInput(node.option)})`;

        case InputOpcode.MOTION_DIRECTION_GET:
            return 'target.direction';
        case InputOpcode.MOTION_X_GET:
            return 'limitPrecision(target.x)';
        case InputOpcode.MOTION_Y_GET:
            return 'limitPrecision(target.y)';

        case InputOpcode.OP_ABS:
            return `Math.abs(${this.descendInput(node.value)})`;
        case InputOpcode.OP_ACOS:
            return `((Math.acos(${this.descendInput(node.value)}) * 180) / Math.PI)`;
        case InputOpcode.OP_ADD:
            return `(${this.descendInput(node.left)} + ${this.descendInput(node.right)})`;
        case InputOpcode.OP_AND:
            return `(${this.descendInput(node.left)} && ${this.descendInput(node.right)})`;
        case InputOpcode.OP_ASIN:
            return `((Math.asin(${this.descendInput(node.value)}) * 180) / Math.PI)`;
        case InputOpcode.OP_ATAN:
            return `((Math.atan(${this.descendInput(node.value)}) * 180) / Math.PI)`;
        case InputOpcode.OP_CEILING:
            return `Math.ceil(${this.descendInput(node.value)})`;
        case InputOpcode.OP_CONTAINS:
            return `(${this.descendInput(node.string)}.toLowerCase().indexOf(${this.descendInput(node.contains)}.toLowerCase()) !== -1)`;
        case InputOpcode.OP_COS:
            return `(Math.round(Math.cos((Math.PI * ${this.descendInput(node.value)}) / 180) * 1e10) / 1e10)`;
        case InputOpcode.OP_DIVIDE:
            return `(${this.descendInput(node.left)} / ${this.descendInput(node.right)})`;
        case InputOpcode.OP_EQUALS: {
            const left = node.left;
            const right = node.right;

            if (!this.runtime.compilerOptions.strictEquality && !(left.isSometimesType(InputType.NULL) || right.isSometimesType(InputType.NULL))) {
                // When either operand is known to never be a number, only use string comparison to avoid all number parsing.
                if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
                    return `(${this.descendInput(left.toType(InputType.STRING))}.toLowerCase() === ${this.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
                }
                // When both operands are known to be numbers, we can use ===
                if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
                    return `(${this.descendInput(left.toType(InputType.NUMBER))} === ${this.descendInput(right.toType(InputType.NUMBER))})`;
                }
                // In certain conditions, we can use === when one of the operands is known to be a safe number.
                if (isSafeInputForEqualsOptimization(left, right) || isSafeInputForEqualsOptimization(right, left)) {
                    return `(${this.descendInput(left.toType(InputType.NUMBER))} === ${this.descendInput(right.toType(InputType.NUMBER))})`;
                }
            }
            return `runtime.equals(${this.descendInput(left)}, ${this.descendInput(right)})`;
        }
        case InputOpcode.OP_POW_E:
            return `Math.exp(${this.descendInput(node.value)})`;
        case InputOpcode.OP_FLOOR:
            return `Math.floor(${this.descendInput(node.value)})`;
        case InputOpcode.OP_GREATER: {
            const left = node.left;
            const right = node.right;
            // When the left operand is a number and the right operand is a number or NaN, we can use >
            if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
                return `(${this.descendInput(left.toType(InputType.NUMBER))} > ${this.descendInput(right.toType(InputType.NUMBER_OR_NAN))})`;
            }
            // When the left operand is a number or NaN and the right operand is a number, we can negate <=
            if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
                return `!(${this.descendInput(left.toType(InputType.NUMBER_OR_NAN))} <= ${this.descendInput(right.toType(InputType.NUMBER))})`;
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
                return `(${this.descendInput(left.toType(InputType.STRING))}.toLowerCase() > ${this.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
            }
            // No compile-time optimizations possible - use fallback method.
            return `compareGreaterThan(${this.descendInput(left)}, ${this.descendInput(right)})`;
        }
        case InputOpcode.OP_JOIN:
            return `(${this.descendInput(node.left)} + ${this.descendInput(node.right)})`;
        case InputOpcode.OP_LENGTH:
            return `${this.descendInput(node.string)}.length`;
        case InputOpcode.OP_LESS: {
            const left = node.left;
            const right = node.right;
            // When the left operand is a number or NaN and the right operand is a number, we can use <
            if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE)) {
                return `(${this.descendInput(left.toType(InputType.NUMBER_OR_NAN))} < ${this.descendInput(right.toType(InputType.NUMBER))})`;
            }
            // When the left operand is a number and the right operand is a number or NaN, we can negate >=
            if (left.isAlwaysType(InputType.NUMBER_INTERPRETABLE) && right.isAlwaysType(InputType.NUMBER_INTERPRETABLE | InputType.NUMBER_NAN)) {
                return `!(${this.descendInput(left.toType(InputType.NUMBER))} >= ${this.descendInput(right.toType(InputType.NUMBER_OR_NAN))})`;
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (!left.isSometimesType(InputType.NUMBER_INTERPRETABLE) || !right.isSometimesType(InputType.NUMBER_INTERPRETABLE)) {
                return `(${this.descendInput(left.toType(InputType.STRING))}.toLowerCase() < ${this.descendInput(right.toType(InputType.STRING))}.toLowerCase())`;
            }
            // No compile-time optimizations possible - use fallback method.
            return `compareLessThan(${this.descendInput(left)}, ${this.descendInput(right)})`;
        }
        case InputOpcode.OP_LETTER_OF:
            return `((${this.descendInput(node.string)})[${this.descendInput(node.letter)} - 1] || "")`;
        case InputOpcode.OP_LOG_E:
            return `Math.log(${this.descendInput(node.value)})`;
        case InputOpcode.OP_LOG_10:
            return `(Math.log(${this.descendInput(node.value)}) / Math.LN10)`;
        case InputOpcode.OP_MOD:
            this.descendedIntoModulo = true;
            return `mod(${this.descendInput(node.left)}, ${this.descendInput(node.right)})`;
        case InputOpcode.OP_MULTIPLY:
            return `(${this.descendInput(node.left)} * ${this.descendInput(node.right)})`;
        case InputOpcode.OP_NOT:
            return `!${this.descendInput(node.operand)}`;
        case InputOpcode.OP_OR:
            return `(${this.descendInput(node.left)} || ${this.descendInput(node.right)})`;
        case InputOpcode.OP_RANDOM:
            if (node.useInts) {
                return `randomInt(${this.descendInput(node.low)}, ${this.descendInput(node.high)})`;
            }
            if (node.useFloats) {
                return `randomFloat(${this.descendInput(node.low)}, ${this.descendInput(node.high)})`;
            }
            return `runtime.ext_scratch3_operators._random(${this.descendInput(node.low)}, ${this.descendInput(node.high)})`;
        case InputOpcode.OP_ROUND:
            return `Math.round(${this.descendInput(node.value)})`;
        case InputOpcode.OP_SIN:
            return `(Math.round(Math.sin((Math.PI * ${this.descendInput(node.value)}) / 180) * 1e10) / 1e10)`;
        case InputOpcode.OP_SQRT:
            return `Math.sqrt(${this.descendInput(node.value)})`;
        case InputOpcode.OP_SUBTRACT:
            return `(${this.descendInput(node.left)} - ${this.descendInput(node.right)})`;
        case InputOpcode.OP_TAN:
            return `tan(${this.descendInput(node.value)})`;
        case InputOpcode.OP_POW_10:
            return `(10 ** ${this.descendInput(node.value)})`;

        //pm operators
        case InputOpcode.PM_OP_AVERAGE: {
            let accumulator = this.localVariables.next();
            let value = this.localVariables.next();
            let array = this.localVariables.next();
            return `([${node.inputs.map(input => this.descendInput(input)).join(', ')}].reduce((${accumulator}, ${value}, _, ${array}) => ${accumulator} + ${value} / ${array}.length, 0))`;
        }
        case InputOpcode.PM_OP_BOOL_EXPANDABLE: {
            const opMap = {
                "a": " && ",
                "n": " && ",
                "o": " || ",
                "N": " || ",
                "x": " != ",
                "X": " != ",
            };
            const isAbnormal = op => op === "n" || op === "N" || op === "X";

            let abnormalCount = 0;
            let output = "(";

            for (let i in node.inputs) {
                let op = node.operations[i];
                let abnormal = isAbnormal(op);

                if (abnormal) {
                    output += "!(";
                    abnormalCount++;
                }
                output += this.descendInput(node.inputs[i]);
                if (!abnormal && abnormalCount > 0) {
                    output += ")";
                    abnormalCount--;
                }
                output += opMap[op] ?? "";
            }

            while (abnormalCount > 0) {
                output += ")";
                abnormalCount--;
            }
            output += ")";
            return output;
        }
        case InputOpcode.PM_OP_COMPARE_EXPANDABLE: {
            const opMap = {
                "e": (a, b) => `vm.runtime.equals(${a}, ${b})`,
                "n": (a, b) => `!vm.runtime.equals(${a}, ${b})`,
                "m": (a, b) => `compareGreaterThan(${a}, ${b})`,
                "M": (a, b) => `!compareLessThan(${a}, ${b})`,
                "l": (a, b) => `compareLessThan(${a}, ${b})`,
                "L": (a, b) => `!compareGreaterThan(${a}, ${b})`
            };

            /*
                example output:
                1 < 2 < 3 < 4
                (function*(a){ return 1 < a && (function*(b){ return a < b && (function*(c){ return b < c })(4) })(3) })(2)
            */

            const variables = []
            const recursive = (i) => {
                variables[i] = this.localVariables.next();
                const op = opMap[node.operations[i - 1]];
                const left = i === 1 ? this.descendInput(node.inputs[0]) : variables[i - 1];
                const right = variables[i];

                let source = "";
                source += "(yield* (function* (" + variables[i] + ") {\n";
                source += "return " + op(left, right);
                if (i < node.inputs.length - 1) {
                    source += " && " + recursive(i + 1);
                }
                source += ";\n";
                source += "})(" + this.descendInput(node.inputs[i]) + "))";

                return source;
            }

            return recursive(1);
        }
        case InputOpcode.PM_OP_CHARACTER_TO_CODE:
            return `(${this.descendInput(node.one)}).charCodeAt(0)`;
        case InputOpcode.PM_OP_CODE_TO_CHARACTER:
            return `String.fromCharCode(${this.descendInput(node.one)})`;
        case InputOpcode.PM_OP_COUNT_APPEAR_TIMES:
            return `((${this.descendInput(node.text2)}).split(${this.descendInput(node.text1)}).length - 1)`
        case InputOpcode.PM_OP_CONSTRAIN:
            return `Math.min(Math.max(${this.descendInput(node.min)}, ${this.descendInput(node.input)}), ${this.descendInput(node.max)})`;
        case InputOpcode.PM_OP_DECODE_B16:
            return `(t => { try { return new TextDecoder().decode(Uint8Array.fromHex(t)); } catch (e) { return ""; } })(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_DECODE_B64:
            return `decodeBase64ToString(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_DECODE_URI:
            return `decodeURIComponent(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_ENCODE_B16:
            return `(new TextEncoder().encode(${this.descendInput(node.text)})).toHex()`;
        case InputOpcode.PM_OP_ENCODE_B64:
            return `encodeStringToBase64(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_ENCODE_URI:
            return `encodeURIComponent(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_ENDS_WITH:
            return `String.prototype.endsWith.call(${this.descendInput(node.text)}, ${this.descendInput(node.term)})`;
        case InputOpcode.PM_OP_INDEX_OF_TEXT_IN_TEXT:
            return `((${this.descendInput(node.text2)}).indexOf(${this.descendInput(node.text1)}) + 1)`
         case InputOpcode.PM_OP_LAST_INDEX_OF_TEXT_IN_TEXT:
            return `((${this.descendInput(node.text2)}).lastIndexOf(${this.descendInput(node.text1)}) + 1)`
        case InputOpcode.PM_OP_INTERPOLATE:
            return `((a, b, c) => (b - a) * c + a)(${this.descendInput(node.from)}, ${this.descendInput(node.to)}, ${this.descendInput(node.amount)})`;
        case InputOpcode.PM_OP_IS_BOOLEAN:
            return `(["false", "true"].includes(String(${this.descendInput(node.value)})))`;
        case InputOpcode.PM_OP_IS_NUMBER:
            return `(!isNaN(Number(${this.descendInput(node.value)})))`;
        case InputOpcode.PM_OP_IS_STRING:
            return `(${this.descendInput(node.value)} !== null)`;
        case InputOpcode.PM_OP_JOIN_EXPANDABLE:
            return `String.prototype.concat(${node.inputs.map(input => this.descendInput(input)).join(', ')})`;
        case InputOpcode.PM_OP_LETTERS_OF:
            return `${this.descendInput(node.text)}.substring(Math.max(1, ${this.descendInput(node.from)}) - 1, Math.max(1, ${this.descendInput(node.to)}) - ${node.notFixed ? 1 : 0})`;
        case InputOpcode.PM_OP_LOG:
            return `(Math.log(${this.descendInput(node.right)}) / Math.log(${this.descendInput(node.left)}))`;
        case InputOpcode.PM_OP_LOG_2:
            return `(Math.log(${this.descendInput(node.value)}) / Math.LN2)`;
        case InputOpcode.PM_OP_LOWER_CASE:
            return `String.prototype.toLowerCase.call(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_MATH_EXPANDABLE: {
            const opMap = {
                "+": " + ",
                "-": " - ",
                "*": " * ",
                "/": " / ",
                "^": " ** "
            };

            let output = "("

            for (let i in node.inputs) {
                if (Number(i) > 0) {
                    let operation = opMap[node.operations[Number(i) - 1]];
                    if (!operation) continue;
                    output += operation;
                }
                let input = node.inputs[i];
                output += this.descendInput(input);
            }

            output += ")";
            return output;
        }
        case InputOpcode.PM_OP_MAXIMUM:
            return `Math.max(${node.inputs.map(input => this.descendInput(input)).join(', ')})`;
        case InputOpcode.PM_OP_MINIMUM:
            return `Math.min(${node.inputs.map(input => this.descendInput(input)).join(', ')})`;
        case InputOpcode.PM_OP_POWER:
            return `(${this.descendInput(node.left)} ** ${this.descendInput(node.right)})`;
        case InputOpcode.PM_OP_RANDOMBOOL:
            return `(Math.random() < 0.5)`;
        case InputOpcode.PM_OP_RANGE:
            return `rangeOfNumbers(${node.inputs.map(input => this.descendInput(input)).join(', ')})`;
        case InputOpcode.PM_OP_READ_LINE:
            return `(${this.descendInput(node.text)}.split('\\n')[${this.descendInput(node.line)} - 1] ?? "")`;
        case InputOpcode.PM_OP_REGEX_MATCH:
            return `runtime.ext_scratch3_operators._regexMatch(${this.descendInput(node.text)}, ${this.descendInput(node.regex)}, ${this.descendInput(node.flags)})`;
        case InputOpcode.PM_OP_REPLACEALL:
            return `String.prototype.replaceAll.call(${this.descendInput(node.text)}, ${this.descendInput(node.find)}, ${this.descendInput(node.replace)})`;
        case InputOpcode.PM_OP_REPLACEFIRST:
            return `String.prototype.replace.call(${this.descendInput(node.text)}, ${this.descendInput(node.find)}, ${this.descendInput(node.replace)})`;
        case InputOpcode.PM_OP_ROOT:
            return `(${this.descendInput(node.right)} ** (1 / ${this.descendInput(node.left)}))`;
        case InputOpcode.PM_OP_SIGN:
            return `Math.sign(${this.descendInput(node.value)})`;
        case InputOpcode.PM_OP_TEXT_INCLUDES_LETTER_FROM:
            return `((${this.descendInput(node.text2)}).split('').some(char => (${this.descendInput(node.text1)}).includes(char)))`
        case InputOpcode.PM_OP_STARTS_WITH:
            return `String.prototype.startsWith.call(${this.descendInput(node.text)}, ${this.descendInput(node.term)})`;
        case InputOpcode.PM_OP_UPPER_CASE:
            return `String.prototype.toUpperCase.call(${this.descendInput(node.text)})`;
        case InputOpcode.PM_OP_XOR:
            return `(${this.descendInput(node.left)} !== ${this.descendInput(node.right)})`;
        case InputOpcode.PM_OP_DIRECTION_COORDINATES:
            return `runtime.ext_scratch3_sensing._getDirectionToFrom(${this.descendInput(node.x1)}, ${this.descendInput(node.x2)}, ${this.descendInput(node.y1)}, ${this.descendInput(node.y2)})`;
        case InputOpcode.PM_OP_DISTANCE_COORDINATES:
            return `Math.hypot(${this.descendInput(node.x2)} - ${this.descendInput(node.x1)}, ${this.descendInput(node.y2)} - ${this.descendInput(node.y1)})`;

        case InputOpcode.SENSING_ANSWER:
            return `runtime.ext_scratch3_sensing._answer`;
        case InputOpcode.SENSING_COLOR_TOUCHING_COLOR:
            return `target.colorIsTouchingColor(${this.descendInput(node.target)}, ${this.descendInput(node.mask)})`;
        case InputOpcode.SENSING_TIME_DATE:
            return `(new Date().getDate())`;
        case InputOpcode.SENSING_TIME_WEEKDAY:
            return `(new Date().getDay() + 1)`;
        case InputOpcode.SENSING_TIME_DAYS_SINCE_2000:
            return 'daysSince2000()';
        case InputOpcode.SENSING_DISTANCE:
            // TODO: on stages, this can be computed at compile time
            return `distance(${this.descendInput(node.target)})`;
        case InputOpcode.SENSING_TIME_HOUR:
            return `(new Date().getHours())`;
        case InputOpcode.SENSING_TIME_MINUTE:
            return `(new Date().getMinutes())`;
        case InputOpcode.SENSING_TIME_MONTH:
            return `(new Date().getMonth() + 1)`;
        case InputOpcode.SENSING_OF:
            return `runtime.ext_scratch3_sensing.getAttributeOf({OBJECT: ${this.descendInput(node.object)}, PROPERTY: "${sanitize(node.property)}" })`;
        case InputOpcode.SENSING_OF_VOLUME: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.volume : 0)`;
        } case InputOpcode.SENSING_OF_BACKDROP_NUMBER:
            return `(stage.currentCostume + 1)`;
        case InputOpcode.SENSING_OF_BACKDROP_NAME:
            return `stage.getCostumes()[stage.currentCostume].name`;
        case InputOpcode.SENSING_OF_POS_X: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.x : 0)`;
        } case InputOpcode.SENSING_OF_POS_Y: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.y : 0)`;
        } case InputOpcode.SENSING_OF_DIRECTION: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.direction : 0)`;
        } case InputOpcode.SENSING_OF_COSTUME_NUMBER: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.currentCostume + 1 : 0)`;
        } case InputOpcode.SENSING_OF_COSTUME_NAME: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.getCostumes()[${targetRef}.currentCostume].name : 0)`;
        } case InputOpcode.SENSING_OF_SIZE: {
            const targetRef = this.descendTargetReference(node.object);
            return `(${targetRef} ? ${targetRef}.size : 0)`;
        } case InputOpcode.SENSING_OF_VAR: {
            const targetRef = this.descendTargetReference(node.object);
            const varRef = this.evaluateOnce(`${targetRef} && ${targetRef}.lookupVariableByNameAndType("${sanitize(node.property)}", "", true)`);
            return `(${varRef} ? ${varRef}.value : 0)`;
        } case InputOpcode.SENSING_TIME_SECOND:
            return `(new Date().getSeconds())`;
        case InputOpcode.SENSING_TOUCHING_OBJECT:
            return `target.isTouchingObject(${this.descendInput(node.object)})`;
        case InputOpcode.SENSING_TOUCHING_COLOR:
            return `target.isTouchingColor(${this.descendInput(node.color)})`;
        case InputOpcode.SENSING_USERNAME:
            return 'runtime.ioDevices.userData.getUsername()';
        case InputOpcode.SENSING_TIME_YEAR:
            return `(new Date().getFullYear())`;
        case InputOpcode.SENSING_TIMER_GET:
            return 'runtime.ioDevices.clock.projectTimer()';
        case InputOpcode.SENSING_MOUSE_DOWN:
            return 'runtime.ioDevices.mouse.getIsDown()';
        case InputOpcode.SENSING_MOUSE_X:
            return 'runtime.ioDevices.mouse.getScratchX()';
        case InputOpcode.SENSING_MOUSE_Y:
            return 'runtime.ioDevices.mouse.getScratchY()';
        case InputOpcode.SENSING_KEY_DOWN:
            return `runtime.ioDevices.keyboard.getKeyIsDown(${this.descendInput(node.key)})`;

        //pm sensing
        case InputOpcode.PM_SENSING_BROWSER:
            return `runtime.ext_scratch3_sensing._getBrowser()`;
        case InputOpcode.PM_SENSING_DRAGGABLE:
            return `target.draggable`;
        case InputOpcode.PM_SENSING_FINGER_DOWN:
            return `runtime.ioDevices.touch.getIsDown(${this.descendInput(node.finger)} - 1)`;
        case InputOpcode.PM_SENSING_FINGER_TAPPED:
            return `runtime.ioDevices.touch.getIsTapped(${this.descendInput(node.finger)} - 1)`;
        case InputOpcode.PM_SENSING_FINGER_X:
            return `runtime.ioDevices.touch.getScratchX(${this.descendInput(node.finger)} - 1)`;
        case InputOpcode.PM_SENSING_FINGER_Y:
            return `runtime.ioDevices.touch.getScratchY(${this.descendInput(node.finger)} - 1)`;
        case InputOpcode.PM_SENSING_HAS_NUMBER:
            return `/\d/.test(Cast.toString(${this.descendInput(node.text)}))`;
        case InputOpcode.PM_SENSING_KEY_HIT:
            return `runtime.ioDevices.keyboard.getKeyIsHit(${this.descendInput(node.key)})`;
        case InputOpcode.PM_SENSING_IS_TEXT:
            return `isNaN(Number(${this.descendInput(node.text)}))`;
        case InputOpcode.PM_SENSING_LOGGED_IN:
            return `runtime.ioDevices.userData._loggedIn`;
        case InputOpcode.PM_SENSING_MOBILE:
            return `(typeof window !== 'undefined' && 'ontouchstart' in window)`;
        case InputOpcode.PM_SENSING_MOUSEBTN_CLICKED:
            return `runtime.ioDevices.mouse.getButtonIsClicked(${node.button})`;
        case InputOpcode.PM_SENSING_MOUSEBTN_DOWN:
            return `runtime.ioDevices.mouse.getButtonIsDown(${node.button})`;
        case InputOpcode.PM_SENSING_MOUSEBTN_RELEASED:
            return `runtime.ioDevices.mouse.getButtonIsReleased(${node.button})`;
        case InputOpcode.PM_SENSING_MOUSE_SCROLLING:
            return `runtime.ext_scratch3_sensing._mouseScrolling(${this.descendInput(node.option)}, runtime.ioDevices.mouseWheel.scrollDelta)`;
        case InputOpcode.PM_SENSING_OBJECT_TOUCHING_CLONE:
            return `runtime.ext_scratch3_sensing._objectTouchingCloneOfSprite(${this.descendInput(node.object1)}, ${this.descendInput(node.object2)}, target)`;
        case InputOpcode.PM_SENSING_OBJECT_TOUCHING_OBJECT:
            return `runtime.ext_scratch3_sensing._objectTouchingObject(${this.descendInput(node.object1)}, ${this.descendInput(node.object2)}, target)`;
        case InputOpcode.PM_SENSING_OS:
            return `runtime.ext_scratch3_sensing._getOS()`;
        case InputOpcode.PM_SENSING_REGEX_TEST:
            return `runtime.ext_scratch3_sensing._regexTest(${this.descendInput(node.text)}, ${this.descendInput(node.regex)}, ${this.descendInput(node.flags)})`;
        case InputOpcode.PM_SENSING_SPRITE_WITH_ATTRIB:
            return `runtime.ext_scratch3_sensing._spriteWithAttrib(${this.descendInput(node.varName)}, ${this.descendInput(node.varValue)})`;
        case InputOpcode.PM_SENSING_TIME_TIMESTAMP:
            return `Date.now()`;
        case InputOpcode.PM_SENSING_TOUCHING_POINT_X:
            return `target.objectTouchingPoint(${this.descendInput(node.object)})[0]`;
        case InputOpcode.PM_SENSING_TOUCHING_POINT_Y:
            return `target.objectTouchingPoint(${this.descendInput(node.object)})[1]`;
        case InputOpcode.PM_SENSING_UPPERCASE_TEXT:
            return `runtime.ext_scratch3_sensing._isTextUppercase(${this.descendInput(node.text)})`;
        case InputOpcode.PM_SENSING_URL:
            return `location.href`;

        case InputOpcode.VAR_GET:
            return `${this.referenceVariable(node.variable)}.value`;

        //pm variables
        case InputOpcode.PM_VAR_VISIBLE:
            return `(runtime.monitorBlocks.getBlock("${sanitize(node.variable.id)}")?.isMonitored ?? false)`;

        case InputOpcode.TW_KEY_LAST_PRESSED:
            return 'runtime.ioDevices.keyboard.getLastKeyPressed()';

        case InputOpcode.PROCEDURE_CALL: {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            const procedureData = this.ir.procedures[procedureVariant];
            if (procedureData.stack === null) {
                // TODO still need to evaluate arguments for side effects
                return '""';
            }

            // Recursion makes this complicated because:
            //  - We need to yield *between* each call in the same command block
            //  - We need to evaluate arguments *before* that yield happens

            const procedureReference = `thread.procedures["${sanitize(procedureVariant)}"]`;
            const args = [];
            const tempFn = this.localVariables.next();
            for (let i = 0; i < node.arguments.length; i++) {
                const input = node.arguments[i];
                if (input instanceof IntermediateStack) {
                    //is a stack input
                    let stack = this.descendStackInline(input, {isWarp: procedureData.isWarp, allowReturns: true});
                    args.push(`function*(thread, target, runtime, stage) {${stack}}`);
                } else {
                    // Only wrap in function if it's reevaluated
                    args.push(
                        procedureData.reevaled.has(i) 
                        ? `yield* (function*() {const ${tempFn} = function*() {return ${this.descendInput(input)};}; return [yield* ${tempFn}(), ${tempFn}]})()`  
                        : this.descendInput(input)
                    );
                }
            }
            const joinedArgs = args.join(',');

            const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
            const yieldForHat = this.isInHat;
            if (yieldForRecursion || yieldForHat) {
                const runtimeFunction = procedureData.yields ? 'yieldThenCallGenerator' : 'yieldThenCall';
                return `(yield* ${runtimeFunction}(${procedureReference}, ${joinedArgs}))`;
            }
            if (procedureData.yields) {
                return `(yield* ${procedureReference}(${joinedArgs}))`;
            }
            return `${procedureReference}(${joinedArgs})`;
        }

        default:
            for (let extensionId in JSGenerator.compilerExtensions) {
                let extension = JSGenerator.compilerExtensions[extensionId]
                if (extension.reporter) {
                    let returns = extension.reporter.call(this, block);
                    if (returns) return returns;
                }
            }

            log.warn(`JS: Unknown input: ${block.opcode}`, node);
            throw new Error(`JS: Unknown input: ${block.opcode}`);
        }
    }

    /**
     * @param {IntermediateStackBlock} block Stacked block to compile.
     */
    descendStackedBlock (block) {
        const node = block.inputs;
        switch (block.opcode) {
        case StackOpcode.ADDON_CALL: {
            this.source += `${this.descendAddonCall(node)};\n`;
            break;
        }

        case StackOpcode.COMPATIBILITY_LAYER: {
            // If the last command in a loop returns a promise, immediately continue to the next iteration.
            // If you don't do this, the loop effectively yields twice per iteration and will run at half-speed.
            const isLastInLoop = this.isLastBlock && this.inLoop;

            const blockType = node.blockType;
            if (blockType === BlockType.CONDITIONAL || blockType === BlockType.LOOP) {
                const branchVariable = this.localVariables.next();
                const oldLoopName = this.loopName;
                this.loopName = this.localVariables.next();
                this.source += `const ${branchVariable} = createBranchInfo(${blockType === BlockType.LOOP});\n`;
                this.source += `${this.loopName}: while (${branchVariable}.branch = (${this.generateCompatibilityLayerCall(node, false, branchVariable)})) {\n`;
                this.source += `switch ("SUBSTACK" + (${branchVariable}.branch == 1 ? "" : ${branchVariable}.branch)) {\n`;
                for (const index in node.substacks) {
                    this.source += `case "${sanitize(index.toString())}": {\n`;
                    this.descendStack(node.substacks[index]);
                    this.source += `break;\n`;
                    this.source += `}\n`; // close case
                }
                this.source += '}\n'; // close switch
                this.source += `if (!${branchVariable}.isLoop) break;\n`;
                this.yieldLoop();
                this.source += '}\n'; // close while
                this.loopName = oldLoopName;
            } else {
                this.source += `${this.generateCompatibilityLayerCall(node, isLastInLoop)};\n`;
            }

            if (isLastInLoop) {
                this.source += 'if (hasResumedFromPromise) {hasResumedFromPromise = false;continue;}\n';
            }
            break;
        }

        case InputOpcode.OLD_COMPILER_COMPATIBILITY_LAYER:
            return this.oldCompilerStub.descendStackedBlockFromNewCompiler(block);

        //pm branched procedures
        case StackOpcode.PM_PROCEDURE_COMMANDARG:
            if (node.index !== -1) {
                let outputVariable = this.localVariables.next();
                this.source += `let ${outputVariable} = yield* (p${node.index} || function*(){})(thread, target, runtime, stage);\n`;
                this.source += `if (${outputVariable} !== undefined) { return ${outputVariable}; };\n`
            }
            break;

        case StackOpcode.HAT_EDGE:
            this.isInHat = true;
            this.source += '{\n';
            // For exact Scratch parity, evaluate the input before checking old edge state.
            // Can matter if the input is not instantly evaluated.
            this.source += `const resolvedValue = ${this.descendInput(node.condition)};\n`;
            this.source += `const id = "${sanitize(node.id)}";\n`;
            this.source += 'const hasOldEdgeValue = target.hasEdgeActivatedValue(id);\n';
            this.source += `const oldEdgeValue = target.updateEdgeActivatedValue(id, resolvedValue);\n`;
            this.source += `const edgeWasActivated = hasOldEdgeValue ? (!oldEdgeValue && resolvedValue) : resolvedValue;\n`;
            this.source += `if (!edgeWasActivated) {\n`;
            this.retire();
            this.source += '}\n';
            this.source += 'yield;\n';
            this.source += '}\n';
            this.isInHat = false;
            break;

        case StackOpcode.HAT_PREDICATE:
            this.isInHat = true;
            this.source += `if (!${this.descendInput(node.condition)}) {\n`;
            this.retire();
            this.source += '}\n';
            this.source += 'yield;\n';
            this.isInHat = false;
            break;

        case StackOpcode.CONTROL_CLONE_CREATE:
            this.source += `runtime.ext_scratch3_control._createClone(${this.descendInput(node.target)}, target);\n`;
            break;
        case StackOpcode.CONTROL_CLONE_DELETE:
            this.source += 'if (!target.isOriginal) {\n';
            this.source += '  runtime.disposeTarget(target);\n';
            this.source += '  runtime.stopForTarget(target);\n';
            this.retire();
            this.source += '}\n';
            break;
        case StackOpcode.CONTROL_FOR: {
            const index = this.localVariables.next();
            const loopName = this.localVariables.next();
            this.source += `var ${index} = 0; `;
            this.source += `${loopName}: while (${index} < ${this.descendInput(node.count)}) { `;
            this.source += `${index}++; `;
            this.source += `${this.referenceVariable(node.variable)}.value = ${index};\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            this.yieldLoop();
            this.source += '}\n';
            break;
        }
        case StackOpcode.CONTROL_IF_ELSE:
            this.source += `if (${this.descendInput(node.condition)}) {\n`;
            this.descendStack(node.whenTrue);
            // only add the else branch if it won't be empty
            // this makes scripts have a bit less useless noise in them
            if (node.whenFalse.blocks.length) {
                this.source += `} else {\n`;
                this.descendStack(node.whenFalse);
            }
            this.source += `}\n`;
            break;
        case StackOpcode.CONTROL_REPEAT: {
            const i = this.localVariables.next();
            const loopName = this.localVariables.next();
            if (node.times.isAlwaysType(InputType.NUMBER_INT | InputType.NUMBER_INF)) {
                this.source += `${loopName}: for (var ${i} = ${this.descendInput(node.times)}; ${i} > 0; ${i}--) {\n`;
            } else {
                this.source += `${loopName}: for (var ${i} = ${this.descendInput(node.times)}; ${i} >= 0.5; ${i}--) {\n`;
            }
            this.descendStack(node.do, {inLoop: true, loopName});
            this.yieldLoop();
            this.source += `}\n`;
            break;
        }
        case StackOpcode.CONTROL_STOP_ALL:
            this.source += 'runtime.stopAll();\n';
            this.retire();
            break;
        case StackOpcode.CONTROL_STOP_OTHERS:
            this.source += 'runtime.stopForTarget(target, thread);\n';
            break;
        case StackOpcode.CONTROL_STOP_SCRIPT:
            this.stopScript();
            break;
        case StackOpcode.PM_CONTROL_STOP_THREAD:
            this.retire();
            break;
        case StackOpcode.CONTROL_WAIT: {
            const duration = this.localVariables.next();
            this.source += `thread.timer = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.seconds)});\n`;
            this.requestRedraw();
            // always yield at least once, even on 0 second durations
            this.yieldNotWarp();
            this.source += `while (thread.timer.timeElapsed() < ${duration}) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += '}\n';
            this.source += 'thread.timer = null;\n';
            break;
        }
        case StackOpcode.CONTROL_WAIT_UNTIL: {
            this.source += `while (!${this.descendInput(node.condition)}) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += `}\n`;
            break;
        }
        case StackOpcode.CONTROL_WHILE: {
            const loopName = this.localVariables.next();
            this.source += `${loopName}: while (${this.descendInput(node.condition)}) {\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            if (node.warpTimer) {
                this.yieldStuckOrNotWarp();
            } else {
                this.yieldLoop();
            }
            this.source += `}\n`;
            break;
        }
        case StackOpcode.CONTROL_CLEAR_COUNTER:
            this.source += 'runtime.ext_scratch3_control._counter = 0;\n';
            break;
        case StackOpcode.CONTORL_INCR_COUNTER:
            this.source += 'runtime.ext_scratch3_control._counter++;\n';
            break;

        //pm control
        case StackOpcode.PM_CONTROL_ALL_AT_ONCE:
            this.descendStack(node.stack, {isWarp: node.value});
            break;
        case StackOpcode.PM_CONTROL_CONTINUE_LOOP:
            if (this.inLoop) {
                this.yieldLoop();
                this.source += this.loopName ? `continue ${this.loopName};\n` : 'continue;\n';
            } else {
                this.source += `throw 'All "continue loop" blocks must be inside of a looping block.';\n`;
            }
            break;
        case StackOpcode.PM_CONTROL_DECR_COUNTER:
            this.source += 'runtime.ext_scratch3_control._counter--;\n';
            break;
        case StackOpcode.PM_CONTROL_DELETE_CLONES:
            this.source += `runtime.ext_scratch3_control._deleteClones(${this.descendInput(node.target)}, target);\n`;
            break;
        case StackOpcode.PM_CONTROL_DO_WHILE: {
            const loopName = this.localVariables.next();
            this.source += `${loopName}: do {\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            if (node.warpTimer) {
                this.yieldStuckOrNotWarp();
            } else {
                this.yieldLoop();
            }
            this.source += `} while (${this.descendInput(node.condition)});\n`;
            break;
        }
        case StackOpcode.PM_CONTROL_ESCAPE_LOOP:
            if (this.inLoop) {
                this.source += this.loopName ? `break ${this.loopName};\n` : 'break;\n';
            } else {
                this.source += `throw 'All "escape loop" blocks must be inside of a looping block.';\n`;
            }
            break;
        case StackOpcode.PM_CONTROL_EXPANDABLE_IF:
            this.source += node.ifs.map(v => `if (${this.descendInput(v.condition)}) {\n${this.descendStackInline(v.do)}\n}`).join(' else ');
            if (node.elseDo) this.source += `else {\n${this.descendStackInline(node.elseDo)}\n}`;
            this.source += '\n';
            break;
        case StackOpcode.PM_CONTROL_EXIT_CASE:
            if (this.inCase) {
                this.source += this.switchName ? `break ${this.switchName};\n` : 'break;\n';
            } else {
                this.source += `throw 'All "exit case" blocks must be inside of a "case" block.';\n`;
            }
            break;
        case StackOpcode.PM_CONTROL_FROM_TO: {
            const from = this.localVariables.next();
            const to = this.localVariables.next();
            const index = this.localVariables.next();
            const loopName = this.localVariables.next();
            this.source += `var ${from} = ${this.descendInput(node.from)};\n`;
            this.source += `var ${to} = ${this.descendInput(node.to)};\n`;
            this.source += `${loopName}: for (var ${index} = ${from}; ${index} <= ${to}; ${index}++) {\n`;
            this.source += `let _pmControlFromToIndex = ${index};\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            this.yieldLoop();
            this.source += '}\n';
            break;
        }
        case StackOpcode.PM_CONTROL_REPEAT_SECONDS: {
            const duration = this.localVariables.next();
            const timer = this.localVariables.next();
            const loopName = this.localVariables.next();
            this.source += `let ${timer} = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.seconds)});\n`;
            this.requestRedraw();
            this.source += `${loopName}: while (${timer}.timeElapsed() < ${duration}) {\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            this.yieldLoop();
            this.source += '}\n';
            break;
        }
        case StackOpcode.PM_CONTROL_RESTART_PROJECT:
            this.source += `runtime.greenFlag();\n`;
            this.retire();
            break;
        case StackOpcode.PM_CONTROL_RUN_AS: {
            const isStage = node.sprite.opcode === InputOpcode.CONSTANT && node.sprite.value === '_stage_';

            const originalTarget = this.localVariables.next();
            this.source += `const ${originalTarget} = target;\n`;
            this.source += `{\n`;
            if (isStage) {
                this.source += `let target = runtime._stageTarget`;
            } else {
                const evaluatedName = this.localVariables.next();
                this.source += `const ${evaluatedName} = ${this.descendInput(node.sprite)};\n`;
                this.source += `let target = runtime.getSpriteTargetByName(${evaluatedName}) || runtime.getTargetById(${evaluatedName});\n`;
            }
            this.source += `thread.target = target;\n`;
            this.source += `if (target) {\n`;
            this.descendStack(node.substack);
            this.source += `}\n`;
            this.source += `target = ${originalTarget};\n`;
            this.source += `thread.target = ${originalTarget};\n`;
            this.source += `}\n`;
            break;
        }
        case StackOpcode.PM_CONTROL_SET_COUNTER:
            this.source += `runtime.ext_scratch3_control._counter = ${this.descendInput(node.value)};\n`;
            break;
        case StackOpcode.PM_CONTROL_STOP_SPRITE:
            this.source += `runtime.ext_scratch3_control._stopSprite(${this.descendInput(node.sprite)}, target);\n`;
            break;
        case StackOpcode.PM_CONTROL_SWITCH:
            const switchName = this.localVariables.next();
            this.source += `${switchName}: switch (${this.descendInput(node.condition)}) {\n`;
            for (const c of node.cases) {
                if (c[1]) {
                    this.source += `case ${this.descendInput(c[0])}: {\n`;
                    this.descendStack(c[1], {inCase: true, switchName});
                    this.source += `break;\n`;
                    this.source += `}\n`;
                } else {
                    this.source += `case ${this.descendInput(c[0])}:\n`;
                }
            }
            if (node.default && node.default.blocks.length > 0) {
                this.source += `default: {\n`;
                this.descendStack(node.default, {inCase: true, switchName});
                this.source += `break;\n`;
                this.source += `}\n`;
            }
            this.source += '}\n';
            break;
        case StackOpcode.PM_CONTROL_THROW_ERROR:
            this.source += `throw ${this.descendInput(node.error)};\n`;
            break;
        case StackOpcode.PM_CONTROL_TRY_CATCH: {
            const error = this.localVariables.next();
            this.source += 'try {\n';
            this.descendStack(node.try);
            this.source += `} catch (${error}) {\n`;
            this.source += `const _pmControlTryCatchError = String(${error});\n`;
            this.descendStack(node.catch);
            this.source += '}\n';
            break;
        }
        case StackOpcode.PM_CONTROL_WAIT_OR_UNTIL:
            const duration = this.localVariables.next();
            this.source += `thread.timer = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.seconds)});\n`;
            this.requestRedraw();
            // always yield at least once, even on 0 second durations
            this.yieldNotWarp();
            this.source += `while ((thread.timer.timeElapsed() < ${duration}) && (!${this.descendInput(node.condition)})) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += '}\n';
            this.source += 'thread.timer = null;\n';
            break;
        case StackOpcode.PM_CONTROL_WAIT_TICK:
            this.yieldNotWarp();
            break;

        case StackOpcode.EVENT_BROADCAST:
            this.source += `startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${this.descendInput(node.broadcast)} });\n`;
            break;
        case StackOpcode.EVENT_BROADCAST_AND_WAIT:
            this.source += `yield* waitThreads(startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${this.descendInput(node.broadcast)} }));\n`;
            this.yielded();
            break;

        case StackOpcode.LIST_ADD: {
            const list = this.referenceVariable(node.list);
            this.source += `${list}.value.push(${this.descendInput(node.item)});\n`;
            this.source += `${list}._monitorUpToDate = false;\n`;
            break;
        }
        case StackOpcode.LIST_DELETE: {
            const list = this.referenceVariable(node.list);
            if (node.index.isConstant('last')) {
                this.source += `${list}.value.pop();\n`;
                this.source += `${list}._monitorUpToDate = false;\n`;
                break;
            }
            if (node.index.isConstant(1)) {
                this.source += `${list}.value.shift();\n`;
                this.source += `${list}._monitorUpToDate = false;\n`;
                break;
            }
            // do not need a special case for all as that is handled in IR generation (list.deleteAll)
            this.source += `listDelete(${list}, ${this.descendInput(node.index)});\n`;
            break;
        }
        case StackOpcode.LIST_DELETE_ALL:
            this.source += `${this.referenceVariable(node.list)}.value = [];\n`;
            break;
        case StackOpcode.LIST_HIDE:
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case StackOpcode.LIST_INSERT: {
            const list = this.referenceVariable(node.list);
            const item = this.descendInput(node.item);
            if (node.index.isConstant(1)) {
                this.source += `${list}.value.unshift(${item});\n`;
                this.source += `${list}._monitorUpToDate = false;\n`;
                break;
            }
            this.source += `listInsert(${list}, ${this.descendInput(node.index)}, ${item});\n`;
            break;
        }
        case StackOpcode.LIST_REPLACE:
            this.source += `listReplace(${this.referenceVariable(node.list)}, ${this.descendInput(node.index)}, ${this.descendInput(node.item)});\n`;
            break;
        case StackOpcode.LIST_SHOW:
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;

        // pm lists
        case StackOpcode.PM_LIST_ARRAY_SET: 
            this.source += `runtime.ext_scratch3_data._listSetArray(${this.referenceVariable(node.list)}, ${this.descendInput(node.array)});\n`;
            break;
        case StackOpcode.PM_LIST_FILTER: {
            const list = this.localVariables.next();
            this.source += `const ${list} = [...${this.referenceVariable(node.list)}.value];\n`;
            const output = this.localVariables.next();
            this.source += `const ${output} = [];\n`;
            this.source += `for (let _scratch3DataIndex = 1; _scratch3DataIndex <= ${list}.length; _scratch3DataIndex++) {\n`;
            this.source += `const _scratch3DataItem = ${list}[_scratch3DataIndex - 1];\n`;
            this.source += `if (${this.descendInput(node.condition)}) ${output}.push(_scratch3DataItem);\n`;
            this.yieldLoop();
            this.source += `}\n`;
            this.source += `${this.referenceVariable(node.list)}.value = ${output};\n`;
            break;
        }
        case StackOpcode.PM_LIST_FOREACH: {
            const list = this.localVariables.next();
            const loopName = this.localVariables.next();
            this.source += `const ${list} = [...${this.referenceVariable(node.list)}.value];\n`;
            this.source += `for (let _scratch3DataIndex = 1; _scratch3DataIndex <= ${list}.length; _scratch3DataIndex++) {\n`;
            this.source += `const _scratch3DataItem = ${list}[_scratch3DataIndex - 1];\n`;
            if (node.indexVariable) this.source += `${this.referenceVariable(node.indexVariable)}.value = _scratch3DataIndex;\n`;
            if (node.itemVariable) this.source += `${this.referenceVariable(node.itemVariable)}.value = _scratch3DataItem;\n`;
            this.descendStack(node.do, {inLoop: true, loopName});
            this.yieldLoop();
            this.source += `}\n`;
            break;
        }
        case StackOpcode.PM_LIST_REVERSE: {
            const list = this.referenceVariable(node.list);
            this.source += `${list}.value.reverse();\n`;
            this.source += `${list}._monitorUpToDate = false;\n`;
            break;
        }
        case StackOpcode.PM_LIST_SHIFT: {
            const list = this.referenceVariable(node.list);
            this.source += `${list}.value = ${list}.value.slice(Math.max(0, ${this.descendInput(node.index)}));\n`;
            break;
        }

        case StackOpcode.LOOKS_LAYER_BACKWARD:
            if (!this.target.isStage) {
                this.source += `target.goBackwardLayers(${this.descendInput(node.layers)});\n`;
            }
            break;
        case StackOpcode.LOOKS_EFFECT_CLEAR:
            this.source += 'target.clearEffects();\n';
            break;
        case StackOpcode.LOOKS_EFFECT_CHANGE:
            if (Object.prototype.hasOwnProperty.call(this.target.effects, node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value)} + target.effects["${sanitize(node.effect)}"]));\n`;
            }
            break;
        case StackOpcode.LOOKS_SIZE_CHANGE:
            this.source += `target.setSize(target.size + ${this.descendInput(node.size)});\n`;
            break;
        case StackOpcode.LOOKS_LAYER_FORWARD:
            if (!this.target.isStage) {
                this.source += `target.goForwardLayers(${this.descendInput(node.layers)});\n`;
            }
            break;
        case StackOpcode.LOOKS_LAYER_BACK:
            if (!this.target.isStage) {
                this.source += 'target.goToBack();\n';
            }
            break;
        case StackOpcode.LOOKS_LAYER_FRONT:
            if (!this.target.isStage) {
                this.source += 'target.goToFront();\n';
            }
            break;
        case StackOpcode.LOOKS_HIDE:
            this.source += 'target.setVisible(false);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case StackOpcode.LOOKS_BACKDROP_NEXT:
            this.source += 'runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume + 1, true);\n';
            break;
        case StackOpcode.LOOKS_COSTUME_NEXT:
            this.source += 'target.setCostume(target.currentCostume + 1);\n';
            break;
        case StackOpcode.LOOKS_EFFECT_SET:
            if (Object.prototype.hasOwnProperty.call(this.target.effects, node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value)}));\n`;
            }
            break;
        case StackOpcode.LOOKS_SIZE_SET:
            this.source += `target.setSize(${this.descendInput(node.size)});\n`;
            break;
        case StackOpcode.LOOKS_SHOW:
            this.source += 'target.setVisible(true);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case StackOpcode.LOOKS_BACKDROP_SET:
            this.source += `runtime.ext_scratch3_looks._setBackdrop(stage, ${this.descendInput(node.backdrop)});\n`;
            break;
        case StackOpcode.LOOKS_COSTUME_SET:
            this.source += `runtime.ext_scratch3_looks._setCostume(target, ${this.descendInput(node.costume)});\n`;
            break;
        case StackOpcode.LOOKS_SAY:
            this.source += `runtime.ext_scratch3_looks._say(${this.descendInput(node.message)}, target);\n`;
            break;
        case StackOpcode.LOOKS_THINK:
            this.source += `runtime.ext_scratch3_looks._think(${this.descendInput(node.message)}, target);\n`;
            break;

        //pm looks
        case StackOpcode.PM_LOOKS_BACKDROP_PREVIOUS:
            this.source += 'runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume - 1, true);\n';
            break;
        case StackOpcode.PM_LOOKS_CHANGE_STRETCH:
            this.source += `target.setStretch(${this.descendInput(node.x)} + target.stretch[0], ${this.descendInput(node.y)} + target.stretch[1]);\n`;
            break;
        case StackOpcode.PM_LOOKS_COSTUME_PREVIOUS:
            this.source += 'target.setCostume(target.currentCostume - 1);\n';
            break;
        case StackOpcode.PM_LOOKS_HIDE_SPRITE:
            this.source += `runtime.ext_scratch3_looks._setSpriteVisibility(target, ${this.descendInput(node.option)}, false);`
            break;
        case StackOpcode.PM_LOOKS_LAYER_SET:
            if (!this.target.isStage) {
                this.source += `target.goForwardLayers(${this.descendInput(node.layer)} - target.getLayerOrder());\n`;
            }
            break;
        case StackOpcode.PM_LOOKS_LAYER_TARGET:
            if (!this.target.isStage) {
                this.source += `runtime.ext_scratch3_looks._goTargetLayer(target, ${this.descendInput(node.option)}, ${node.infront});\n`;
            }
            break;
        case StackOpcode.PM_LOOKS_SET_BLENDMODE:
            this.source += `runtime.ext_scratch3_looks._setBlendMode("${sanitize(node.mode)}", target);\n`;
            break;
        case StackOpcode.PM_LOOKS_SET_STRETCH:
            this.source += `target.setStretch(${this.descendInput(node.x)}, ${this.descendInput(node.y)});\n`;
            break;
        case StackOpcode.PM_LOOKS_SET_TINT:
            this.source += `runtime.ext_scratch3_looks._setTintColor(${this.descendInput(node.tint)}, target);\n`;
            break;
        case StackOpcode.PM_LOOKS_SHOW_SPRITE:
            this.source += `runtime.ext_scratch3_looks._setSpriteVisibility(target, ${this.descendInput(node.option)}, true);`
            break;
        case StackOpcode.PM_LOOKS_STOP_SPEAKING:
            this.source += `runtime.ext_scratch3_looks._say('', target);\n`;
            break;
        case StackOpcode.PM_LOOKS_VISIBLE_SET:
            this.source += `target.setVisible(${this.descendInput(node.visible)});\n`;
            this.source += `runtime.ext_scratch3_looks._renderBubble(target);\n`;
            break;

        case StackOpcode.MOTION_X_CHANGE:
            this.source += `target.setXY(target.x + ${this.descendInput(node.dx)}, target.y);\n`;
            break;
        case StackOpcode.MOTION_Y_CHANGE:
            this.source += `target.setXY(target.x, target.y + ${this.descendInput(node.dy)});\n`;
            break;
        case StackOpcode.MOTION_IF_ON_EDGE_BOUNCE:
            this.source += `runtime.ext_scratch3_motion._ifOnEdgeBounce(target);\n`;
            break;
        case StackOpcode.MOTION_DIRECTION_SET:
            this.source += `target.setDirection(${this.descendInput(node.direction)});\n`;
            break;
        case StackOpcode.MOTION_ROTATION_STYLE_SET:
            this.source += `target.setRotationStyle("${sanitize(node.style)}");\n`;
            break;
        case StackOpcode.MOTION_X_SET: // fallthrough
        case StackOpcode.MOTION_Y_SET: // fallthrough
        case StackOpcode.MOTION_XY_SET: {
            this.descendedIntoModulo = false;
            const x = 'x' in node ? this.descendInput(node.x) : 'target.x';
            const y = 'y' in node ? this.descendInput(node.y) : 'target.y';
            this.source += `target.setXY(${x}, ${y});\n`;
            if (this.descendedIntoModulo) {
                this.source += `if (target.interpolationData) target.interpolationData = null;\n`;
            }
            break;
        }
        case StackOpcode.MOTION_STEP:
            this.source += `runtime.ext_scratch3_motion._moveSteps(${this.descendInput(node.steps)}, target);\n`;
            break;

        //pm motion
        case StackOpcode.PM_MOTION_MOVESTAGESIDE:
            this.source += `runtime.ext_scratch3_motion._moveToStageSide("${sanitize(node.side)}", target);\n`;
            break;
        case StackOpcode.PM_MOTION_POINTTOWARDS_XY:
            this.source += `runtime.ext_scratch3_motion._pointTowards(target, ${this.descendInput(node.x)}, ${this.descendInput(node.y)});\n`;
            break;
        case StackOpcode.PM_MOTION_ROTATE_AROUND_PIVOT:
            this.source += `runtime.ext_scratch3_motion._turnAroundPivot(${this.descendInput(node.degrees)}, ${this.descendInput(node.x)}, ${this.descendInput(node.y)}, target);\n`;
            break;
        case StackOpcode.PM_MOTION_STEPUPDOWN:
            this.source += `runtime.ext_scratch3_motion._moveSteps(${this.descendInput(node.steps)}, target, ${node.direction === "up" ? -90 : 90});\n`;
            break;
        case StackOpcode.PM_MOTION_XY_CHANGE:
            this.source += `target.setXY(target.x + ${this.descendInput(node.dx)}, target.y + ${this.descendInput(node.dy)});\n`;
            break;

        case StackOpcode.NOP:
            break;

        case StackOpcode.PEN_CLEAR:
            this.source += `${PEN_EXT}.clear();\n`;
            break;
        case StackOpcode.PEN_DOWN:
            this.source += `${PEN_EXT}._penDown(target);\n`;
            break;
        case StackOpcode.PEN_COLOR_PARAM_CHANGE:
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param)}, ${this.descendInput(node.value)}, ${PEN_STATE}, true);\n`;
            break;
        case StackOpcode.PEN_SIZE_CHANGE:
            this.source += `${PEN_EXT}._changePenSizeBy(${this.descendInput(node.size)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_HUE_CHANGE_LEGACY:
            this.source += `${PEN_EXT}._changePenHueBy(${this.descendInput(node.hue)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_SHADE_CHANGE_LEGACY:
            this.source += `${PEN_EXT}._changePenShadeBy(${this.descendInput(node.shade)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_HUE_SET_LEGACY:
            this.source += `${PEN_EXT}._setPenHueToNumber(${this.descendInput(node.hue)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_SHADE_SET_LEGACY:
            this.source += `${PEN_EXT}._setPenShadeToNumber(${this.descendInput(node.shade)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_SET:
            this.source += `${PEN_EXT}._setPenColorToColor(${this.descendInput(node.color)}, target);\n`;
            break;
        case StackOpcode.PEN_COLOR_PARAM_SET:
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param)}, ${this.descendInput(node.value)}, ${PEN_STATE}, false);\n`;
            break;
        case StackOpcode.PEN_SIZE_SET:
            this.source += `${PEN_EXT}._setPenSizeTo(${this.descendInput(node.size)}, target);\n`;
            break;
        case StackOpcode.PEN_STAMP:
            this.source += `${PEN_EXT}._stamp(target);\n`;
            break;
        case StackOpcode.PEN_UP:
            this.source += `${PEN_EXT}._penUp(target);\n`;
            break;

        case StackOpcode.PROCEDURE_CALL: {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            const procedureData = this.ir.procedures[procedureVariant];
            if (procedureData.stack === null) {
                // TODO still need to evaluate arguments
                break;
            }
            const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
            if (yieldForRecursion) {
                // Direct yields.
                this.yieldNotWarp();
            }
            let outputVariable = this.localVariables.next();
            this.source += `let ${outputVariable} = `;
            if (procedureData.yields) {
                this.source += 'yield* ';
                if (!this.script.yields) {
                    throw new Error('Script uses yielding procedure but is not marked as yielding.');
                }
            }
            this.source += `thread.procedures["${sanitize(procedureVariant)}"](`;
            const args = [];
            const tempFn = this.localVariables.next();
            for (let i = 0; i < node.arguments.length; i++) {
                const input = node.arguments[i]
                if (input instanceof IntermediateStack) {
                    //is a stack input
                    let stack = this.descendStackInline(input, {isWarp: procedureData.isWarp, allowReturns: true});
                    args.push(`function*(thread, target, runtime, stage) {${stack}}`);
                } else {
                    // Only wrap in function if it's reevaluated
                    args.push(
                        procedureData.reevaled.has(i)
                        ? `yield* (function*() {const ${tempFn} = function*() {return ${this.descendInput(input)};}; return [yield* ${tempFn}(), ${tempFn}]})()` 
                        : this.descendInput(input)
                    );
                }
            }
            this.source += args.join(',');
            this.source += `);\n`;
            this.source += `if (${outputVariable} !== undefined) { return ${outputVariable}; };\n`;
            break;
        }
        case StackOpcode.PROCEDURE_RETURN:
            this.stopScriptAndReturn(this.descendInput(node.value));
            break;

        case StackOpcode.PM_PROCEDURE_REEVALUATE:
            this.source += `p${node.index} = yield* px${node.index}();\n`;
            break;
        case StackOpcode.PM_PROCEDURE_SET:
            this.source += `p${node.index} = ${this.descendInput(node.value)};\n`;
            break;

        case StackOpcode.SENSING_TIMER_RESET:
            this.source += 'runtime.ioDevices.clock.resetProjectTimer();\n';
            break;

        // pm sensing
        case StackOpcode.PM_SENSING_SET_OF:
            this.source += `runtime.ext_scratch3_sensing._setAttributeOf(${this.descendInput(node.object)}, ${this.descendInput(node.property)}, ${this.descendInput(node.value)});\n`;
            break;
        case StackOpcode.PM_SENSING_SET_OF_BACKDROP:
            this.source += `runtime.ext_scratch3_looks._setBackdrop(stage, ${this.descendInput(node.value)});\n`;
            break;
        case StackOpcode.PM_SENSING_SET_OF_COSTUME: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) runtime.ext_scratch3_looks._setCostume(${targetRef}, ${this.descendInput(node.value)});\n`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_DIRECTION: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) ${targetRef}.setDirection(${this.descendInput(node.value)});\n`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_POS_X: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) ${targetRef}.setXY(${this.descendInput(node.value)}, ${targetRef}.y);\n`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_POS_Y: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) ${targetRef}.setXY(${targetRef}.x, ${this.descendInput(node.value)});\n`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_SIZE: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) ${targetRef}.setSize(${this.descendInput(node.value)});\n`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_VAR: {
            const targetRef = this.descendTargetReference(node.object);
            const varRef = this.evaluateOnce(`${targetRef} && ${targetRef}.lookupVariableByNameAndType("${sanitize(node.property)}", "", true)`);
            this.source += `if (${varRef}) ${varRef}.value = ${this.descendInput(node.value)};\n;`;
            break;
        }
        case StackOpcode.PM_SENSING_SET_OF_VOLUME: {
            const targetRef = this.descendTargetReference(node.object);
            this.source += `if (${targetRef}) runtime.ext_scratch3_sound._updateVolume(${this.descendInput(node.value)}, ${targetRef});\n`;
            break;
        }

        case StackOpcode.DEBUGGER:
            this.source += 'debugger;\n';
            break;

        case StackOpcode.VAR_HIDE:
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case StackOpcode.VAR_SET: {
            const varReference = this.referenceVariable(node.variable);
            this.source += `${varReference}.value = ${this.descendInput(node.value)};\n`;
            if (node.variable.isCloud) {
                this.source += `runtime.ioDevices.cloud.requestUpdateVariable("${sanitize(node.variable.name)}", ${varReference}.value);\n`;
            }
            break;
        }
        case StackOpcode.VAR_SHOW:
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;
        
        //pm variables
        case StackOpcode.PM_VAR_SET_VISIBLE: {
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: ${this.descendInput(node.visible)} }, runtime);\n`;
            break;
        }

        case StackOpcode.VISUAL_REPORT: {
            const value = this.localVariables.next();
            this.source += `const ${value} = ${this.descendInput(node.input)};\n`;
            // blocks like legacy no-ops can return a literal `undefined`
            this.source += `if (${value} !== undefined) runtime.visualReport(target, "${sanitize(this.script.bottomBlockId)}", ${value});\n`;
            break;
        }

        default:
            for (let extensionId in JSGenerator.compilerExtensions) {
                let extension = JSGenerator.compilerExtensions[extensionId]
                if (extension.command) {
                    let returns = extension.command.call(this, block);
                    if (returns) return;
                }
            }
            log.warn(`JS: Unknown stacked block: ${block.opcode}`, node);
            throw new Error(`JS: Unknown stacked block: ${block.opcode}`);
        }
    }

    /**
     * Compiles a reference to a target.
     * @param {IntermediateInput} input The target reference. Must be a string.
     * @returns {string} The compiled target reference
     */
    descendTargetReference (input) {
        if (!input.isAlwaysType(InputType.STRING)) {
            throw new Error(`JS: Object references must be strings!`);
        }
        if (input.isConstant('_stage_')) return 'stage';
        return this.evaluateOnce(`runtime.getSpriteTargetByName(${this.descendInput(input)})`);
    }

    /**
     * Compile a Record of input objects into a safe JS string.
     * @param {Record<string, IntermediateInput>} inputs
     * @returns {string}
     */
    descendInputRecord (inputs) {
        let result = '{';
        for (const name of Object.keys(inputs)) {
            const node = inputs[name];
            result += `"${sanitize(name)}":${this.descendInput(node)},`;
        }
        result += '}';
        return result;
    }

    /**
     * @param {IntermediateStack} stack
     * @param {Object} properties
     */
    descendStack (stack, properties = {}, ...args) {
        // Entering a stack -- all bets are off.
        // TODO: allow if/else to inherit values
        var frame
        if (properties instanceof Frame || properties instanceof oldCompilerCompatibility.JSGeneratorStub.unstable_exports.Frame) {
            frame = properties;
            properties = args[0] ?? {};
        }
        this.pushFrame(frame ?? new Frame(properties.inLoop || this.inLoop))

        const oldProperties = Object.fromEntries(Object.keys(properties).map(key => [key, this[key]]));
        Object.entries(properties).forEach(([key, value]) => this[key] = value);
        const oldIsLastBlock = this.isLastBlock;

        for (let extensionId in JSGenerator.compilerExtensions) {
            let extension = JSGenerator.compilerExtensions[extensionId]
            if (extension.stackStart) {
                extension.stackStart.call(this, stack, properties, frame);
            }
        }

        for (let i = 0; i < stack.blocks.length; i++) {
            this.isLastBlock = i === stack.blocks.length - 1;
            if (frame) frame.isLastBlock = this.isLastBlock;
            this.descendStackedBlock(stack.blocks[i]);
        }

        for (let extensionId in JSGenerator.compilerExtensions) {
            let extension = JSGenerator.compilerExtensions[extensionId]
            if (extension.stackEnd) {
                extension.stackEnd.call(this, stack, properties, frame);
            }
        }

        this.isLastBlock = oldIsLastBlock;
        Object.entries(oldProperties).forEach(([key, value]) => this[key] = value);

        // Leaving a stack -- any assumptions made in the current stack do not apply outside of it
        // TODO: in if/else this might create an extra unused object
        this.popFrame();
    }

    /**
     * @returns {string}
     */
    descendStackInline(...args) {
        const oldSource = this.source;
        this.source = "";
        this.descendStack(...args);
        const result = this.source;
        this.source = oldSource;
        return result;
    }

    /**
     * @param {*} node
     * @returns {string}
     */
    descendAddonCall (node) {
        const inputs = this.descendInputRecord(node.arguments);
        const blockFunction = `runtime.getAddonBlock("${sanitize(node.code)}").callback`;
        const blockId = `"${sanitize(node.blockId)}"`;
        return `yield* executeInCompatibilityLayer(${inputs}, ${blockFunction}, ${this.isWarp}, false, ${blockId})`;
    }

    /**
     * @param {*} variable
     * @returns {string}
     */
    referenceVariable (variable) {
        if (variable.scope === 'target') {
            return this.evaluateOnce(`target.variables["${sanitize(variable.id)}"]`);
        }
        return this.evaluateOnce(`stage.variables["${sanitize(variable.id)}"]`);
    }

    /**
     * @param {string} source
     * @returns {string}
     */
    evaluateOnce (source) {
        if (Object.prototype.hasOwnProperty.call(this._setupVariables, source)) {
            return this._setupVariables[source];
        }
        const variable = this._setupVariablesPool.next();
        this._setupVariables[source] = variable;
        return variable;
    }

    retire () {
        // After running retire() (sets thread status and cleans up some unused data), we need to return to the event loop.
        // When in a procedure, return will only send us back to the previous procedure, so instead we yield back to the sequencer.
        // Outside of a procedure, return will correctly bring us back to the sequencer.
        // also needed for stuff that allows returns cause thats scoped inside another function
        if (this.isProcedure || this.allowReturns) {
            this.source += 'retire(); yield;\n';
        } else {
            this.source += 'retire(); return;\n';
        }
    }

    yieldLoop () {
        if (this.warpTimer) {
            this.yieldStuckOrNotWarp();
        } else {
            this.yieldNotWarp();
        }
    }
    yieldLoopInline() {
        const oldSource = this.source;
        this.source = "";
        this.yieldLoop();
        const result = this.source;
        this.source = oldSource;
        return result;
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled.
     */
    yieldNotWarp () {
        if (!this.isWarp) {
            this.source += 'yield;\n';
            this.yielded();
        }
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled or if the script seems to be stuck.
     */
    yieldStuckOrNotWarp () {
        if (this.isWarp) {
            this.source += 'if (isStuck()) yield;\n';
        } else {
            this.source += 'yield;\n';
        }
        this.yielded();
    }

    yielded () {
        if (!this.script.yields) {
            throw new Error('Script yielded but is not marked as yielding.');
        }
        // Control may have been yielded to another script -- all bets are off.
    }

    /**
     * Write JS to request a redraw.
     */
    requestRedraw () {
        this.source += 'runtime.requestRedraw();\n';
    }

    /**
     * Generate a call into the compatibility layer.
     * @param {*} node The node of the block to generate from.
     * @param {boolean} setFlags Whether flags should be set describing how this function was processed.
     * @param {string|null} [frameName] Name of the stack frame variable, if any
     * @returns {string} The JS of the call.
     */
    generateCompatibilityLayerCall (node, setFlags, frameName = null) {
        const opcode = node.opcode;

        let result = 'yield* executeInCompatibilityLayer({';

        for (const inputName of Object.keys(node.inputs)) {
            const input = node.inputs[inputName];
            const compiledInput = this.descendInput(input);
            result += `"${sanitize(inputName)}":${compiledInput},`;
        }
        for (const fieldName of Object.keys(node.fields)) {
            const field = node.fields[fieldName];
            result += `"${sanitize(fieldName)}":"${sanitize(field)}",`;
        }
        const opcodeFunction = this.evaluateOnce(`runtime.getOpcodeFunction("${sanitize(opcode)}")`);
        result += `}, ${opcodeFunction}, ${this.isWarp}, ${setFlags}, "${sanitize(node.id)}", ${frameName})`;

        this.yielded();

        return result;
    }

    getScriptFactoryName () {
        return factoryNameVariablePool.next();
    }

    getScriptName (yields) {
        let name = yields ? generatorNameVariablePool.next() : functionNameVariablePool.next();
        if (this.isProcedure) {
            const simplifiedProcedureCode = this.script.procedureCode
                .replace(/%[\w]/g, '') // remove arguments
                .replace(/[^a-zA-Z0-9]/g, '_') // remove unsafe
                .substring(0, 20); // keep length reasonable
            name += `_${simplifiedProcedureCode}`;
        }
        return name;
    }

    stopScript () {
        if (this.isProcedure) {
            if (this.script.globalProcedureData) {
                this.source += `resetGlobalProcState(target.variables);\n`;
            }

            this.source += 'return;\n';
        } else {
            this.retire();
        }
    }

    /**
     * @param {string} valueJS JS code of value to return.
     */
    stopScriptAndReturn (valueJS) {
        if (!this.isProcedure && !this.allowReturns && !this.script.stackClicked) {
            this.source += `retire(); return ${valueJS};\n`;
        } else if (this.isProcedure || this.script.stackClicked || this.allowReturns) {
            if (this.script.globalProcedureData) {
                this.source += `resetGlobalProcState(target.variables);\n`;
            }

            this.source += `return ${valueJS};\n`;
        } else {
            this.retire();
        }
    }

    /**
     * Generate the JS to pass into eval() based on the current state of the compiler.
     * @returns {string} JS to pass into eval()
     */
    createScriptFactory () {
        let script = '';

        // Setup the factory
        script += `(function ${this.getScriptFactoryName()}(thread) { `;
        script += 'const target = thread.target; ';
        script += 'const runtime = target.runtime; ';
        script += 'const stage = runtime.getTargetForStage();\n';

        if (this.isProcedure && this.script.globalProcedureData) {
            const globalTarget = this.script.globalProcedureData.target;
            script += `setupGlobalProcState(target, "${globalTarget.id}");\n`;
        }

        for (const varValue of Object.keys(this._setupVariables)) {
            const varName = this._setupVariables[varValue];
            script += `const ${varName} = ${varValue};\n`;
        }

        // Generated script
        script += 'return ';
        if (this.script.yields) {
            script += `function* `;
        } else {
            script += `function `;
        }
        script += this.getScriptName(this.script.yields);
        script += ' (';
        if (this.script.arguments.length) {
            const args = [];
            for (let i = 0; i < this.script.arguments.length; i++) {
                args.push(
                    this.script.argumentIds[i].startsWith("SUBSTACK") 
                    || !this.script.reevaled.has(i) ? `p${i}` : `[p${i}, px${i}]`
                );
            }
            script += args.join(',');
        }
        script += ') {\n';

        if (!this.isProcedure) script += `try {\n`;

        // for (let i = 0; i < this.script.arguments.length; i++) {
        //     if (this.script.argumentIds[i].startsWith("SUBSTACK") || !this.script.reevaled.has(i)) continue;
        //     script += `let p${i} = yield* px${i}();\n`;
        // }

        let allowBubble = this.script.stackClicked && !this.isProcedure;
        if (allowBubble) {
            script += `let returns = ${this.script.yields ? `yield* (function*()` : `(function()`} {\n`;
        }

        script += this.source;

        if (allowBubble) {
            script += `})();\n`;
            script += `if (returns !== undefined) runtime.visualReport(target, "${sanitize(this.script.bottomBlockId)}", returns);\n`;
            script += `retire();\n`;
        }
        
        if (!this.isProcedure) {
            script += `} catch (e) {\n`;
            script += `console.warn(this.toString(), e);\n`;
            script += `runtime.visualReport(target, "${sanitize(this.script.bottomBlockId)}", String(e), true);\n`;
            script += `retire();\n`;
            script += `};\n`;
        }

        script += '}; })';

        return script;
    }

    /**
     * Compile this script.
     * @returns {Function} The factory function for the script.
     */
    compile () {
        if (this.script.stack) {
            let extensionIds = Object.keys(JSGenerator.compilerExtensions);

            for (let extensionId of extensionIds) {
                let extension = JSGenerator.compilerExtensions[extensionId];
                if (extension.scriptStart) {
                    extension.scriptStart.call(this);
                }
            }

            this.descendStack(this.script.stack);
            
            extensionIds.reverse();
            for (let extensionId of extensionIds) {
                let extension = JSGenerator.compilerExtensions[extensionId];
                if (extension.scriptEnd) {
                    extension.scriptEnd.call(this);
                }
            }
        }
        this.stopScript();

        const factory = this.createScriptFactory();
        const fn = jsexecute.scopedEval(factory);

        if (this.debug) {
            log.info(`JS: ${this.target.getName()}: compiled ${this.script.procedureCode || 'script'}`, factory);
        }

        if (JSGenerator.testingApparatus) {
            JSGenerator.testingApparatus.report(this, factory);
        }

        return fn;
    }
}

// For extensions.
JSGenerator.unstable_exports = {
    factoryNameVariablePool,
    functionNameVariablePool,
    generatorNameVariablePool,
    VariablePool,
    PEN_EXT,
    PEN_STATE,
    Frame,
    sanitize
};

// Test hook used by automated snapshot testing.
JSGenerator.testingApparatus = null;

module.exports = JSGenerator;
