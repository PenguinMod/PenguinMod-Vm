const Cast = require('../util/cast.js');
const MathUtil = require('../util/math-util.js');
const { validateRegex } = require('../util/json-block-utilities');

class Scratch3OperatorsBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            operator_add: this.add,
            operator_subtract: this.subtract,
            operator_multiply: this.multiply,
            operator_divide: this.divide,
            operator_lt: this.lt,
            operator_equals: this.equals,
            operator_notequal: this.notequals,
            operator_gt: this.gt,
            operator_ltorequal: this.ltorequal,
            operator_gtorequal: this.gtorequal,
            operator_and: this.and,
            operator_nand: this.nand,
            operator_or: this.or,
            operator_not: this.not,
            operator_random: this.random,
            operator_join: this.join,
            operator_join3: this.join3,
            operator_letter_of: this.letterOf,
            operator_length: this.length,
            operator_contains: this.contains,
            operator_mod: this.mod,
            operator_round: this.round,
            operator_mathop: this.mathop,
            operator_advlog: this.advlog,
            operator_regexmatch: this.regexmatch,
            operator_replaceAll: this.replaceAll,
            operator_replaceFirst: this.replaceFirst,
            operator_getLettersFromIndexToIndexInText: this.getLettersFromIndexToIndexInText,
            operator_readLineInMultilineText: this.readLineInMultilineText,
            operator_newLine: this.newLine,
            operator_tabCharacter: this.tabCharacter,
            operator_stringify: this.stringify,
            operator_boolify: this.boolify,
            operator_lerpFunc: this.lerpFunc,
            operator_advMath: this.advMath,
            operator_constrainnumber: this.constrainnumber,
            operator_trueBoolean: this.true,
            operator_falseBoolean: this.false,
            operator_randomBoolean: this.randomBoolean,
            operator_indexOfTextInText: this.indexOfTextInText,
            operator_lastIndexOfTextInText: this.lastIndexOfTextInText,
            operator_toUpperLowerCase: this.toCase,
            operator_character_to_code: this.charToCode,
            operator_code_to_character: this.codeToChar,
            operator_textStartsOrEndsWith: this.textStartsOrEndsWith,
            operator_countAppearTimes: this.countAppearTimes,
            operator_textIncludesLetterFrom: this.textIncludesLetterFrom,
            operator_javascript_output: this.javascriptOutput,
            operator_javascript_boolean: this.javascriptBoolean
        };
    }

    // eslint-disable-next-line no-unused-vars
    javascriptOutput (args, util, realBlockInfo) {
        const js = Cast.toString(args.JS);
        return eval(js);
    }
    // eslint-disable-next-line no-unused-vars
    javascriptBoolean (args, util, realBlockInfo) {
        const js = Cast.toString(args.JS);
        return eval(js) === true;
    }

    charToCode (args) {
        const char = Cast.toString(args.ONE);
        if (!char) return NaN;
        return char.charCodeAt(0);
    }
    codeToChar (args) {
        const code = Cast.toNumber(args.ONE);
        return String.fromCharCode(code);
    }

    toCase (args) {
        const text = Cast.toString(args.TEXT);
        switch (args.OPTION) {
        case 'upper':
            return text.toUpperCase();
        case 'lower':
            return text.toLowerCase();
        }
    }

    indexOfTextInText (args) {
        const lookfor = Cast.toString(args.TEXT1);
        const searchin = Cast.toString(args.TEXT2);
        let index = 0;
        if (searchin.includes(lookfor)) {
            index = searchin.indexOf(lookfor) + 1;
        }
        return index;
    }

    lastIndexOfTextInText (args) {
        const lookfor = Cast.toString(args.TEXT1);
        const searchin = Cast.toString(args.TEXT2);
        let index = 0;
        if (searchin.includes(lookfor)) {
            index = searchin.lastIndexOf(lookfor) + 1;
        }
        return index;
    }

    textStartsOrEndsWith (args) {
        const text = Cast.toString(args.TEXT1);
        const startsOrEnds = Cast.toString(args.OPTION);
        const withh = Cast.toString(args.TEXT2);
        return (startsOrEnds === "starts") ? (text.startsWith(withh)) : (text.endsWith(withh));
    }

    countAppearTimes (args) {
        const text = Cast.toString(args.TEXT2);
        const otherText = Cast.toString(args.TEXT1);

        const aray = text.split(otherText);
        if (aray.length <= 1) {
            return 0;
        }

        return aray.length - 1;
    }

    textIncludesLetterFrom (args) {
        const text = Cast.toString(args.TEXT1);
        const from = Cast.toString(args.TEXT2);

        let includes = false;

        const aray = from.split("");
        aray.forEach(i => {
            if (text.includes(i)) includes = true;
        })

        return includes;
    }

    true () { return true; }
    false () { return false; }
    randomBoolean () { return Boolean(Math.round(Math.random())); }

    constrainnumber (args) {
        return Math.min(Math.max(args.min, args.inp), args.max);
    }

    lerpFunc (args) {
        const one = isNaN(Cast.toNumber(args.ONE)) ? 0 : Cast.toNumber(args.ONE);
        const two = isNaN(Cast.toNumber(args.TWO)) ? 0 : Cast.toNumber(args.TWO);
        const amount = isNaN(Cast.toNumber(args.AMOUNT)) ? 0 : Cast.toNumber(args.AMOUNT);
        let lerped = one;
        lerped += ((two - one) / (amount / (amount * amount)));
        return lerped;
    }
    advMath (args) {
        const one = isNaN(Cast.toNumber(args.ONE)) ? 0 : Cast.toNumber(args.ONE);
        const two = isNaN(Cast.toNumber(args.TWO)) ? 0 : Cast.toNumber(args.TWO);
        const operator = Cast.toString(args.OPTION);
        switch (operator) {
        case "^": return one ** two;
        case "root": return one ** 1 / two;
        case "log": return Math.log(two) / Math.log(one);
        default: return 0;
        }
    }

    stringify (args) { return Cast.toString(args.ONE); }

    boolify (args) { return Cast.toBoolean(args.ONE); }

    newLine () { return "\n"; }

    tabCharacter () { return "\t"; }

    readLineInMultilineText (args) {
        const line = (Cast.toNumber(args.LINE) ? Cast.toNumber(args.LINE) : 1) - 1;
        const text = Cast.toString(args.TEXT);
        const readline = text.split("\n")[line] || "";
        return readline;
    }

    getLettersFromIndexToIndexInText (args) {
        const index1 = (Cast.toNumber(args.INDEX1) ? Cast.toNumber(args.INDEX1) : 1) - 1;
        const index2 = (Cast.toNumber(args.INDEX2) ? Cast.toNumber(args.INDEX2) : 1) - 1;
        const string = Cast.toString(args.TEXT);
        const substring = string.substring(index1, index2);
        return substring;
    }

    replaceAll (args) {
        return Cast.toString(args.text).replaceAll(args.term, args.res);
    }
    replaceFirst (args) {
        return Cast.toString(args.text).replace(args.term, args.res);
    }

    regexmatch (args) {
        if (!validateRegex(args.reg, args.regrule)) return "[]";
        const regex = new RegExp(args.reg, args.regrule);
        const matches = args.text.match(regex);
        return JSON.stringify(matches ? matches : []);
    }

    add (args) {
        return Cast.toNumber(args.NUM1) + Cast.toNumber(args.NUM2);
    }

    subtract (args) {
        return Cast.toNumber(args.NUM1) - Cast.toNumber(args.NUM2);
    }

    multiply (args) {
        return Cast.toNumber(args.NUM1) * Cast.toNumber(args.NUM2);
    }

    divide (args) {
        return Cast.toNumber(args.NUM1) / Cast.toNumber(args.NUM2);
    }

    lt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) < 0;
    }

    equals (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) === 0;
    }

    notequals (args) {
        return !this.equals(args);
    }

    gt (args) {
        return Cast.compare(args.OPERAND1, args.OPERAND2) > 0;
    }

    gtorequal (args) {
        return !this.lt(args);
    }

    ltorequal (args) {
        return !this.gt(args);
    }

    and (args) {
        return Cast.toBoolean(args.OPERAND1) && Cast.toBoolean(args.OPERAND2);
    }
    
    nand (args) {
        return Cast.toBoolean(!(args.OPERAND1) && Cast.toBoolean(args.OPERAND2));
    }

    or (args) {
        return Cast.toBoolean(args.OPERAND1) || Cast.toBoolean(args.OPERAND2);
    }

    not (args) {
        return !Cast.toBoolean(args.OPERAND);
    }

    random (args) {
        return this._random(args.FROM, args.TO);
    }
    _random (from, to) { // used by compiler
        const nFrom = Cast.toNumber(from);
        const nTo = Cast.toNumber(to);
        const low = nFrom <= nTo ? nFrom : nTo;
        const high = nFrom <= nTo ? nTo : nFrom;
        if (low === high) return low;
        // If both arguments are ints, truncate the result to an int.
        if (Cast.isInt(from) && Cast.isInt(to)) {
            return low + Math.floor(Math.random() * ((high + 1) - low));
        }
        return (Math.random() * (high - low)) + low;
    }

    join (args) {
        return Cast.toString(args.STRING1) + Cast.toString(args.STRING2);
    }

    join3 (args) {
        return Cast.toString(args.STRING1) + Cast.toString(args.STRING2) + Cast.toString(args.STRING3);
    }

    letterOf (args) {
        const index = Cast.toNumber(args.LETTER) - 1;
        const str = Cast.toString(args.STRING);
        // Out of bounds?
        if (index < 0 || index >= str.length) {
            return '';
        }
        return str.charAt(index);
    }

    length (args) {
        return Cast.toString(args.STRING).length;
    }

    contains (args) {
        const format = function (string) {
            return Cast.toString(string).toLowerCase();
        };
        return format(args.STRING1).includes(format(args.STRING2));
    }

    mod (args) {
        const n = Cast.toNumber(args.NUM1);
        const modulus = Cast.toNumber(args.NUM2);
        let result = n % modulus;
        // Scratch mod uses floored division instead of truncated division.
        if (result / modulus < 0) result += modulus;
        return result;
    }

    round (args) {
        return Math.round(Cast.toNumber(args.NUM));
    }

    mathop (args) {
        const operator = Cast.toString(args.OPERATOR).toLowerCase();
        const n = Cast.toNumber(args.NUM);
        switch (operator) {
        case 'abs': return Math.abs(n);
        case 'floor': return Math.floor(n);
        case 'ceiling': return Math.ceil(n);
        case 'sqrt': return Math.sqrt(n);
        case 'sin': return Math.round(Math.sin((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'cos': return Math.round(Math.cos((Math.PI * n) / 180) * 1e10) / 1e10;
        case 'tan': return MathUtil.tan(n);
        case 'asin': return (Math.asin(n) * 180) / Math.PI;
        case 'acos': return (Math.acos(n) * 180) / Math.PI;
        case 'atan': return (Math.atan(n) * 180) / Math.PI;
        case 'ln': return Math.log(n);
        case 'log': return Math.log(n) / Math.LN10;
        case 'e ^': return Math.exp(n);
        case '10 ^': return Math.pow(10, n);
        }
        return 0;
    }
    
    advlog (args) {
        return (Math.log(Cast.toNumber(args.NUM2)) / Math.log(Cast.toNumber(args.NUM1)));
    }
}

module.exports = Scratch3OperatorsBlocks;
