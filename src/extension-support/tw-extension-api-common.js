const ArgumentType = require('./argument-type');
const ArgumentAlignment = require('./argument-alignment');
const BlockType = require('./block-type');
const BlockShape = require('./block-shape');
const NotchShape = require('./notch-shape');
const TargetType = require('./target-type');
const Cast = require('../util/cast');
const Clone = require('../util/clone');
const Color = require('../util/color');

const Scratch = {
    ArgumentType,
    ArgumentAlignment,
    BlockType,
    BlockShape,
    NotchShape,
    TargetType,
    Cast,
    Clone,
    Color
};

module.exports = Scratch;
