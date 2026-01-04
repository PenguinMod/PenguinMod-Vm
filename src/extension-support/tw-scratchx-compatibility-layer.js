// ScratchX API Documentation: https://github.com/LLK/scratchx/wiki/

const ArgumentType = require('./argument-type');
const BlockType = require('./block-type');

const {
    argumentIndexToId,
    generateExtensionId
} = require('./tw-scratchx-utilities');

/**
 * @typedef ScratchXDescriptor
 * @property {unknown[][]} blocks
 * @property {Record<string, unknown[]>} [menus]
 * @property {string} [url]
 * @property {string} [displayName]
 */

/**
 * @typedef ScratchXStatus
 * @property {0|1|2} status 0 is red/error, 1 is yellow/not ready, 2 is green/ready
 * @property {string} msg
 */

const parseScratchXBlockType = type => {
    if (type === '' || type === ' ' || type === 'w') {
        return {
            type: BlockType.COMMAND,
            async: type === 'w'
        };
    }
    if (type === 'r' || type === 'R') {
        return {
            type: BlockType.REPORTER,
            async: type === 'R'
        };
    }
    if (type === 'b') {
        return {
            type: BlockType.BOOLEAN,
            // ScratchX docs don't seem to mention boolean reporters that wait
            async: false
        };
    }
    if (type === 'h') {
        return {
            type: BlockType.HAT,
            async: false
        };
    }
    throw new Error(`Unknown ScratchX block type: ${type}`);
};

const isScratchCompatibleValue = v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/**
 * @param {string} argument ScratchX argument with leading % removed.
 * @param {unknown} defaultValue Default value, if any
 * @returns {ExtensionArgumentMetadata} The generated argument
 */
const parseScratchXArgument = (argument, defaultValue) => {
    const result = {};
    const hasDefaultValue = isScratchCompatibleValue(defaultValue);
    if (hasDefaultValue) {
        result.defaultValue = defaultValue;
    }
    // TODO: ScratchX docs don't mention support for boolean arguments?
    if (argument === 's') {
        result.type = ArgumentType.STRING;
        if (!hasDefaultValue) {
            result.defaultValue = '';
        }
    } else if (argument === 'n') {
        result.type = ArgumentType.NUMBER;
        if (!hasDefaultValue) {
            result.defaultValue = 0;
        }
    } else if (argument[0] === 'm') {
        result.type = ArgumentType.STRING;
        const split = argument.split(/\.|:/);
        const menuName = split[1];
        result.menu = menuName;
    } else {
        throw new Error(`Unknown ScratchX argument type: ${argument}`);
    }
    return result;
};

const wrapScratchXFunction = (originalFunction, argumentCount, async) => args => {
    // Convert Scratch 3's argument object to an argument list expected by ScratchX
    const argumentList = [];
    for (let i = 0; i < argumentCount; i++) {
        argumentList.push(args[argumentIndexToId(i)]);
    }
    if (async) {
        return new Promise(resolve => {
            originalFunction(...argumentList, resolve);
        });
    }
    return originalFunction(...argumentList);
};

/**
 * @param {string} name The extensions original name
 * @param {ScratchXDescriptor} descriptor The parsed scratchx extension info
 * @param {Record<string, Function>} functions The functions referenced by that info
 * @returns {!ExtensionMetadata} The converted result
 */
const convert = (name, descriptor, functions) => {
    const extensionId = generateExtensionId(name);
    const info = {
        id: extensionId,
        name: descriptor.displayName || name,
        blocks: [],
        color1: '#4a4a5e',
        color2: '#31323f',
        color3: '#191a21'
    };
    const scratch3Extension = {
        getInfo: () => info,
        _getStatus: functions._getStatus
    };

    if (descriptor.url) {
        info.docsURI = descriptor.url;
    }

    for (const blockDescriptor of descriptor.blocks) {
        if (blockDescriptor.length === 1) {
            // Separator
            info.blocks.push('---');
            continue;
        }
        const scratchXBlockType = blockDescriptor[0];
        const blockText = blockDescriptor[1];
        const functionName = blockDescriptor[2];
        const defaultArgumentValues = blockDescriptor.slice(3);

        let scratchText = '';
        const argumentInfo = [];
        const blockTextParts = blockText.split(/%([\w.:]+)/g);
        for (let i = 0; i < blockTextParts.length; i++) {
            const part = blockTextParts[i];
            const isArgument = i % 2 === 1;
            if (isArgument) {
                parseScratchXArgument(part);
                const argumentIndex = Math.floor(i / 2).toString();
                const argumentDefaultValue = defaultArgumentValues[argumentIndex];
                const argumentId = argumentIndexToId(argumentIndex);
                argumentInfo[argumentId] = parseScratchXArgument(part, argumentDefaultValue);
                scratchText += `[${argumentId}]`;
            } else {
                scratchText += part;
            }
        }

        const scratch3BlockType = parseScratchXBlockType(scratchXBlockType);
        const blockInfo = {
            opcode: functionName,
            blockType: scratch3BlockType.type,
            text: scratchText,
            arguments: argumentInfo
        };
        info.blocks.push(blockInfo);

        const originalFunction = functions[functionName];
        const argumentCount = argumentInfo.length;
        scratch3Extension[functionName] = wrapScratchXFunction(
            originalFunction,
            argumentCount,
            scratch3BlockType.async
        );
    }

    const menus = descriptor.menus;
    if (menus) {
        const scratch3Menus = {};
        for (const menuName of Object.keys(menus) || {}) {
            const menuItems = menus[menuName];
            const menuInfo = {
                items: menuItems
            };
            scratch3Menus[menuName] = menuInfo;
        }
        info.menus = scratch3Menus;
    }

    return scratch3Extension;
};

const extensionNameToExtension = new Map();

/**
 * @param {*} Scratch Scratch 3.0 extension API object
 * @returns {*} ScratchX-compatible API object
 */
const createScratchX = Scratch => {
    const register = (name, descriptor, functions) => {
        const scratch3Extension = convert(name, descriptor, functions);
        extensionNameToExtension.set(name, scratch3Extension);
        Scratch.extensions.register(scratch3Extension);
    };

    /**
     * @param {string} extensionName
     * @returns {ScratchXStatus}
     */
    const getStatus = extensionName => {
        const extension = extensionNameToExtension.get(extensionName);
        if (extension) {
            return extension._getStatus();
        }
        return {
            status: 0,
            msg: 'does not exist'
        };
    };

    return {
        register,
        getStatus
    };
};

module.exports = createScratchX;
