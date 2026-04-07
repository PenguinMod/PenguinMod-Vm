/* eslint-disable no-invalid-this */
/**
 * @fileoverview
 * An SB3 serializer and deserializer. Parses provided
 * JSON and then generates all needed scratch-vm runtime structures.
 */

const Blocks = require('../engine/blocks');
const Sprite = require('../sprites/sprite');
const Variable = require('../engine/variable');
const Comment = require('../engine/comment');
const MonitorRecord = require('../engine/monitor-record');
const StageLayering = require('../engine/stage-layering');
const log = require('../util/log');
const uid = require('../util/uid');
const MathUtil = require('../util/math-util');
const StringUtil = require('../util/string-util');
const VariableUtil = require('../util/variable-util');
const Clone = require('../util/clone');
const compress = require('./tw-compress-sb3');
const OldExtensions = require('./extension patcher');

const {loadCostume} = require('../import/load-costume.js');
const {loadSound} = require('../import/load-sound.js');
const {deserializeCostume, deserializeSound} = require('./deserialize-assets.js');
const replacersPatch = require('./replacers patch.json');

const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * @typedef {object} ImportedProject
 * @property {Array.<Target>} targets - the imported Scratch 3.0 target objects.
 * @property {ImportedExtensionsInfo} extensionsInfo - the ID of each extension actually used by this project.
 */

/**
 * @typedef {object} ImportedExtensionsInfo
 * @property {Set.<string>} extensionIDs - the ID of each extension actually in use by blocks in this project.
 * @property {Map.<string, string>} extensionURLs - map of ID => URL from project metadata. May not match extensionIDs.
 */

// Constants used during serialization and deserialization
const INPUT_SAME_BLOCK_SHADOW = 1; // unobscured shadow
const INPUT_BLOCK_NO_SHADOW = 2; // no shadow
const INPUT_DIFF_BLOCK_SHADOW = 3; // obscured shadow
// There shouldn't be a case where block is null, but shadow is present...

// Constants used during deserialization of an SB3 file
const CORE_EXTENSIONS = [
    'argument',
    'colour',
    'control',
    'data',
    'event',
    'looks',
    'math',
    'motion',
    'operator',
    'procedures',
    'sensing',
    'sound'
];

// Constants referring to 'primitive' blocks that are usually shadows,
// or in the case of variables and lists, appear quite often in projects
// math_number
const MATH_NUM_PRIMITIVE = 4; // there's no reason these constants can't collide
// math_positive_number
const POSITIVE_NUM_PRIMITIVE = 5; // with the above, but removing duplication for clarity
// math_whole_number
const WHOLE_NUM_PRIMITIVE = 6;
// math_integer
const INTEGER_NUM_PRIMITIVE = 7;
// math_angle
const ANGLE_NUM_PRIMITIVE = 8;
// colour_picker
const COLOR_PICKER_PRIMITIVE = 9;
// text
const TEXT_PRIMITIVE = 10;
// event_broadcast_menu
const BROADCAST_PRIMITIVE = 11;
// data_variable
const VAR_PRIMITIVE = 12;
// data_listcontents
const LIST_PRIMITIVE = 13;
// any single-fielded item not covered above
const LONE_FIELD = 14;

// Map block opcodes to the above primitives and the name of the field we can use
// to find the value of the field
const primitiveOpcodeInfoMap = {
    math_number: [MATH_NUM_PRIMITIVE, 'NUM'],
    math_positive_number: [POSITIVE_NUM_PRIMITIVE, 'NUM'],
    math_whole_number: [WHOLE_NUM_PRIMITIVE, 'NUM'],
    math_integer: [INTEGER_NUM_PRIMITIVE, 'NUM'],
    math_angle: [ANGLE_NUM_PRIMITIVE, 'NUM'],
    colour_picker: [COLOR_PICKER_PRIMITIVE, 'COLOUR'],
    text: [TEXT_PRIMITIVE, 'TEXT'],
    event_broadcast_menu: [BROADCAST_PRIMITIVE, 'BROADCAST_OPTION'],
    data_variable: [VAR_PRIMITIVE, 'VARIABLE'],
    data_listcontents: [LIST_PRIMITIVE, 'LIST']
};

// the list of blocks and there replacements for jwUnite
const uniteReplacments = {
    'jwUnite_always': 'event_always',
    'jwUnite_whenanything': 'event_whenanything',
    'jwUnite_getspritewithattrib': 'sensing_getspritewithattrib',
    'jwUnite_backToGreenFlag': 'control_backToGreenFlag',
    'jwUnite_trueBoolean': 'operator_trueBoolean',
    'jwUnite_falseBoolean': 'operator_falseBoolean',
    'jwUnite_randomBoolean': 'operator_randomBoolean',
    'jwUnite_mobile': 'sensing_mobile',
    'jwUnite_thing_is_text': 'sensing_thing_is_text',
    'jwUnite_thing_is_number': 'sensing_thing_is_number',
    'jwUnite_if_return_else_return': 'control_if_return_else_return',
    'jwUnite_indexOfTextInText': 'operator_indexOfTextInText',
    'jwUnite_regextest': 'sensing_regextest',
    'jwUnite_regexmatch': 'operator_regexmatch',
    'jwUnite_replaceAll': 'operator_replaceAll',
    'jwUnite_getLettersFromIndexToIndexInText': 'operator_getLettersFromIndexToIndexInText',
    'jwUnite_readLineInMultilineText': 'operator_readLineInMultilineText',
    'jwUnite_newLine': 'operator_newLine',
    'jwUnite_stringify': 'operator_stringify',
    'jwUnite_lerpFunc': 'operator_lerpFunc',
    'jwUnite_advMath': 'operator_advMath',
    'jwUnite_constrainnumber': 'operator_constrainnumber'
};

// extensions to be patched by the extension patcher
const ExtensionPatches = {
    "griffpatch": {id: 'griffpatch', url: 'https://extensions.turbowarp.org/box2d.js'},
    // "cloudlink": {id: 'cloudlink', url: 'https://extensions.turbowarp.org/cloudlink.js'},
    // maybe this patch should be moved outside of something called **Extension**Patches but i dont know
    "operators": (_, object) => { // fix expandable join using the wrong prefix
        let blocks = object.blocks;
        const blockIDs = Object.keys(blocks);

        for (let block, idx = 0; idx < blockIDs.length; idx++) {
            block = blocks[blockIDs[idx]];
            if (typeof block !== 'object' || Array.isArray(block)) continue;
            
            if (block.opcode === "operators_expandablejoininputs") {
                block.opcode = "operator_expandablejoininputs";
            }
            blocks[blockIDs[idx]] = block;
        }
        object.blocks = blocks;
    },
    "jwUnite": (extensions, object, runtime) => {
        extensions.extensionIDs.delete("jwUnite");
        let blocks = object.blocks;
        const blockIDs = Object.keys(blocks);
        const patcher = extensions.patcher;

        for (let block, idx = 0; idx < blockIDs.length; idx++) {
            block = blocks[blockIDs[idx]];
            if (typeof block !== 'object' || Array.isArray(block)) continue;
            // handle all 1:1 blocks
            if (uniteReplacments[block.opcode]) {
                block.opcode = uniteReplacments[block.opcode];
                if (block.opcode === 'sensing_regextest' || block.opcode === 'operator_regexmatch') {
                    block.inputs.regrule = [
                        INPUT_SAME_BLOCK_SHADOW,
                        [TEXT_PRIMITIVE, "g"]
                    ];
                }
            }
            // handle replacer blocks
            if (block.opcode === 'jwUnite_setReplacer' || block.opcode === 'jwUnite_replaceWithReplacers') {
                if (!patcher.loaded.includes('jgJSON')) {
                    runtime.extensionManager.loadExtensionURL('jgJSON');
                    patcher.loaded.push('jgJSON');
                }
                blocks = Object.assign(blocks, Clone.simple(replacersPatch.blocks));
                object.variables = Object.assign(object.variables, Clone.simple(replacersPatch.variables));
                const repBlock = block.opcode === 'jwUnite_setReplacer'
                    ? "setReplacerToDisplay"
                    : "replaceWithReplacersDisplay";
                const replacment = Clone.simple(replacersPatch.blocks[repBlock]);
                block.opcode = 'procedures_call';
                block.mutation = replacment.mutation;
            }
            blocks[blockIDs[idx]] = block;
        }
        object.blocks = blocks;
    },
    // eslint-disable-next-line no-unused-vars
    // 'text': (extensions, object, runtime) => {
    //     const blocks = object.blocks;
    //     const patcher = extensions.patcher;
    //     if (!patcher.loaded.includes('text')) {
    //         runtime.extensionManager.loadExtensionURL('text');
    //         patcher.loaded.push('text');
    //     }
    //     for (const id in blocks) {
    //         const block = blocks[id];
    //         const oldFont = block.fields?.FONT ?? block.fields?.font;
    //         if (!oldFont) continue;
    //         block.inputs.FONT = [
    //             INPUT_SAME_BLOCK_SHADOW,
    //             [
    //                 LONE_FIELD,
    //                 'text_menu_FONT',
    //                 'FONT',
    //                 {
    //                     name: 'FONT',
    //                     value: oldFont[0],
    //                     id: oldFont[1]
    //                 }
    //             ]
    //         ];
    //     }
    // }
};

/**
 * Serializes primitives described above into a more compact format
 * @param {object} block the block to serialize
 * @return {array} An array representing the information in the block,
 * or null if the given block is not one of the primitives described above.
 */
const serializePrimitiveBlock = function (block) {
    // Returns an array represeting a primitive block or null if not one of
    // the primitive types above
    // if (Object.keys(block.inputs).length === 0 && Object.keys(block.fields).length === 1) {
    //     const opcode = block.opcode;
    //     const fieldName = Object.keys(block.fields)[0];
    //     const fieldValue = block.fields[fieldName];
    //     const primitiveDesc = [LONE_FIELD, opcode, fieldName, fieldValue];
    //     if (block.topLevel) {
    //         primitiveDesc.push(block.x ? Math.round(block.x) : 0);
    //         primitiveDesc.push(block.y ? Math.round(block.y) : 0);
    //     }
    //     return primitiveDesc;
    // }
    if (hasOwnProperty.call(primitiveOpcodeInfoMap, block.opcode)) {
        const primitiveInfo = primitiveOpcodeInfoMap[block.opcode];
        const primitiveConstant = primitiveInfo[0];
        const fieldName = primitiveInfo[1];
        const field = block.fields[fieldName];
        const primitiveDesc = [primitiveConstant, field.value];
        if (block.opcode === 'event_broadcast_menu') {
            primitiveDesc.push(field.id);
        } else if (block.opcode === 'data_variable' || block.opcode === 'data_listcontents') {
            primitiveDesc.push(field.id);
            if (block.topLevel) {
                primitiveDesc.push(block.x ? Math.round(block.x) : 0);
                primitiveDesc.push(block.y ? Math.round(block.y) : 0);
            }
        }
        return primitiveDesc;
    }
    return null;
};

/**
 * Serializes the inputs field of a block in a compact form using
 * constants described above to represent the relationship between the
 * inputs of this block (e.g. if there is an unobscured shadow, an obscured shadow
 * -- a block plugged into a droppable input -- or, if there is just a block).
 * Based on this relationship, serializes the ids of the block and shadow (if present)
 *
 * @param {object} inputs The inputs to serialize
 * @return {object} An object representing the serialized inputs
 */
const serializeInputs = function (inputs) {
    const obj = Object.create(null);
    for (const inputName in inputs) {
        if (!hasOwnProperty.call(inputs, inputName)) continue;
        // if block and shadow refer to the same block, only serialize one
        if (inputs[inputName].block === inputs[inputName].shadow) {
            // has block and shadow, and they are the same
            obj[inputName] = [
                INPUT_SAME_BLOCK_SHADOW,
                inputs[inputName].block
            ];
        } else if (inputs[inputName].shadow === null) {
            // does not have shadow
            obj[inputName] = [
                INPUT_BLOCK_NO_SHADOW,
                inputs[inputName].block
            ];
        } else {
            // block and shadow are both present and are different
            obj[inputName] = [
                INPUT_DIFF_BLOCK_SHADOW,
                inputs[inputName].block,
                inputs[inputName].shadow
            ];
        }
    }
    return obj;
};

/**
 * Serialize the fields of a block in a more compact form.
 * @param {object} fields The fields object to serialize
 * @return {object} An object representing the serialized fields
 */
const serializeFields = function (fields) {
    const obj = Object.create(null);
    for (const fieldName in fields) {
        if (!hasOwnProperty.call(fields, fieldName)) continue;
        obj[fieldName] = [fields[fieldName].value];
        if (fields[fieldName].hasOwnProperty('id')) {
            obj[fieldName].push(fields[fieldName].id);
        }
        if (fields[fieldName].hasOwnProperty('variableType')) {
            obj[fieldName].push(fields[fieldName].variableType);
        }
    }
    return obj;
};

/**
 * Serialize the given block in the SB3 format with some compression of inputs,
 * fields, and primitives.
 * @param {object} block The block to serialize
 * @return {object | array} A serialized representation of the block. This is an
 * array if the block is one of the primitive types described above or an object,
 * if not.
 */
const serializeBlock = function (block) {
    const serializedPrimitive = serializePrimitiveBlock(block);
    if (serializedPrimitive) return serializedPrimitive;
    // If serializedPrimitive is null, proceed with serializing a non-primitive block
    const obj = Object.create(null);
    obj.opcode = block.opcode;
    // NOTE: this is extremely important to serialize even if null;
    // not serializing `next: null` results in strange behavior with block
    // execution
    obj.next = block.next;
    obj.parent = block.parent;
    obj.inputs = serializeInputs(block.inputs);
    obj.fields = serializeFields(block.fields);
    obj.shadow = block.shadow;
    if (block.topLevel) {
        obj.topLevel = true;
        obj.x = block.x ? Math.round(block.x) : 0;
        obj.y = block.y ? Math.round(block.y) : 0;
    } else {
        obj.topLevel = false;
    }
    if (block.mutation) {
        obj.mutation = block.mutation;
    }
    if (block.comment) {
        obj.comment = block.comment;
    }
    return obj;
};

/**
 * Compresses the serialized inputs replacing block/shadow ids that refer to
 * one of the primitives with the primitive itself. E.g.
 *
 * blocks: {
 *      aUidForMyBlock: {
 *          inputs: {
 *               MYINPUT: [1, 'aUidForAnUnobscuredShadowPrimitive']
 *          }
 *      },
 *      aUidForAnUnobscuredShadowPrimitive: [4, 10]
 *      // the above is a primitive representing a 'math_number' with value 10
 * }
 *
 * becomes:
 *
 * blocks: {
 *      aUidForMyBlock: {
 *          inputs: {
 *               MYINPUT: [1, [4, 10]]
 *          }
 *      }
 * }
 * Note: this function modifies the given blocks object in place
 * @param {object} block The block with inputs to compress
 * @param {objec} blocks The object containing all the blocks currently getting serialized
 * @return {object} The serialized block with compressed inputs
 */
const compressInputTree = function (block, blocks) {
    // This is the second pass on the block
    // so the inputs field should be an object of key - array pairs
    const serializedInputs = block.inputs;
    for (const inputName in serializedInputs) {
        // don't need to check for hasOwnProperty because of how we constructed
        // inputs
        const currInput = serializedInputs[inputName];
        // traverse currInput skipping the first element, which describes whether the block
        // and shadow are the same
        for (let i = 1; i < currInput.length; i++) {
            if (!currInput[i]) continue; // need this check b/c block/shadow can be null
            const blockOrShadowID = currInput[i];
            // replace element of currInput directly
            // (modifying input block directly)
            const blockOrShadow = blocks[blockOrShadowID];
            if (Array.isArray(blockOrShadow)) {
                currInput[i] = blockOrShadow;
                // Modifying blocks in place!
                delete blocks[blockOrShadowID];
            }
        }
    }
    return block;
};

/**
 * Get sanitized non-core extension ID for a given sb3 opcode.
 * Note that this should never return a URL. If in the future the SB3 loader supports loading extensions by URL, this
 * ID should be used to (for example) look up the extension's full URL from a table in the SB3's JSON.
 * @param {!string} opcode The opcode to examine for extension.
 * @return {?string} The extension ID, if it exists and is not a core extension.
 */
const getExtensionIdForOpcode = function (opcode) {
    // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
    if (!(typeof opcode === 'string')) {
        console.error('invalid opcode ' + opcode);
        return '';
    }
    const index = opcode.indexOf('_');
    const forbiddenSymbols = /[^\w-]/g;
    const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
    if (CORE_EXTENSIONS.indexOf(prefix) === -1) {
        if (prefix !== '') return prefix;
    }
};

/**
 * @param {Runtime} runtime The runtime to check in
 * @returns {Array<string>} runtime -> extensionIDs
 */
const getExtensionIDs = runtime => runtime._blockInfo
    .map(ext => ext.id)
    .filter(ext => runtime.extensionManager.isExtensionLoaded(ext));

/**
 * @param {Set<string>|string[]} extensionIDs Project extension IDs
 * @param {Runtime} runtime The runtime to check in
 * @returns {Record<string, string>|null} extension ID -> URL map, or null if no custom extensions.
 */
const getExtensionURLsToSave = (extensionIDs, runtime) => {
    // Extension manager only exists when runtime is wrapped by VirtualMachine
    if (!runtime.extensionManager) {
        return null;
    }

    // We'll save the extensions in the format:
    // {
    //   "extensionid": "https://...",
    //   "otherid": "https://..."
    // }
    // Which lets the VM know which URLs correspond to which IDs, which is useful when the project
    // is being loaded. For example, if the extension is eventually converted to a builtin extension
    // or if it is already loaded, then it doesn't need to fetch the script again.
    const extensionURLs = runtime.extensionManager.getExtensionURLs();
    const toSave = {};
    for (const extension of extensionIDs) {
        const url = extensionURLs[extension];
        if (typeof url === 'string') {
            toSave[extension] = url;
        }
    }
    if (Object.keys(toSave).length === 0) {
        return null;
    }
    return toSave;
};

/**
 * Serialize the given blocks object (representing all the blocks for the target
 * currently being serialized.)
 * @param {object} blocks The blocks to be serialized
 * @return {Array} An array of the serialized blocks with compressed inputs and
 * compressed primitives and the list of all extension IDs present
 * in the serialized blocks.
 */
const serializeBlocks = function (blocks) {
    const obj = Object.create(null);
    for (const blockID in blocks) {
        if (!blocks.hasOwnProperty(blockID)) continue;
        obj[blockID] = serializeBlock(blocks[blockID], blocks);
    }
    // once we have completed a first pass, do a second pass on block inputs
    for (const blockID in obj) {
        // don't need to do the hasOwnProperty check here since we
        // created an object that doesn't get extra properties/functions
        const serializedBlock = obj[blockID];
        // caution, this function deletes parts of this object in place as
        // it's traversing it
        obj[blockID] = compressInputTree(serializedBlock, obj);
        // second pass on connecting primitives to serialized inputs directly
    }
    // Do one last pass and remove any top level shadows (these are caused by
    // a bug: LLK/scratch-vm#1011, and this pass should be removed once that is
    // completely fixed)
    for (const blockID in obj) {
        const serializedBlock = obj[blockID];
        // If the current block is serialized as a primitive (e.g. it's an array
        // instead of an object), AND it is not one of the top level primitives
        // e.g. variable getter or list getter, then it should be deleted as it's
        // a shadow block, and there are no blocks that reference it, otherwise
        // they would have been compressed in the last pass)
        if (Array.isArray(serializedBlock) &&
            [VAR_PRIMITIVE, LIST_PRIMITIVE].indexOf(serializedBlock[0]) < 0) {
            log.warn(`Found an unexpected top level primitive with block ID: ${
                blockID}; deleting it from serialized blocks.`);
            delete obj[blockID];
        }
    }
    return obj;
};

/**
 * @param {unknown} blocks Output of serializeStandaloneBlocks
 * @returns {{blocks: Block[], extensionURLs: Map<string, string>}} The deserialized blocks. includes the extension urls included with those blocks
 */
const deserializeStandaloneBlocks = blocks => {
    // deep clone to ensure it's safe to modify later
    blocks = JSON.parse(JSON.stringify(blocks));

    if (blocks.extensionURLs) {
        const extensionURLs = new Map();
        for (const [id, url] of Object.entries(blocks.extensionURLs)) {
            extensionURLs.set(id, url);
        }
        return {
            blocks: blocks.blocks,
            extensionURLs
        };
    }

    // Vanilla Scratch format is just a list of block objects
    return {
        blocks,
        extensionURLs: new Map()
    };
};

/**
 * @param {Block[]} blocks List of block objects.
 * @param {Runtime} runtime Runtime
 * @returns {object} Something that can be understood by deserializeStandaloneBlocks
 */
const serializeStandaloneBlocks = (blocks, runtime) => {
    const extensionIDs = new Set(getExtensionIDs(runtime));
    const extensionURLs = getExtensionURLsToSave(extensionIDs, runtime);
    if (extensionURLs) {
        return {
            blocks,
            // same format as project.json
            extensionURLs: extensionURLs
        };
    }
    // Vanilla Scratch always just uses the block array as-is. To reduce compatibility concerns
    // we too will use that when possible.
    return blocks;
};

/**
 * Serialize the given costume.
 * @param {object} costume The costume to be serialized.
 * @return {object} A serialized representation of the costume.
 */
const serializeCostume = function (costume) {
    const obj = Object.create(null);
    obj.name = costume.name;

    const costumeToSerialize = costume.broken || costume;

    obj.bitmapResolution = costumeToSerialize.bitmapResolution;
    obj.dataFormat = costumeToSerialize.dataFormat.toLowerCase();

    obj.assetId = costumeToSerialize.assetId;

    // serialize this property with the name 'md5ext' because that's
    // what it's actually referring to. TODO runtime objects need to be
    // updated to actually refer to this as 'md5ext' instead of 'md5'
    // but that change should be made carefully since it is very
    // pervasive
    obj.md5ext = costumeToSerialize.md5;

    obj.rotationCenterX = costumeToSerialize.rotationCenterX;
    obj.rotationCenterY = costumeToSerialize.rotationCenterY;

    return obj;
};

/**
 * Serialize the given sound.
 * @param {object} sound The sound to be serialized.
 * @return {object} A serialized representation of the sound.
 */
const serializeSound = function (sound) {
    const obj = Object.create(null);
    obj.name = sound.name;

    const soundToSerialize = sound.broken || sound;

    obj.assetId = soundToSerialize.assetId;
    obj.dataFormat = soundToSerialize.dataFormat.toLowerCase();
    obj.format = soundToSerialize.format;
    obj.rate = soundToSerialize.rate;
    obj.sampleCount = soundToSerialize.sampleCount;
    // serialize this property with the name 'md5ext' because that's
    // what it's actually referring to. TODO runtime objects need to be
    // updated to actually refer to this as 'md5ext' instead of 'md5'
    // but that change should be made carefully since it is very
    // pervasive
    obj.md5ext = soundToSerialize.md5;
    return obj;
};

// Serialize custom return types
const makeSafeForJSON = (runtime, value) => {
    // null and undefined should not be serialized, as they are illegal values
    if (value === null || typeof value === 'undefined')
        return ''
    if (Array.isArray(value)) {
        let copy = null;
        for (let i = 0; i < value.length; i++) {
            if (value[i]?.customId) {
                if (!copy) {
                    // Only copy the list when needed
                    copy = value.slice();
                }
                const {serialize} = runtime.serializers[copy[i].customId];
                copy[i] = {
                    customType: true,
                    typeId: copy[i].customId,
                    serialized: serialize(copy[i])
                };
                continue;
            }
        }
        if (copy) {
            return copy;
        }
        return value;
    }
    if (value.customId) {
        const {serialize} = runtime.serializers[value.customId];
        return {
            customType: true,
            typeId: value.customId,
            serialized: serialize(value)
        };
    }

    return value;
};

/**
 * Serialize the given variables object.
 * @param {object} obj The object  to put variables in
 * @param {!Runtime} runtime The runtime to get custom type serializers from
 * @param {object} variables The variables to be serialized.
 */
const serializeVariables = function (obj, runtime, variables) {
    // separate out variables into types at the top level so we don't have
    // keep track of a type for each
    obj.variables = Object.create(null);
    obj.lists = Object.create(null);
    obj.broadcasts = Object.create(null);
    obj.customVars = [];
    for (const varId in variables) {
        const v = variables[varId];

        switch (v.type) {
            case Variable.BROADCAST_MESSAGE_TYPE:
                obj.broadcasts[varId] = v.value; // name and value is the same for broadcast msgs
                break;
            case Variable.LIST_TYPE:
                obj.lists[varId] = [v.name, makeSafeForJSON(runtime, v.value)];
                break;
            case Variable.SCALAR_TYPE:
                obj.variables[varId] = [v.name, makeSafeForJSON(runtime, v.value)];
                if (v.isCloud) obj.variables[varId].push(true);
                break;
            default:
                const info = v.serialize();
                const variable_object = {
                    type: v.type,
                    id: varId,
                    info,
                };
                obj.customVars.push(variable_object);
        }
    }
};

const serializeComments = function (comments) {
    const obj = Object.create(null);
    for (const commentId in comments) {
        if (!comments.hasOwnProperty(commentId)) continue;
        const comment = comments[commentId];

        const serializedComment = Object.create(null);
        serializedComment.blockId = comment.blockId;
        serializedComment.x = comment.x;
        serializedComment.y = comment.y;
        serializedComment.width = comment.width;
        serializedComment.height = comment.height;
        serializedComment.minimized = comment.minimized;
        serializedComment.text = comment.text;

        obj[commentId] = serializedComment;
    }
    return obj;
};

/**
 * Serialize the given target. Only serialize properties that are necessary
 * for saving and loading this target.
 * @param {!Runtime} runtime The runtime to get custom serializers from
 * @param {object} target The target to be serialized.
 * @return {object} A serialized representation of the given target.
 */
const serializeTarget = function (runtime, target) {
    const obj = Object.create(null);
    obj.isStage = target.isStage;
    obj.name = obj.isStage ? 'Stage' : target.name;
    serializeVariables(obj, runtime, target.variables);
    obj.blocks = serializeBlocks(target.blocks);
    obj.comments = serializeComments(target.comments);

    // TODO remove this check/patch when (#1901) is fixed
    if (target.currentCostume < 0 || target.currentCostume >= target.costumes.length) {
        log.warn(`currentCostume property for target ${target.name} is out of range`);
        target.currentCostume = MathUtil.clamp(target.currentCostume, 0, target.costumes.length - 1);
    }

    obj.currentCostume = target.currentCostume;
    obj.costumes = target.costumes.map(serializeCostume);
    obj.sounds = target.sounds.map(serializeSound);
    obj.id = target.id;
    if (target.hasOwnProperty('volume')) obj.volume = target.volume;
    if (target.hasOwnProperty('layerOrder')) obj.layerOrder = target.layerOrder;
    if (obj.isStage) { // Only the stage should have these properties
        if (target.hasOwnProperty('tempo')) obj.tempo = target.tempo;
        if (target.hasOwnProperty('videoTransparency')) obj.videoTransparency = target.videoTransparency;
        if (target.hasOwnProperty('videoState')) obj.videoState = target.videoState;
        if (target.hasOwnProperty('textToSpeechLanguage')) obj.textToSpeechLanguage = target.textToSpeechLanguage;
    } else { // The stage does not need the following properties, but sprites should
        obj.visible = target.visible;
        obj.x = target.x;
        obj.y = target.y;
        obj.size = target.size;
        obj.direction = target.direction;
        obj.draggable = target.draggable;
        obj.rotationStyle = target.rotationStyle;
    }

    const extensions = getExtensionIDs(runtime);
    const extensionData = {};
    for (let extension of extensions) {
        if (
            `ext_${extension}` in runtime &&
            (typeof runtime[`ext_${extension}`].serializeForTarget === 'function')
        ) {
            extensionData[extension] = runtime[`ext_${extension}`].serializeForTarget(target);
            continue;
        }
        if (extension in (target.extensionStorage ?? {})) {
            extensionData[extension] = target.extensionStorage[extension];
            continue;
        }

    }
    if (extensionData) {
        obj.extensionData = extensionData;
    }

    return obj;
};

const getSimplifiedLayerOrdering = function (targets) {
    const layerOrders = targets.map(t => t.getLayerOrder());
    return MathUtil.reducedSortOrdering(layerOrders);
};

const serializeMonitors = function (monitors, runtime) {
    // Monitors position is always stored as position from top-left corner in 480x360 stage.
    const xOffset = (runtime.stageWidth - 480) / 2;
    const yOffset = (runtime.stageHeight - 360) / 2;
    return monitors.valueSeq()
        // Don't include hidden monitors from extensions
        // https://github.com/LLK/scratch-vm/issues/2331
        .filter(monitorData => {
            const extensionID = getExtensionIdForOpcode(monitorData.opcode);
            return !extensionID || monitorData.visible;
        })
        .map(monitorData => {
            const serializedMonitor = {
                id: monitorData.id,
                mode: monitorData.mode,
                opcode: monitorData.opcode,
                params: monitorData.params,
                spriteName: monitorData.spriteName,
                value: Array.isArray(monitorData.value) ? [] : 0,
                width: monitorData.width,
                height: monitorData.height,
                x: monitorData.x - xOffset,
                y: monitorData.y - yOffset,
                visible: monitorData.visible,
                variableType: monitorData.variableType,
                variableId: monitorData.variableId
            };
            if (monitorData.mode !== 'list') {
                serializedMonitor.sliderMin = monitorData.sliderMin;
                serializedMonitor.sliderMax = monitorData.sliderMax;
                serializedMonitor.isDiscrete = monitorData.isDiscrete;
            }
            return serializedMonitor;
        });
};

/**
 * Serializes the specified VM runtime.
 * @param {!Runtime} runtime VM runtime instance to be serialized.
 * @param {string=} targetId Optional target id if serializing only a single target
 * @return {object} Serialized runtime instance.
 */
const serialize = function (runtime, targetId, {allowOptimization = true} = {}) {
    // Fetch targets
    const obj = Object.create(null);
    // Create extension set to hold extension ids found while serializing targets
    const extensions = getExtensionIDs(runtime);

    const originalTargetsToSerialize = (
        targetId
            ? [runtime.getTargetById(targetId)]
            : runtime.targets.filter(target => target.isOriginal)
        );

    const layerOrdering = getSimplifiedLayerOrdering(originalTargetsToSerialize);

    const flattenedOriginalTargets = originalTargetsToSerialize.map(t => t.toJSON());

    // If the renderer is attached, and we're serializing a whole project (not a sprite)
    // add a temporary layerOrder property to each target.
    if (runtime.renderer && !targetId) {
        flattenedOriginalTargets.forEach((t, index) => {
            t.layerOrder = layerOrdering[index];
        });
    }

    const serializedTargets = flattenedOriginalTargets.map(t => serializeTarget(runtime, t, extensions));
    const fonts = runtime.fontManager.serializeJSON();

    if (targetId) {
        const target = serializedTargets[0];
        const extensionURLs = getExtensionURLsToSave(extensions, runtime);
        target.extensions = extensions;
        if (extensionURLs) {
            target.extensionURLs = extensionURLs;
        }

        // add extension datas
        target.extensionData = {};
        for (const extension of extensions) {
            if (`ext_${extension}` in runtime && typeof runtime[`ext_${extension}`].serialize === 'function') {
                target.extensionData[extension] = runtime[`ext_${extension}`].serialize();
                continue;
            }
            if (extension in runtime.extensionStorage) {
                target.extensionData[extension] = runtime.extensionStorage[extension]
                continue;
            }
        }

        if (fonts) {
            target.customFonts = fonts;
        }
        return target;
    }

    obj.targets = serializedTargets;

    obj.monitors = serializeMonitors(runtime.getMonitorState(), runtime);

    // add extension datas
    obj.extensionData = {};
    for (const extension of extensions) {
        if (`ext_${extension}` in runtime && typeof runtime[`ext_${extension}`].serialize === 'function') {
            obj.extensionData[extension] = runtime[`ext_${extension}`].serialize();
            continue;
        }
        if (extension in runtime.extensionStorage) {
            obj.extensionData[extension] = runtime.extensionStorage[extension]
            continue;
        }
    }

    // Assemble extension list
    obj.extensions = extensions;
    const extensionURLs = getExtensionURLsToSave(extensions, runtime);
    if (extensionURLs) {
        obj.extensionURLs = extensionURLs;
    }

    if (fonts) {
        obj.customFonts = fonts;
    }

    // Assemble metadata
    const meta = Object.create(null);
    meta.semver = '3.0.0';
    // TW: There isn't a good reason to put the full version number in the json, so we don't.
    meta.vm = '0.2.0';
    if (runtime.origin) {
        meta.origin = runtime.origin;
    }

    // Attach full user agent string to metadata if available
    meta.agent = '';
    // TW: Never include full user agent to slightly improve user privacy
    // if (typeof navigator !== 'undefined') meta.agent = navigator.userAgent;

    // Attach platform information so TurboWarp and other mods can detect where the file comes from
    const platform = Object.create(null);
    platform.name = "PenguinMod";
    platform.url = "https://penguinmod.com/";
    platform.version = "stable";
    meta.platform = platform;

    // Assemble payload and return
    obj.meta = meta;

    if (allowOptimization) {
        compress(obj);
    }

    return obj;
};

/**
 * Deserialize a block input descriptors. This is either a
 * block id or a serialized primitive, e.g. an array
 * (see serializePrimitiveBlock function).
 * @param {string | array} inputDescOrId The block input descriptor to be serialized.
 * @param {string} parentId The id of the parent block for this input block.
 * @param {boolean} isShadow Whether or not this input block is a shadow.
 * @param {object} blocks The entire blocks object currently in the process of getting serialized.
 * @return {object} The deserialized input descriptor.
 */
const deserializeInputDesc = function (inputDescOrId, parentId, isShadow, blocks) {
    if (!Array.isArray(inputDescOrId)) return inputDescOrId;
    const primitiveObj = Object.create(null);
    const newId = uid();
    primitiveObj.id = newId;
    primitiveObj.next = null;
    primitiveObj.parent = parentId;
    primitiveObj.shadow = isShadow;
    primitiveObj.inputs = Object.create(null);
    // need a reference to parent id
    switch (inputDescOrId[0]) {
    case MATH_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case POSITIVE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_positive_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case WHOLE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_whole_number';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case INTEGER_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_integer';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case ANGLE_NUM_PRIMITIVE: {
        primitiveObj.opcode = 'math_angle';
        primitiveObj.fields = {
            NUM: {
                name: 'NUM',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case COLOR_PICKER_PRIMITIVE: {
        primitiveObj.opcode = 'colour_picker';
        primitiveObj.fields = {
            COLOUR: {
                name: 'COLOUR',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case TEXT_PRIMITIVE: {
        primitiveObj.opcode = 'text';
        primitiveObj.fields = {
            TEXT: {
                name: 'TEXT',
                value: inputDescOrId[1]
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case BROADCAST_PRIMITIVE: {
        primitiveObj.opcode = 'event_broadcast_menu';
        primitiveObj.fields = {
            BROADCAST_OPTION: {
                name: 'BROADCAST_OPTION',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.BROADCAST_MESSAGE_TYPE
            }
        };
        primitiveObj.topLevel = false;
        break;
    }
    case VAR_PRIMITIVE: {
        primitiveObj.opcode = 'data_variable';
        primitiveObj.fields = {
            VARIABLE: {
                name: 'VARIABLE',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.SCALAR_TYPE
            }
        };
        if (inputDescOrId.length > 3) {
            primitiveObj.topLevel = true;
            primitiveObj.x = inputDescOrId[3];
            primitiveObj.y = inputDescOrId[4];
        }
        break;
    }
    case LIST_PRIMITIVE: {
        primitiveObj.opcode = 'data_listcontents';
        primitiveObj.fields = {
            LIST: {
                name: 'LIST',
                value: inputDescOrId[1],
                id: inputDescOrId[2],
                variableType: Variable.LIST_TYPE
            }
        };
        if (inputDescOrId.length > 3) {
            primitiveObj.topLevel = true;
            primitiveObj.x = inputDescOrId[3];
            primitiveObj.y = inputDescOrId[4];
        }
        break;
    }
    case LONE_FIELD: {
        primitiveObj.opcode = inputDescOrId[1];
        primitiveObj.fields = {
            [inputDescOrId[2]]: inputDescOrId[3]
        };
        if (inputDescOrId.length > 4) {
            primitiveObj.topLevel = true;
            primitiveObj.x = inputDescOrId[4];
            primitiveObj.y = inputDescOrId[5];
        }
        break;
    }
    default: {
        log.error(`Found unknown primitive type during deserialization: ${JSON.stringify(inputDescOrId)}`);
        return null;
    }
    }
    blocks[newId] = primitiveObj;
    return newId;
};

/**
 * Deserialize the given block inputs.
 * @param {object} inputs The inputs to deserialize.
 * @param {string} parentId The block id of the parent block
 * @param {object} blocks The object representing the entire set of blocks currently
 * in the process of getting deserialized.
 * @return {object} The deserialized and uncompressed inputs.
 */
const deserializeInputs = function (inputs, parentId, blocks) {
    // Explicitly not using Object.create(null) here
    // because we call prototype functions later in the vm
    const obj = {};
    for (const inputName in inputs) {
        if (!hasOwnProperty.call(inputs, inputName)) continue;
        const inputDescArr = inputs[inputName];
        // If this block has already been deserialized (it's not an array) skip it
        if (!Array.isArray(inputDescArr)) continue;
        let block = null;
        let shadow = null;
        const blockShadowInfo = inputDescArr[0];
        if (blockShadowInfo === INPUT_SAME_BLOCK_SHADOW) {
            // block and shadow are the same id, and only one is provided
            block = shadow = deserializeInputDesc(inputDescArr[1], parentId, true, blocks);
        } else if (blockShadowInfo === INPUT_BLOCK_NO_SHADOW) {
            block = deserializeInputDesc(inputDescArr[1], parentId, false, blocks);
        } else { // assume INPUT_DIFF_BLOCK_SHADOW
            block = deserializeInputDesc(inputDescArr[1], parentId, false, blocks);
            shadow = deserializeInputDesc(inputDescArr[2], parentId, true, blocks);
        }
        obj[inputName] = {
            name: inputName,
            block: block,
            shadow: shadow
        };
    }
    return obj;
};

/**
 * Deserialize the given block fields.
 * @param {object} fields The fields to be deserialized
 * @return {object} The deserialized and uncompressed block fields.
 */
const deserializeFields = function (fields) {
    // Explicitly not using Object.create(null) here
    // because we call prototype functions later in the vm
    const obj = {};
    for (const fieldName in fields) {
        if (!hasOwnProperty.call(fields, fieldName)) continue;
        const fieldDescArr = fields[fieldName];
        // If this block has already been deserialized (it's not an array) skip it
        if (!Array.isArray(fieldDescArr)) continue;
        obj[fieldName] = {
            name: fieldName,
            value: fieldDescArr[0]
        };
        if (fieldDescArr.length > 1) {
            obj[fieldName].id = fieldDescArr[1];
        }
        if (fieldDescArr.length > 2) {
            obj[fieldName].variableType = fieldDescArr[2];
        }
        // "old" compat code :bleh:
        if (fieldName === 'BROADCAST_OPTION') {
            obj[fieldName].variableType = Variable.BROADCAST_MESSAGE_TYPE;
        } else if (fieldName === 'VARIABLE') {
            obj[fieldName].variableType = Variable.SCALAR_TYPE;
        } else if (fieldName === 'LIST') {
            obj[fieldName].variableType = Variable.LIST_TYPE;
        }
    }
    return obj;
};

/**
 * Covnert serialized INPUT and FIELD primitives back to hydrated block templates.
 * Should be able to deserialize a format that has already been deserialized.  The only
 * "east" path to adding new targets/code requires going through deserialize, so it should
 * work with pre-parsed deserialized blocks.
 *
 * @param {object} blocks Serialized SB3 "blocks" property of a target. Will be mutated.
 * @return {object} input is modified and returned
 */
const deserializeBlocks = function (blocks) {
    for (const blockId in blocks) {
        if (!Object.prototype.hasOwnProperty.call(blocks, blockId)) {
            continue;
        }
        const block = blocks[blockId];
        if (Array.isArray(block)) {
            // this is one of the primitives
            // delete the old entry in object.blocks and replace it with the
            // deserialized object
            delete blocks[blockId];
            deserializeInputDesc(block, null, false, blocks);
            continue;
        }
        block.id = blockId; // add id back to block since it wasn't serialized
        block.inputs = deserializeInputs(block.inputs, blockId, blocks);
        block.fields = deserializeFields(block.fields);
    }
    return blocks;
};

/**
 * Parse the assets of a single "Scratch object" and load them. This
 * preprocesses objects to support loading the data for those assets over a
 * network while the objects are further processed into Blocks, Sprites, and a
 * list of needed Extensions.
 * @param {!object} object From-JSON "Scratch object:" sprite, stage, watcher.
 * @param {!Runtime} runtime Runtime object to load all structures into.
 * @param {JSZip} zip Sb3 file describing this project (to load assets from)
 * @return {?{costumePromises:Array.<Promise>,soundPromises:Array.<Promise>,soundBank:SoundBank}}
 * Object of arrays of promises for asset objects used in Sprites. As well as a
 * SoundBank for the sound assets. null for unsupported objects.
 */
const parseScratchAssets = function (object, runtime, zip) {
    if (!object.hasOwnProperty('name')) {
        // Watcher/monitor - skip this object until those are implemented in VM.
        // @todo
        return Promise.resolve(null);
    }

    const assets = {
        costumePromises: null,
        soundPromises: null,
        soundBank: runtime.audioEngine && runtime.audioEngine.createBank()
    };

    // Costumes from JSON.
    assets.costumePromises = (object.costumes || []).map(costumeSource => {
        // @todo: Make sure all the relevant metadata is being pulled out.
        const costume = {
            // costumeSource only has an asset if an image is being uploaded as
            // a sprite
            asset: costumeSource.asset,
            assetId: costumeSource.assetId,
            skinId: null,
            name: costumeSource.name,
            bitmapResolution: costumeSource.bitmapResolution,
            rotationCenterX: costumeSource.rotationCenterX,
            rotationCenterY: costumeSource.rotationCenterY
        };
        const dataFormat =
            costumeSource.dataFormat ||
            (costumeSource.assetType && costumeSource.assetType.runtimeFormat) || // older format
            'png'; // if all else fails, guess that it might be a PNG
        const costumeMd5Ext = costumeSource.hasOwnProperty('md5ext') ?
            costumeSource.md5ext : `${costumeSource.assetId}.${dataFormat}`;
        costume.md5 = costumeMd5Ext;
        costume.dataFormat = dataFormat;
        // deserializeCostume should be called on the costume object we're
        // creating above instead of the source costume object, because this way
        // we're always loading the 'sb3' representation of the costume
        // any translation that needs to happen will happen in the process
        // of building up the costume object into an sb3 format
        return deserializeCostume(costume, runtime, zip)
            .then(() => loadCostume(costumeMd5Ext, costume, runtime));
        // Only attempt to load the costume after the deserialization
        // process has been completed
    });
    // Sounds from JSON
    assets.soundPromises = (object.sounds || []).map(soundSource => {
        const sound = {
            assetId: soundSource.assetId,
            format: soundSource.format,
            rate: soundSource.rate,
            sampleCount: soundSource.sampleCount,
            name: soundSource.name,
            // TODO we eventually want this property to be called md5ext,
            // but there are many things relying on this particular name at the
            // moment, so this translation is very important
            md5: soundSource.md5ext,
            dataFormat: soundSource.dataFormat,
            data: null
        };
        // deserializeSound should be called on the sound object we're
        // creating above instead of the source sound object, because this way
        // we're always loading the 'sb3' representation of the costume
        // any translation that needs to happen will happen in the process
        // of building up the costume object into an sb3 format
        return deserializeSound(sound, runtime, zip)
            .then(() => loadSound(sound, runtime, assets.soundBank));
        // Only attempt to load the sound after the deserialization
        // process has been completed.
    });

    return assets;
};

/**
 * Convert a Procedure Block to a PenguinMod-acceptable format (TurboWarp compatibility)
 * @param {!object} blockJSON - blockJSON for a block
 * @param {!object} blocks - all blocks in the sprite container
 */
const convertProcedureCompat = function (blockJSON, blocks) {
  if (blockJSON.opcode === 'procedures_return') {
      blockJSON.inputs.return = blockJSON.inputs.VALUE;
      blockJSON.inputs.return.name = "return";
      delete blockJSON.inputs.VALUE;

      // climb stack tree to change the procedure to returnable
      let thisBlock = blockJSON;
      let parent = thisBlock.parent;
      while (parent !== null) {
          if (parent) {
              thisBlock = blocks._blocks[parent];
              parent = thisBlock?.parent ?? null;
          }
      }
      if (thisBlock && thisBlock.opcode === 'procedures_definition') {
          thisBlock.opcode = 'procedures_definition_return';
          const proto = blocks._blocks[thisBlock.inputs.custom_block.block];
          proto.mutation.returns = 'true';
      }
  } else if (blockJSON.opcode === 'procedures_call') {
      const defineId = blocks.getProcedureDefinition(blockJSON.mutation.proccode);
      if (defineId) {
          const protoId = blocks._blocks[defineId].inputs.custom_block.block;
          if (blocks._blocks[protoId].mutation.returns === 'true') {
              blockJSON.mutation.returns = 'true';
          }
      }

      // check if we're not in a reporter slot
      const parent = blocks._blocks[blockJSON.parent];
      if (parent) {
          if (parent.next === blockJSON.id) blockJSON.mutation.returns = 'false';
          else {
              // we could be in a branch
              for (const input of Object.values(parent.inputs)) {
                  if (input.block === blockJSON.id && input.name.startsWith('SUBSTACK')) {
                      blockJSON.mutation.returns = 'false';
                      break;
                  }
              }
          }
      }
  }
};

/**
 * Parse a single "Scratch object" and create all its in-memory VM objects.
 * @param {!object} object From-JSON "Scratch object:" sprite, stage, watcher.
 * @param {!Runtime} runtime Runtime object to load all structures into.
 * @param {ImportedExtensionsInfo} extensions - (in/out) parsed extension information will be stored here.
 * @param {JSZip} zip Sb3 file describing this project (to load assets from)
 * @param {object} assets - Promises for assets of this scratch object grouped
 *   into costumes and sounds
 * @param {boolean} fromSingleSprite - If true import certain data and merge to existing runtime.
 * @return {!Promise.<Target>} Promise for the target created (stage or sprite), or null for unsupported objects.
 */
const parseScratchObject = function (object, runtime, extensions, zip, assets, fromSingleSprite) {
    if (!object.hasOwnProperty('name')) {
        // Watcher/monitor - skip this object until those are implemented in VM.
        // @todo
        return Promise.resolve(null);
    }
    // Blocks container for this object.
    const blocks = new Blocks(runtime);

    // @todo: For now, load all Scratch objects (stage/sprites) as a Sprite.
    const sprite = new Sprite(blocks, runtime);

    // Sprite/stage name from JSON.
    if (object.hasOwnProperty('name')) {
        sprite.name = object.name;
    }
    if (object.hasOwnProperty('blocks')) {
        // register and patch extensions
        for (const blockId in object.blocks) {
            if (!object.blocks.hasOwnProperty(blockId)) continue;
            const blockJSON = object.blocks[blockId];
            // this is a internal constant and cant be patched
            if (typeof blockJSON !== 'object' || Array.isArray(blockJSON)) continue;
            const extensionID = getExtensionIdForOpcode(blockJSON.opcode);
            const isPatched = extensions.patcher.patchExists(extensionID);
            if (isPatched) {
                extensions.patcher.runExtensionPatch(extensionID, extensions, object);
            }
        }

        deserializeBlocks(object.blocks);
        // Take a second pass to create objects and add extensions
        const _converterCache = [];
        for (const blockId in object.blocks) {
            if (!object.blocks.hasOwnProperty(blockId)) continue;
            const blockJSON = object.blocks[blockId];

            // special imports
            if (fromSingleSprite && runtime._stageTarget) {
                const stage = runtime._stageTarget;

                if (blockJSON.opcode === 'event_broadcast_menu') {
                    // add missing broadcasts
                    const msgInfo = blockJSON.fields.BROADCAST_OPTION;
                    if (!stage.lookupBroadcastMsg('', msgInfo.value)) {
                        stage.createVariable(msgInfo.id, msgInfo.value, 'broadcast_msg', false);
                    } 
                }
            }

            // flag for conversion
            if (runtime.origin === 'TurboWarp') {
                if (blockJSON.opcode === 'procedures_call' || blockJSON.opcode === 'procedures_return') {
                    _converterCache.push(blockJSON);
                }
            }
            blocks.createBlock(blockJSON);
        }

        // convert TurboWarp custom reporters to PenguinMod's format
        if (runtime.origin === 'TurboWarp') for (const block of _converterCache) convertProcedureCompat(block, blocks);
    }
    // Costumes from JSON.
    const {costumePromises} = assets;
    // Sounds from JSON
    const {soundBank, soundPromises} = assets;
    // Create the first clone, and load its run-state from JSON.
    const target = sprite.createClone(object.isStage ? StageLayering.BACKGROUND_LAYER : StageLayering.SPRITE_LAYER);
    // Load target properties from JSON.
    if (object.hasOwnProperty('tempo')) {
        target.tempo = object.tempo;
    }
    if (object.hasOwnProperty('volume')) {
        target.volume = object.volume;
    }
    if (object.hasOwnProperty('videoTransparency')) {
        target.videoTransparency = object.videoTransparency;
    }
    if (object.hasOwnProperty('videoState')) {
        target.videoState = object.videoState;
    }
    if (object.hasOwnProperty('textToSpeechLanguage')) {
        target.textToSpeechLanguage = object.textToSpeechLanguage;
    }
    if (object.hasOwnProperty('variables')) {
        for (const varId in object.variables) {
            const variable = object.variables[varId];
            // A variable is a cloud variable if:
            // - the project says it's a cloud variable, and
            // - it's a stage variable, and
            // - the runtime can support another cloud variable
            const isCloud = (variable.length === 3) && variable[2] &&
                object.isStage && runtime.canAddCloudVariable();
            const newVariable = new Variable(
                varId, // var id is the index of the variable desc array in the variables obj
                variable[0], // name of the variable
                Variable.SCALAR_TYPE, // type of the variable
                isCloud
            );
            if (isCloud) runtime.addCloudVariable();
            newVariable.value = variable[1];
            target.variables[newVariable.id] = newVariable;
        }
    }
    if (object.hasOwnProperty('lists')) {
        for (const listId in object.lists) {
            const list = object.lists[listId];
            const newList = new Variable(
                listId,
                list[0],
                Variable.LIST_TYPE,
                false
            );
            newList.value = list[1];
            target.variables[newList.id] = newList;
        }
    }
    if (object.hasOwnProperty('broadcasts')) {
        for (const broadcastId in object.broadcasts) {
            const broadcast = object.broadcasts[broadcastId];
            const newBroadcast = new Variable(
                broadcastId,
                broadcast,
                Variable.BROADCAST_MESSAGE_TYPE,
                false
            );
            // no need to explicitly set the value, variable constructor
            // sets the value to the same as the name for broadcast msgs
            target.variables[newBroadcast.id] = newBroadcast;
        }
    }
    if (object.hasOwnProperty('customVars')) {
        for (const variable of object.customVars) {
            if (Array.isArray(variable)) {
                // Legacy behaviour.
                const newVar = runtime.newVariableInstance(...variable);
                target.variables[variable[1]] = newVar;
                continue;
            }

            /*
             {
                type: v.type,
                id: varId,
                name: v.name,
                info,
             }
            */
            const newVar = runtime.newVariableInstance(variable.type, ...variable.info);
            target.variables[variable.id] = newVar;
        }
    }
    if (object.hasOwnProperty('comments')) {
        for (const commentId in object.comments) {
            const comment = object.comments[commentId];
            const newComment = new Comment(
                commentId,
                comment.text,
                comment.x,
                comment.y,
                comment.width,
                comment.height,
                comment.minimized
            );
            if (comment.blockId) {
                newComment.blockId = comment.blockId;
            }
            target.comments[newComment.id] = newComment;
        }
    }
    if (object.hasOwnProperty('x')) {
        target.x = object.x;
    }
    if (object.hasOwnProperty('y')) {
        target.y = object.y;
    }
    if (object.hasOwnProperty('direction')) {
        target.direction = object.direction;
    }
    if (object.hasOwnProperty('size')) {
        target.size = object.size;
    }
    if (object.hasOwnProperty('visible')) {
        target.visible = object.visible;
    }
    if (object.hasOwnProperty('currentCostume')) {
        target.currentCostume = MathUtil.clamp(object.currentCostume, 0, object.costumes.length - 1);
    }
    if (object.hasOwnProperty('rotationStyle')) {
        target.rotationStyle = object.rotationStyle;
    }
    if (object.hasOwnProperty('isStage')) {
        target.isStage = object.isStage;
    }
    if (object.hasOwnProperty('targetPaneOrder')) {
        // Temporarily store the 'targetPaneOrder' property
        // so that we can correctly order sprites in the target pane.
        // This will be deleted after we are done parsing and ordering the targets list.
        target.targetPaneOrder = object.targetPaneOrder;
    }
    if (object.hasOwnProperty('draggable')) {
        target.draggable = object.draggable;
    }
    const existingTargetIds = runtime.targets.map(target => target.id);
    if (object.hasOwnProperty('id') && !existingTargetIds.includes(object.id)) {
        target.id = object.id;
    }

    if (object.hasOwnProperty('extensionData') || object.hasOwnProperty('extensionStorage')) {
        target.extensionData = Object.assign(object.extensionStorage ?? {}, object.extensionData);
        // We're prioritizing the keys in extensionData over the ones in extensionStorage
    }

    Promise.all(costumePromises).then(costumes => {
        sprite.costumes = costumes;
    });
    Promise.all(soundPromises).then(sounds => {
        sprite.sounds = sounds;
        // Make sure if soundBank is undefined, sprite.soundBank is then null.
        sprite.soundBank = soundBank || null;
    });
    return Promise.all(costumePromises.concat(soundPromises)).then(() => target);
};

const deserializeMonitor = function (monitorData, runtime, targets, extensions) {
    // Monitors position is always stored as position from top-left corner in 480x360 stage.
    const xOffset = (runtime.stageWidth - 480) / 2;
    const yOffset = (runtime.stageHeight - 360) / 2;
    monitorData.x += xOffset;
    monitorData.y += yOffset;
    monitorData.x = MathUtil.clamp(monitorData.x, 0, runtime.stageWidth);
    monitorData.y = MathUtil.clamp(monitorData.y, 0, runtime.stageHeight);

    // If the serialized monitor has spriteName defined, look up the sprite
    // by name in the given list of targets and update the monitor's targetId
    // to match the sprite's id.
    if (monitorData.spriteName) {
        const filteredTargets = targets.filter(t => t.sprite.name === monitorData.spriteName);
        if (filteredTargets && filteredTargets.length > 0) {
            monitorData.targetId = filteredTargets[0].id;
        } else {
            log.warn(`Tried to deserialize sprite specific monitor ${
                monitorData.opcode} but could not find sprite ${monitorData.spriteName}.`);
        }
    }

    // Get information about this monitor, if it exists, given the monitor's opcode.
    // This will be undefined for extension blocks
    const monitorBlockInfo = runtime.monitorBlockInfo[monitorData.opcode];

    // Due to a bug (see https://github.com/LLK/scratch-vm/pull/2322), renamed list monitors may have been serialized
    // with an outdated/incorrect LIST parameter. Fix it up to use the current name of the actual corresponding list.
    if (monitorData.opcode === 'data_listcontents') {
        const listTarget = monitorData.targetId ?
            targets.find(t => t.id === monitorData.targetId) :
            targets.find(t => t.isStage);
        if (
            listTarget &&
            Object.prototype.hasOwnProperty.call(listTarget.variables, monitorData.id)
        ) {
            monitorData.params.LIST = listTarget.variables[monitorData.id].name;
        }
    }

    // Convert the serialized monitorData params into the block fields structure
    const fields = {};
    for (const paramKey in monitorData.params) {
        const field = {
            name: paramKey,
            value: monitorData.params[paramKey]
        };
        if (typeof monitorData.params[paramKey] === 'object') {
            field.id = monitorData.params[paramKey].id;
            field.value = monitorData.params[paramKey].name;
        }
        fields[paramKey] = field;
    }

    // Variables, lists, and non-sprite-specific monitors, including any extension
    // monitors should already have the correct monitor ID serialized in the monitorData,
    // find the correct id for all other monitors.
    if (monitorData.opcode !== 'data_variable' && monitorData.opcode !== 'data_listcontents' &&
        monitorBlockInfo && monitorBlockInfo.isSpriteSpecific) {
        monitorData.id = monitorBlockInfo.getId(
            monitorData.targetId, fields);
    } else {
        // Replace unsafe characters in monitor ID, if there are any.
        // These would have come from projects that were originally 2.0 projects
        // that had unsafe characters in the variable name (and then the name was
        // used as part of the variable ID when importing the project).
        monitorData.id = StringUtil.replaceUnsafeChars(monitorData.id);
    }

    // If the runtime already has a monitor block for this monitor's id,
    // update the existing block with the relevant monitor information.
    const existingMonitorBlock = runtime.monitorBlocks._blocks[monitorData.id];
    if (existingMonitorBlock) {
        // A monitor block already exists if the toolbox has been loaded and
        // the monitor block is not target specific (because the block gets recycled).
        existingMonitorBlock.isMonitored = monitorData.visible;
        existingMonitorBlock.targetId = monitorData.targetId;
    } else {
        // If a monitor block doesn't already exist for this monitor,
        // construct a monitor block to add to the monitor blocks container
        const monitorBlock = {
            id: monitorData.id,
            opcode: monitorData.opcode,
            inputs: {}, // Assuming that monitor blocks don't have droppable fields
            fields: fields,
            topLevel: true,
            next: null,
            parent: null,
            shadow: false,
            x: 0,
            y: 0,
            isMonitored: monitorData.visible,
            targetId: monitorData.targetId
        };

        // Variables and lists have additional properties
        // stored in their fields, update this info in the
        // monitor block fields
        if (monitorData.opcode === 'data_variable') {
            const field = monitorBlock.fields.VARIABLE;
            field.id = monitorData.id;
            field.variableType = Variable.SCALAR_TYPE;
        } else if (monitorData.opcode === 'data_listcontents') {
            const field = monitorBlock.fields.LIST;
            field.id = monitorData.id;
            field.variableType = Variable.LIST_TYPE;
        } else if (monitorData.variableId) {
            const field = Object.values(monitorBlock.fields)[0];
            field.id = monitorData.variableId;
            field.variableType = monitorData.variableType;
        }

        runtime.monitorBlocks.createBlock(monitorBlock);
    }

    runtime.requestAddMonitor(MonitorRecord(monitorData));
};

// Replace variable IDs throughout the project with
// xml-safe versions.
// This is to fix up projects imported from 2.0 where xml-unsafe names
// were getting added to the variable ids.
const replaceUnsafeCharsInVariableIds = function (targets) {
    const allVarRefs = VariableUtil.getAllVarRefsForTargets(targets, true);
    // Re-id the variables in the actual targets
    targets.forEach(t => {
        Object.keys(t.variables).forEach(id => {
            const newId = StringUtil.replaceUnsafeChars(id);
            if (newId === id) return;
            t.variables[id].id = newId;
            t.variables[newId] = t.variables[id];
            delete t.variables[id];
        });
    });

    // Replace the IDs in the blocks refrencing variables or lists
    for (const id in allVarRefs) {
        const newId = StringUtil.replaceUnsafeChars(id);
        if (id === newId) continue; // ID was already safe, skip
        // We're calling this on the stage target because we need a
        // target to call on but this shouldn't matter because we're passing
        // in all the varRefs we want to operate on
        VariableUtil.updateVariableIdentifiers(allVarRefs[id], newId);
    }
    return targets;
};

/**
 * Deserialize the specified representation of a VM runtime and loads it into the provided runtime instance.
 * @param  {object} json - JSON representation of a VM runtime.
 * @param  {Runtime} runtime - Runtime instance
 * @param {JSZip} zip - Sb3 file describing this project (to load assets from)
 * @param {boolean} isSingleSprite - If true treat as single sprite, else treat as whole project
 * @returns {Promise.<ImportedProject>} Promise that resolves to the list of targets after the project is deserialized
 */
const deserialize = function (json, runtime, zip, isSingleSprite) {
    const extensionPatcher = new OldExtensions(runtime);
    extensionPatcher.registerExtensions(ExtensionPatches);
    const extensions = {
        extensionIDs: new Set(json.extensions),
        extensionURLs: new Map(),
        extensionData: {},
        patcher: extensionPatcher
    };

    // Store the origin field (e.g. project originated at CSFirst) so that we can save it again.
    if (json.meta) {
        if (json.meta.origin) runtime.origin = json.meta.origin;
        else if (json.meta.platform) runtime.origin = json.meta.platform.name;
        else runtime.origin = null;
    } else {
        runtime.origin = null;
    }

    // Extract custom extension IDs, if they exist.
    if (json.extensionURLs) {
        extensions.extensionURLs = new Map(Object.entries(json.extensionURLs));
    }
    if (json.extensionData || json.extensionStorage) {
        extensions.extensionData = Object.assign(json.extensionStorage ?? {}, json.extensionData);
        // We're prioritizing the keys in extensionData over the ones in extensionStorage
    }

    // Extract any custom fonts before loading costumes.
    let fontPromise;
    if (json.customFonts) {
        fontPromise = runtime.fontManager.deserialize(json.customFonts, zip, isSingleSprite);
    } else {
        fontPromise = Promise.resolve();
    }

    // First keep track of the current target order in the json,
    // then sort by the layer order property before parsing the targets
    // so that their corresponding render drawables can be created in
    // their layer order (e.g. back to front)
    const targetObjects = ((isSingleSprite ? [json] : json.targets) || [])
        .map((t, i) => Object.assign(t, {targetPaneOrder: i}))
        .sort((a, b) => a.layerOrder - b.layerOrder);

    const monitorObjects = json.monitors || [];

    return fontPromise.then(() => targetObjects.map(target => parseScratchAssets(target, runtime, zip)))
        // Force this promise to wait for the next loop in the js tick. Let
        // storage have some time to send off asset requests.
        .then(assets => Promise.resolve(assets))
        .then(assets => Promise.all(targetObjects.map((target, index) =>
            parseScratchObject(
                target, runtime, extensions, zip, assets[index], isSingleSprite
            ))
        ))
        .then(targets => targets // Re-sort targets back into original sprite-pane ordering
            .map((t, i) => {
                // Add layer order property to deserialized targets.
                // This property is used to initialize executable targets in
                // the correct order and is deleted in VM's installTargets function
                t.layerOrder = i;
                return t;
            })
            .sort((a, b) => a.targetPaneOrder - b.targetPaneOrder)
            .map(t => {
                // Delete the temporary properties used for
                // sprite pane ordering and stage layer ordering
                delete t.targetPaneOrder;
                return t;
            }))
        .then(targets => replaceUnsafeCharsInVariableIds(targets))
        .then(targets => {
            // all blocks have been created, its safe to reset the origin from Turbowarp
            if (runtime.origin === 'TurboWarp') runtime.origin = null;

            // at this point, stage size has not been set by 'runtime.parseProjectOptions'
            const stage = targets.find(t => t.isStage);
            if (stage) {
                // vm is not ready yet, so remake 'runtime.findProjectOptionsComment'
                let projectOptsComment;
                for (const comment of Object.values(stage?.comments)) {
                    if (comment.text.includes(" // _twconfig_")) {
                        projectOptsComment = comment;
                        break;
                    }
                }

                if (projectOptsComment) runtime.parseProjectOptions(projectOptsComment);
            }

            monitorObjects.map(monitorDesc => deserializeMonitor(monitorDesc, runtime, targets, extensions));
            return targets;
        })
        .then(targets => ({
            targets,
            extensions
        }));
};

module.exports = {
    serialize: serialize,
    deserialize: deserialize,
    deserializeBlocks: deserializeBlocks,
    serializeBlocks: serializeBlocks,
    deserializeStandaloneBlocks: deserializeStandaloneBlocks,
    serializeStandaloneBlocks: serializeStandaloneBlocks,
    getExtensionIdForOpcode: getExtensionIdForOpcode
};
