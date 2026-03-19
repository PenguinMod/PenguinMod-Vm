/* eslint-disable max-len */
const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const TargetType = require('../../extension-support/target-type');
const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const Color = require('../../util/color');
const { translateForCamera } = require('../../util/pos-math');
const formatMessage = require('format-message');
const MathUtil = require('../../util/math-util');
const log = require('../../util/log');
const StageLayering = require('../../engine/stage-layering');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+cGVuLWljb248L3RpdGxlPjxnIHN0cm9rZT0iIzU3NUU3NSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik04Ljc1MyAzNC42MDJsLTQuMjUgMS43OCAxLjc4My00LjIzN2MxLjIxOC0yLjg5MiAyLjkwNy01LjQyMyA1LjAzLTcuNTM4TDMxLjA2NiA0LjkzYy44NDYtLjg0MiAyLjY1LS40MSA0LjAzMi45NjcgMS4zOCAxLjM3NSAxLjgxNiAzLjE3My45NyA0LjAxNUwxNi4zMTggMjkuNTljLTIuMTIzIDIuMTE2LTQuNjY0IDMuOC03LjU2NSA1LjAxMiIgZmlsbD0iI0ZGRiIvPjxwYXRoIGQ9Ik0yOS40MSA2LjExcy00LjQ1LTIuMzc4LTguMjAyIDUuNzcyYy0xLjczNCAzLjc2Ni00LjM1IDEuNTQ2LTQuMzUgMS41NDYiLz48cGF0aCBkPSJNMzYuNDIgOC44MjVjMCAuNDYzLS4xNC44NzMtLjQzMiAxLjE2NGwtOS4zMzUgOS4zYy4yODItLjI5LjQxLS42NjguNDEtMS4xMiAwLS44NzQtLjUwNy0xLjk2My0xLjQwNi0yLjg2OC0xLjM2Mi0xLjM1OC0zLjE0Ny0xLjgtNC4wMDItLjk5TDMwLjk5IDUuMDFjLjg0NC0uODQgMi42NS0uNDEgNC4wMzUuOTYuODk4LjkwNCAxLjM5NiAxLjk4MiAxLjM5NiAyLjg1NU0xMC41MTUgMzMuNzc0Yy0uNTczLjMwMi0xLjE1Ny41Ny0xLjc2NC44M0w0LjUgMzYuMzgybDEuNzg2LTQuMjM1Yy4yNTgtLjYwNC41My0xLjE4Ni44MzMtMS43NTcuNjkuMTgzIDEuNDQ4LjYyNSAyLjEwOCAxLjI4Mi42Ni42NTggMS4xMDIgMS40MTIgMS4yODcgMi4xMDIiIGZpbGw9IiM0Qzk3RkYiLz48cGF0aCBkPSJNMzYuNDk4IDguNzQ4YzAgLjQ2NC0uMTQuODc0LS40MzMgMS4xNjVsLTE5Ljc0MiAxOS42OGMtMi4xMyAyLjExLTQuNjczIDMuNzkzLTcuNTcyIDUuMDFMNC41IDM2LjM4bC45NzQtMi4zMTYgMS45MjUtLjgwOGMyLjg5OC0xLjIxOCA1LjQ0LTIuOSA3LjU3LTUuMDFsMTkuNzQzLTE5LjY4Yy4yOTItLjI5Mi40MzItLjcwMi40MzItMS4xNjUgMC0uNjQ2LS4yNy0xLjQtLjc4LTIuMTIyLjI1LjE3Mi41LjM3Ny43MzcuNjE0Ljg5OC45MDUgMS4zOTYgMS45ODMgMS4zOTYgMi44NTYiIGZpbGw9IiM1NzVFNzUiIG9wYWNpdHk9Ii4xNSIvPjxwYXRoIGQ9Ik0xOC40NSAxMi44M2MwIC41LS40MDQuOTA1LS45MDQuOTA1cy0uOTA1LS40MDUtLjkwNS0uOTA0YzAtLjUuNDA3LS45MDMuOTA2LS45MDMuNSAwIC45MDQuNDA0LjkwNC45MDR6IiBmaWxsPSIjNTc1RTc1Ii8+PC9nPjwvc3ZnPg==';

// aka nothing because every image is way too big just like your mother
const DefaultDrawImage = 'data:image/png;base64,'; 

const SANS_SERIF_ID = 'Sans Serif';
const SERIF_ID = 'Serif';
const HANDWRITING_ID = 'Handwriting';
const MARKER_ID = 'Marker';
const CURLY_ID = 'Curly';
const PIXEL_ID = 'Pixel';

/* PenguinMod Fonts */
const PLAYFUL_ID = 'Playful';
const BUBBLY_ID = 'Bubbly';
const BITSANDBYTES_ID = 'Bits and Bytes';
const TECHNOLOGICAL_ID = 'Technological';
const ARCADE_ID = 'Arcade';
const ARCHIVO_ID = 'Archivo';
const ARCHIVOBLACK_ID = 'Archivo Black';
const SCRATCH_ID = 'Scratch';

const RANDOM_ID = 'Random';

/**
 * Enum for pen color parameter values.
 * @readonly
 * @enum {string}
 */
const ColorParam = {
    COLOR: 'color',
    SATURATION: 'saturation',
    BRIGHTNESS: 'brightness',
    TRANSPARENCY: 'transparency'
};

/**
 * Enum for layer parameter values.
 * @readonly
 * @enum {string}
 */
const LayerParam = {
    FRONT: 'front',
    BACK: 'back'
};

const ItalicsParam = {
    ON: 'on',
    OFF: 'off'
};

/**
 * Enum for layer parameter values.
 * @readonly
 * @enum {string}
 */
const LayerNames = {
    'front': StageLayering.PEN_LAYER,
    'back': StageLayering.SPRITE_LAYER
};

const parseArray = string => {
    let array;
    try {
        array = JSON.parse(string);
    } catch {
        array = [];
    }
    if (!Array.isArray(array)) return [];
    return array;
};

/**
 * @typedef {object} PenState - the pen state associated with a particular target.
 * @property {Boolean} penDown - tracks whether the pen should draw for this target.
 * @property {number} color - the current color (hue) of the pen.
 * @property {PenAttributes} penAttributes - cached pen attributes for the renderer. This is the authoritative value for
 *   diameter but not for pen color.
 */

/**
 * Host for the Pen-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3PenBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The ID of the renderer Drawable corresponding to the pen layer.
         * @type {int}
         * @private
         */
        this._penDrawableId = -1;

        /**
         * The ID of the renderer Skin corresponding to the pen layer.
         * @type {int}
         * @private
         */
        this._penSkinId = -1;

        /**
         * The attribute of print text.
         * @type {object}
         */
        this.printTextAttribute = {
            weight: '400',
            italic: false,
            size: '28',
            font: 'Arial',
            color: '#000000',
            strokeColor: '#000000',
            strokeWidth: 0
        };

        this._onTargetCreated = this._onTargetCreated.bind(this);
        this._onTargetMoved = this._onTargetMoved.bind(this);
        this._onCameraMoved = this._onCameraMoved.bind(this);

        runtime.on('targetWasCreated', this._onTargetCreated);
        runtime.on('RUNTIME_DISPOSED', this.clear.bind(this));
        // runtime.on('CAMERA_CHANGED', this._onCameraMoved);

        this.preloadedImages = {};

        this.cameraBound = -1;
    }

    /**
     * The default pen state, to be used when a target has no existing pen state.
     * @type {PenState}
     */
    static get DEFAULT_PEN_STATE () {
        return {
            penDown: false,
            color: 66.66,
            saturation: 100,
            brightness: 100,
            transparency: 0,
            _shade: 50, // Used only for legacy `change shade by` blocks
            penAttributes: {
                color4f: [0, 0, 1, 1],
                diameter: 1
            }
        };
    }


    /**
     * The minimum and maximum allowed pen size.
     * The maximum is twice the diagonal of the stage, so that even an
     * off-stage sprite can fill it.
     * @type {{min: number, max: number}}
     */
    static get PEN_SIZE_RANGE () {
        return { min: 1, max: 1e308 };
    }

    /**
     * The key to load & store a target's pen-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        // tw: We've hardcoded this value in various places for slight performance gains
        // Make sure to update those if this changes.
        return 'Scratch.pen';
    }

    /**
     * Clamp a pen size value to the range allowed by the pen.
     * @param {number} requestedSize - the requested pen size.
     * @returns {number} the clamped size.
     * @private
     */
    _clampPenSize (requestedSize) {
        if (
            (this.runtime.renderer && this.runtime.renderer.useHighQualityRender) ||
            !this.runtime.runtimeOptions.miscLimits
        ) {
            return Math.max(0, requestedSize);
        }
        return MathUtil.clamp(
            requestedSize,
            Scratch3PenBlocks.PEN_SIZE_RANGE.min,
            Scratch3PenBlocks.PEN_SIZE_RANGE.max
        );
    }

    /**
     * Retrieve the ID of the renderer "Skin" corresponding to the pen layer. If
     * the pen Skin doesn't yet exist, create it.
     * @returns {int} the Skin ID of the pen layer, or -1 on failure.
     * @private
     */
    _getPenLayerID () {
        const renderer = this.runtime.renderer;
        if (this._penSkinId < 0 && renderer) {
            this._penSkinId = renderer.createPenSkin();
            this._penDrawableId = renderer.createDrawable(StageLayering.PEN_LAYER);
            if (renderer.markDrawableAsNoninteractive) {
                renderer.markDrawableAsNoninteractive(this._penDrawableId);
            }
            renderer.updateDrawableSkinId(this._penDrawableId, this._penSkinId);

            this.bitmapCanvas = document.createElement('canvas');
            this.bitmapCanvas.width = this.runtime.stageWidth;
            this.bitmapCanvas.height = this.runtime.stageHeight;
            this.bitmapSkinID = renderer.createBitmapSkin(this.bitmapCanvas, 1);
            this.bitmapDrawableID = renderer.createDrawable(StageLayering.PEN_LAYER);
            renderer.updateDrawableSkinId(this.bitmapDrawableID, this.bitmapSkinID);
            renderer.updateDrawableVisible(this.bitmapDrawableID, false);
        }
        return this._penSkinId;
    }

    /**
     * @param {Target} target - collect pen state for this target. Probably, but not necessarily, a RenderedTarget.
     * @returns {PenState} the mutable pen state associated with that target. This will be created if necessary.
     * @private
     */
    _getPenState (target) {
        let penState = target._customState['Scratch.pen'];
        if (!penState) {
            penState = Clone.simple(Scratch3PenBlocks.DEFAULT_PEN_STATE);
            target.setCustomState(Scratch3PenBlocks.STATE_KEY, penState);
        }
        return penState;
    }

    /**
     * When a pen-using Target is cloned, clone the pen state.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @listens Runtime#event:targetWasCreated
     * @private
     */
    _onTargetCreated (newTarget, sourceTarget) {
        if (sourceTarget) {
            const penState = sourceTarget.getCustomState(Scratch3PenBlocks.STATE_KEY);
            if (penState) {
                newTarget.setCustomState(Scratch3PenBlocks.STATE_KEY, Clone.simple(penState));
                if (penState.penDown) {
                    newTarget.onTargetMoved = this._onTargetMoved;
                }
            }
        }
    }

    /**
     * Handle a target which has moved. This only fires when the pen is down.
     * @param {RenderedTarget} target - the target which has moved.
     * @param {number} oldX - the previous X position.
     * @param {number} oldY - the previous Y position.
     * @param {boolean} isForce - whether the movement was forced.
     * @private
     */
    _onTargetMoved (target, oldX, oldY, isForce) {
        // Only move the pen if the movement isn't forced (ie. dragged).
        if (!isForce) {
            const penSkinId = this._getPenLayerID();
            if (penSkinId >= 0) {
                const penState = this._getPenState(target);
                // find the rendered possition of the sprite rather then the true possition of the sprite
                const [newX, newY] = target._translatePossitionToCamera();
                if (target.cameraBound >= 0) {
                    [oldX, oldY] = translateForCamera(this.runtime, target.cameraBound, oldX, oldY);
                }
                this.runtime.renderer.penLine(penSkinId, penState.penAttributes, oldX, oldY, newX, newY);
                this.runtime.requestRedraw();
            }
        }
    }

    _onCameraMoved(screen) {
        if (screen !== this.cameraBound) return;
        const cameraState = this.runtime.cameraStates[screen];
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penTranslate(penSkinId, ...cameraState.pos, cameraState.scale, cameraState.dir);
        }
        this.runtime.requestRedraw();
    }

    bindToCamera(screen) {
        this.cameraBound = screen;
        this._onCameraMoved();
    }

    removeCameraBinding() {
        this.cameraBound = -1;
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penTranslate(penSkinId, 0, 0, 1, 0);
        }
    }

    /**
     * Convert a Scratch RGB(A) color object to a canvas color string.
     * If rgb.a exists use it
     * otherwise fall back to current pen transparency
     * @param {object} rgb
     * @param {Target} [target]
     * @returns {string}
     * @private
     */
    _toCanvasColor (rgb, target) {
        let alpha;

        if (Object.prototype.hasOwnProperty.call(rgb, 'a')) {
            alpha = rgb.a / 255;
        } else if (target) {
            const penState = this._getPenState(target);
            alpha = this._transparencyToAlpha(penState.transparency);
        } else {
            alpha = 1;
        }

        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Wrap a color input into the range (0,100).
     * @param {number} value - the value to be wrapped.
     * @returns {number} the wrapped value.
     * @private
     */
    _wrapColor (value) {
        return MathUtil.wrapClamp(value, 0, 100);
    }

    /**
     * Initialize color parameters menu with localized strings
     * @returns {array} of the localized text and values for each menu element
     * @private
     */
    _initColorParam () {
        return [
            {
                text: formatMessage({
                    id: 'pen.colorMenu.color',
                    default: 'color',
                    description: 'label for color element in color picker for pen extension'
                }),
                value: ColorParam.COLOR
            },
            {
                text: formatMessage({
                    id: 'pen.colorMenu.saturation',
                    default: 'saturation',
                    description: 'label for saturation element in color picker for pen extension'
                }),
                value: ColorParam.SATURATION
            },
            {
                text: formatMessage({
                    id: 'pen.colorMenu.brightness',
                    default: 'brightness',
                    description: 'label for brightness element in color picker for pen extension'
                }),
                value: ColorParam.BRIGHTNESS
            },
            {
                text: formatMessage({
                    id: 'pen.colorMenu.transparency',
                    default: 'transparency',
                    description: 'label for transparency element in color picker for pen extension'
                }),
                value: ColorParam.TRANSPARENCY

            }
        ];
    }

    getLayerParam () {
        return [
            {
                text: formatMessage({
                    id: 'pen.layerMenu.front',
                    default: 'front',
                    description: 'label for front'
                }),
                value: LayerParam.FRONT
            },
            {
                text: formatMessage({
                    id: 'pen.layerMenu.back',
                    default: 'back',
                    description: 'label for back'
                }),
                value: LayerParam.BACK
            }
        ];
    }
    
    getItalicsToggleParam () {
        return [
            {
                text: formatMessage({
                    id: 'pen.italicsToggle.on',
                    default: 'on',
                    description: 'label for on'
                }),
                value: ItalicsParam.ON
            },
            {
                text: formatMessage({
                    id: 'pen.italicsToggle.off',
                    default: 'off',
                    description: 'label for off'
                }),
                value: ItalicsParam.OFF
            }
        ];
    }

    /**
     * Clamp a pen color parameter to the range (0,100).
     * @param {number} value - the value to be clamped.
     * @returns {number} the clamped value.
     * @private
     */
    _clampColorParam (value) {
        return MathUtil.clamp(value, 0, 100);
    }

    /**
     * Convert an alpha value to a pen transparency value.
     * Alpha ranges from 0 to 1, where 0 is transparent and 1 is opaque.
     * Transparency ranges from 0 to 100, where 0 is opaque and 100 is transparent.
     * @param {number} alpha - the input alpha value.
     * @returns {number} the transparency value.
     * @private
     */
    _alphaToTransparency (alpha) {
        return (1.0 - alpha) * 100.0;
    }

    /**
     * Convert a pen transparency value to an alpha value.
     * Alpha ranges from 0 to 1, where 0 is transparent and 1 is opaque.
     * Transparency ranges from 0 to 100, where 0 is opaque and 100 is transparent.
     * @param {number} transparency - the input transparency value.
     * @returns {number} the alpha value.
     * @private
     */
    _transparencyToAlpha (transparency) {
        return 1.0 - (transparency / 100.0);
    }

    _getFonts() {
        return [{
            text: 'Sans Serif',
            value: SANS_SERIF_ID
        }, {
            text: 'Serif',
            value: SERIF_ID
        }, {
            text: 'Handwriting',
            value: HANDWRITING_ID
        }, {
            text: 'Marker',
            value: MARKER_ID
        }, {
            text: 'Curly',
            value: CURLY_ID
        }, {
            text: 'Pixel',
            value: PIXEL_ID
        }, {
            text: 'Playful',
            value: PLAYFUL_ID
        }, {
            text: 'Bubbly',
            value: BUBBLY_ID
        }, {
            text: 'Arcade',
            value: ARCADE_ID
        }, {
            text: 'Bits and Bytes',
            value: BITSANDBYTES_ID
        }, {
            text: 'Technological',
            value: TECHNOLOGICAL_ID
        }, {
            text: 'Scratch',
            value: SCRATCH_ID
        }, {
            text: 'Archivo',
            value: ARCHIVO_ID
        }, {
            text: 'Archivo Black',
            value: ARCHIVOBLACK_ID
        },
        ...this.runtime.fontManager.getFonts().map(i => ({
            text: i.name,
            value: i.family
        })),
        {
            text: 'random font',
            value: RANDOM_ID
        }];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'pen',
            name: formatMessage({
                id: 'pen.categoryName',
                default: 'Pen',
                description: 'Label for the pen extension category'
            }),
            blockIconURI: blockIconURI,
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: formatMessage({
                        id: 'pm.pen.stageSelected',
                        default: 'Stage selected: less pen blocks',
                        description: 'Label that appears in the Pen category when the stage is selected'
                    }),
                    filter: [TargetType.STAGE]
                },
                {
                    opcode: 'clear',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.clear',
                        default: 'erase all',
                        description: 'erase all pen trails and stamps'
                    })
                },
                {
                    opcode: 'stamp',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.stamp',
                        default: 'stamp',
                        description: 'render current costume on the background'
                    }),
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'penDown',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.penDown',
                        default: 'pen down',
                        description: 'start leaving a trail when the sprite moves'
                    }),
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'penUp',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.penUp',
                        default: 'pen up',
                        description: 'stop leaving a trail behind the sprite'
                    }),
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setPenColorToColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setColor',
                        default: 'set pen color to [COLOR]',
                        description: 'set the pen color to a particular (RGB) value'
                    }),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'changePenColorParamBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.changeColorParam',
                        default: 'change pen [COLOR_PARAM] by [VALUE]',
                        description: 'change the state of a pen color parameter'
                    }),
                    arguments: {
                        COLOR_PARAM: {
                            type: ArgumentType.STRING,
                            menu: 'colorParam',
                            defaultValue: ColorParam.COLOR
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setPenColorParamTo',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setColorParam',
                        default: 'set pen [COLOR_PARAM] to [VALUE]',
                        description: 'set the state for a pen color parameter e.g. saturation'
                    }),
                    arguments: {
                        COLOR_PARAM: {
                            type: ArgumentType.STRING,
                            menu: 'colorParam',
                            defaultValue: ColorParam.COLOR
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'changePenSizeBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.changeSize',
                        default: 'change pen size by [SIZE]',
                        description: 'change the diameter of the trail left by a sprite'
                    }),
                    arguments: {
                        SIZE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setPenSizeTo',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setSize',
                        default: 'set pen size to [SIZE]',
                        description: 'set the diameter of a trail left by a sprite'
                    }),
                    arguments: {
                        SIZE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'drawRect',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.drawRect',
                        default: 'use [COLOR] to draw a square on x:[X] y:[Y] width:[WIDTH] height:[HEIGHT]',
                        description: 'draw a square'
                    }),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 10
                        }
                    }
                },
                {
                    opcode: 'drawArrayComplexShape',
                    blockType: BlockType.COMMAND,
                    text: 'draw polygon from points [SHAPE] with fill [COLOR]',
                    arguments: {
                        SHAPE: {
                            type: ArgumentType.STRING,
                            defaultValue: '[-20, 20, 20, 20, 0, -20]'
                        },
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    },
                    hideFromPalette: false
                },
                "---",
                {
                    opcode: 'preloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'preload image [URI] as [NAME]',
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            defaultValue: DefaultDrawImage
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "preloaded image"
                        }
                    }
                },
                {
                    opcode: 'unloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'unload image [NAME]',
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "preloaded image"
                        }
                    }
                },
                {
                    opcode: 'drawUriImage',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.drawUriImage',
                        default: 'draw image [URI] at x:[X] y:[Y]',
                        description: 'draw image'
                    }),
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'drawUriImageWHR',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.drawUriImageWHR',
                        default: 'draw image [URI] at x:[X] y:[Y] width:[WIDTH] height:[HEIGHT] pointed at: [ROTATE]',
                        description: 'draw image width height rotation'
                    }),
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        ROTATE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: 'drawUriImageWHCX1Y1X2Y2R',
                    blockType: BlockType.COMMAND,
                    text: 'draw image [URI] at x:[X] y:[Y] width:[WIDTH] height:[HEIGHT] cropping from x:[CROPX] y:[CROPY] width:[CROPW] height:[CROPH] pointed at: [ROTATE]',
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            defaultValue: DefaultDrawImage
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        HEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 64
                        },
                        CROPX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        CROPY: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        CROPW: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        CROPH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        ROTATE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                "---",
                {
                    opcode: 'printText',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.printText',
                        default: 'print [TEXT] on x:[X] y:[Y]',
                        description: 'print text'
                    }),
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Foobars are yummy'
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'setPrintFont',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFont',
                        default: 'set print font to [FONT]',
                        description: 'set print font'
                    }),
                    arguments: {
                        FONT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Arial',
                            menu: 'FONT'
                        }
                    }
                },
                {
                    opcode: 'setPrintFontSize',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontSize',
                        default: 'set print font size to [SIZE]',
                        description: 'set print font size'
                    }),
                    arguments: {
                        SIZE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 24
                        }
                    }
                },
                {
                    opcode: 'setPrintFontColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontColor',
                        default: 'set print font color to [COLOR]',
                        description: 'set print font color'
                    }),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    }
                },
                {
                    opcode: 'setPrintFontStrokeColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontStrokeColor',
                        default: 'set print stroke color to [COLOR]',
                        description: 'set print stroke color'
                    }),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    }
                },
                {
                    opcode: 'setPrintFontStrokeWidth',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontStrokeWidth',
                        default: 'set print stroke width to [WIDTH]',
                        description: 'set print stroke width'
                    }),
                    arguments: {
                        WIDTH: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'setPrintFontWeight',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontWeight',
                        default: 'set print font weight to [WEIGHT]',
                        description: 'set print font weight'
                    }),
                    arguments: {
                        WEIGHT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 700
                        }
                    }
                },
                {
                    opcode: 'setPrintFontItalics',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setPrintFontItalics',
                        default: 'turn print font italics [OPTION]',
                        description: 'toggle print font italics'
                    }),
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'italicsToggleParam',
                            defaultValue: ItalicsParam.ON
                        }
                    }
                },
                /* Legacy blocks, should not be shown in flyout */
                {
                    opcode: 'drawComplexShape',
                    blockType: BlockType.COMMAND,
                    text: 'draw triangle [SHAPE] with fill [COLOR]',
                    arguments: {
                        SHAPE: {
                            type: ArgumentType.POLYGON,
                            nodes: 3
                        },
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'draw4SidedComplexShape',
                    blockType: BlockType.COMMAND,
                    text: 'draw quadrilateral [SHAPE] with fill [COLOR]',
                    arguments: {
                        SHAPE: {
                            type: ArgumentType.POLYGON,
                            nodes: 4
                        },
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'setPenShadeToNumber',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setShade',
                        default: 'LEGACY - set pen shade to [SHADE]',
                        description: 'legacy pen blocks - set pen shade'
                    }),
                    arguments: {
                        SHADE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'changePenShadeBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.changeShade',
                        default: 'LEGACY - change pen shade by [SHADE]',
                        description: 'legacy pen blocks - change pen shade'
                    }),
                    arguments: {
                        SHADE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'setPenHueToNumber',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.setHue',
                        default: 'LEGACY - set pen color to [HUE]',
                        description: 'legacy pen blocks - set pen color to number'
                    }),
                    arguments: {
                        HUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'changePenHueBy',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pen.changeHue',
                        default: 'LEGACY - change pen color by [HUE]',
                        description: 'legacy pen blocks - change pen color'
                    }),
                    arguments: {
                        HUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    hideFromPalette: true
                },
                {
                    opcode: 'goPenLayer',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'pen.GoPenLayer',
                        default: 'go to [OPTION] layer',
                        description: 'go to front layer(pen)'
                    }),
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'layerParam',
                            defaultValue: LayerParam.FRONT
                        }
                    }
                }
            ],
            menus: {
                colorParam: {
                    acceptReporters: true,
                    items: this._initColorParam()
                },
                layerParam: {
                    acceptReporters: false,
                    items: this.getLayerParam()
                },
                italicsToggleParam: {
                    acceptReporters: false,
                    items: this.getItalicsToggleParam()
                },
                FONT: {
                    items: '_getFonts',
                    isTypeable: true
                }
            }
        };
    }

    /**
     * The pen "clear" block clears the pen layer's contents.
     */
    clear () { // used by compiler
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penClear(penSkinId);
            this.runtime.requestRedraw();
        }
    }

    setPrintFont (args) {
        this.printTextAttribute.font = args.FONT;
    }
    setPrintFontSize (args) {
        this.printTextAttribute.size = args.SIZE;
    }
    setPrintFontColor (args, util) {
        const rgb = Cast.toRgbColorObject(args.COLOR);
        this.printTextAttribute.color = this._toCanvasColor(rgb, util.target);
    }
    setPrintFontStrokeColor (args, util) {
        const rgb = Cast.toRgbColorObject(args.COLOR);
        this.printTextAttribute.strokeColor = this._toCanvasColor(rgb, util.target);
    }
    setPrintFontStrokeWidth (args) {
        this.printTextAttribute.strokeWidth = args.WIDTH;
    }
    setPrintFontWeight (args) {
        this.printTextAttribute.weight = args.WEIGHT;
    }
    setPrintFontItalics (args) {
        this.printTextAttribute.italic = args.OPTION === ItalicsParam.ON;
    }
    printText (args) {
        const ctx = this._getBitmapCanvas();

        let resultFont = '';
        resultFont += `${this.printTextAttribute.italic ? 'italic ' : ''}`;
        resultFont += `${this.printTextAttribute.weight} `;
        resultFont += `${this.printTextAttribute.size}px `;
        resultFont += this.printTextAttribute.font;
        ctx.font = resultFont;

        ctx.strokeStyle = this.printTextAttribute.strokeWidth > 0 ? this.printTextAttribute.strokeColor : this.printTextAttribute.color;
        ctx.lineWidth = this.printTextAttribute.strokeWidth;
        ctx.fillStyle = this.printTextAttribute.color;

        if (this.printTextAttribute.strokeWidth > 0) ctx.strokeText(args.TEXT, args.X, -args.Y);
        ctx.fillText(args.TEXT, args.X, -args.Y);

        this._drawContextToPen(ctx);
    }

    async _drawUriImage({URI, X, Y, WIDTH, HEIGHT, ROTATE, CROPX, CROPY, CROPW, CROPH}) {
        const image = this.preloadedImages[URI] ?? await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = err => {
                console.error('failed to load', URI, err);
                reject('Image failed to load');
            };
            image.src = URI;
        });

        // protect the user from uninteligable errors that may be thrown but probably never will
        if (!image.complete) throw new Error('the provided image never loaded');
        if (image.width <= 0) throw new Error(`the image has an invalid width of ${image.width}`);
        if (image.height <= 0) throw new Error(`the image has an invalid height of ${image.height}`);
        
        const ctx = this._getBitmapCanvas();
        // an error that really should never happen, but also shouldnt ever get to the user through here
        if (ctx.canvas.width <= 0 && ctx.canvas.height <= 0) return;
        
        ctx.rotate(MathUtil.degToRad(ROTATE - 90));

        // use sizes from the image if none specified
        const width = WIDTH ?? image.width;
        const height = HEIGHT ?? image.height;
        const realX = X - (width / 2);
        const realY = -Y - (height / 2);
        const drawArgs = [CROPX, CROPY, CROPW, CROPH, realX, realY, width, height];

        // ensure that all of the drop values exist, just in case :Trollhans
        if (!(typeof CROPX === "number" && typeof CROPY === "number" && CROPH && CROPH)) {
            drawArgs.splice(0, 4);
        }

        ctx.drawImage(image, ...drawArgs);
        this._drawContextToPen(ctx);
    }

    // todo: should these be merged into their own function? they all have the same code...
    drawUriImage (args) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args);
        if (!preloaded) {
            return possiblePromise;
        }
    }
    drawUriImageWHR (args) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args);
        if (!preloaded) {
            return possiblePromise;
        }
    }
    drawUriImageWHCX1Y1X2Y2R (args) {
        const preloaded = this.preloadedImages[args.URI];
        const possiblePromise = this._drawUriImage(args);
        if (!preloaded) {
            return possiblePromise;
        }
    }

    preloadUriImage ({ URI, NAME }) {
        return new Promise(resolve => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                this.preloadedImages[Cast.toString(NAME)] = image;
                resolve();
            };
            image.onerror = resolve; // ignore loading errors lol!
            image.src = Cast.toString(URI);
        });
    }
    unloadUriImage ({ NAME }) {
        const name = Cast.toString(NAME);
        if (this.preloadedImages.hasOwnProperty(name)) {
            this.preloadedImages[name].remove();
            delete this.preloadedImages[name];
        }
    }

    drawRect (args, util) {
        const ctx = this._getBitmapCanvas();

        const rgb = Cast.toRgbColorObject(args.COLOR);
        const color = this._toCanvasColor(rgb, util.target);

        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        ctx.fillRect(args.X, -args.Y, args.WIDTH, args.HEIGHT);

        this._drawContextToPen(ctx);
    }

    _drawContextToPen (ctx) {
        const penSkinId = this._getPenLayerID();
        const width = this.bitmapCanvas.width;
        const height = this.bitmapCanvas.height;
        ctx.restore();

        const printSkin = this.runtime.renderer._allSkins[this.bitmapSkinID];
        const imageData = ctx.getImageData(0, 0, width, height);
        printSkin._setTexture(imageData);
        this.runtime.renderer.penStamp(penSkinId, this.bitmapDrawableID);

        this.runtime.requestRedraw();
    }

    _getBitmapCanvas () {
        const penSkinId = this._getPenLayerID();
        const penSkin = this.runtime.renderer._allSkins[penSkinId];
        const width = penSkin._size[0];
        const height = penSkin._size[1];
        this.bitmapCanvas.width = width;
        this.bitmapCanvas.height = height;

        const ctx = this.bitmapCanvas.getContext('2d');

        ctx.clearRect(0, 0, width, height);
        ctx.translate(width / 2, height / 2);
        // console.log(penSkin.renderQuality, this.bitmapCanvas.width, this.bitmapCanvas.height);
        ctx.scale(penSkin.renderQuality, penSkin.renderQuality);
        return ctx;
    }

    /**
     * The pen "stamp" block stamps the current drawable's image onto the pen layer.
     * @param {object} args - the block arguments.
     * @param {object} util - utility object provided by the runtime.
     */
    stamp (args, util) {
        this._stamp(util.target);
    }
    _stamp (target) { // used by compiler
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penStamp(penSkinId, target.drawableID);
            this.runtime.requestRedraw();
        }
    }

    /**
     * The pen "pen down" block causes the target to leave pen trails on future motion.
     * @param {object} args - the block arguments.
     * @param {object} util - utility object provided by the runtime.
     */
    penDown (args, util) {
        this._penDown(util.target);
    }
    _penDown (target) { // used by compiler
        const penState = this._getPenState(target);

        if (!penState.penDown) {
            penState.penDown = true;
            target.onTargetMoved = this._onTargetMoved;
        }

        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penPoint(penSkinId, penState.penAttributes, target.x, target.y);
            this.runtime.requestRedraw();
        }
    }

    /**
     * The pen "pen up" block stops the target from leaving pen trails.
     * @param {object} args - the block arguments.
     * @param {object} util - utility object provided by the runtime.
     */
    penUp (args, util) {
        this._penUp(util.target);
    }
    _penUp (target) { // used by compiler
        const penState = this._getPenState(target);

        if (penState.penDown) {
            penState.penDown = false;
            target.onTargetMoved = null;
        }
    }

    /**
     * The pen "set pen color to {color}" block sets the pen to a particular RGB color.
     * The transparency is reset to 0.
     * @param {object} args - the block arguments.
     *  @property {int} COLOR - the color to set, expressed as a 24-bit RGB value (0xRRGGBB).
     * @param {object} util - utility object provided by the runtime.
     */
    setPenColorToColor (args, util) {
        this._setPenColorToColor(args.COLOR, util.target);
    }
    _setPenColorToColor (color, target) { // used by compiler
        const penState = this._getPenState(target);
        const rgb = Cast.toRgbColorObject(color);
        const hsv = Color.rgbToHsv(rgb);
        penState.color = (hsv.h / 360) * 100;
        penState.saturation = hsv.s * 100;
        penState.brightness = hsv.v * 100;
        if (rgb.hasOwnProperty('a')) {
            penState.transparency = 100 * (1 - (rgb.a / 255.0));
        } else {
            penState.transparency = 0;
        }

        // Set the legacy "shade" value the same way scratch 2 did.
        penState._shade = penState.brightness / 2;

        this._updatePenColor(penState);
    }

    /**
     * Update the cached color from the color, saturation, brightness and transparency values
     * in the provided PenState object.
     * @param {PenState} penState - the pen state to update.
     * @private
     */
    _updatePenColor (penState) {
        const rgb = Color.hsvToRgb({
            h: penState.color * 360 / 100,
            s: penState.saturation / 100,
            v: penState.brightness / 100
        });
        penState.penAttributes.color4f[0] = rgb.r / 255.0;
        penState.penAttributes.color4f[1] = rgb.g / 255.0;
        penState.penAttributes.color4f[2] = rgb.b / 255.0;
        penState.penAttributes.color4f[3] = this._transparencyToAlpha(penState.transparency);
    }

    /**
     * Set or change a single color parameter on the pen state, and update the pen color.
     * @param {ColorParam} param - the name of the color parameter to set or change.
     * @param {number} value - the value to set or change the param by.
     * @param {PenState} penState - the pen state to update.
     * @param {boolean} change - if true change param by value, if false set param to value.
     * @private
     */
    _setOrChangeColorParam (param, value, penState, change) { // used by compiler
        switch (param) {
        case ColorParam.COLOR:
            penState.color = this._wrapColor(value + (change ? penState.color : 0));
            break;
        case ColorParam.SATURATION:
            penState.saturation = this._clampColorParam(value + (change ? penState.saturation : 0));
            break;
        case ColorParam.BRIGHTNESS:
            penState.brightness = this._clampColorParam(value + (change ? penState.brightness : 0));
            break;
        case ColorParam.TRANSPARENCY:
            penState.transparency = this._clampColorParam(value + (change ? penState.transparency : 0));
            break;
        default:
            log.warn(`Tried to set or change unknown color parameter: ${param}`);
        }
        this._updatePenColor(penState);
    }

    /**
     * The "change pen {ColorParam} by {number}" block changes one of the pen's color parameters
     * by a given amound.
     * @param {object} args - the block arguments.
     *  @property {ColorParam} COLOR_PARAM - the name of the selected color parameter.
     *  @property {number} VALUE - the amount to change the selected parameter by.
     * @param {object} util - utility object provided by the runtime.
     */
    changePenColorParamBy (args, util) {
        const penState = this._getPenState(util.target);
        this._setOrChangeColorParam(args.COLOR_PARAM, Cast.toNumber(args.VALUE), penState, true);
    }

    /**
     * The "set pen {ColorParam} to {number}" block sets one of the pen's color parameters
     * to a given amound.
     * @param {object} args - the block arguments.
     *  @property {ColorParam} COLOR_PARAM - the name of the selected color parameter.
     *  @property {number} VALUE - the amount to set the selected parameter to.
     * @param {object} util - utility object provided by the runtime.
     */
    setPenColorParamTo (args, util) {
        const penState = this._getPenState(util.target);
        this._setOrChangeColorParam(args.COLOR_PARAM, Cast.toNumber(args.VALUE), penState, false);
    }

    /**
     * The pen "change pen size by {number}" block changes the pen size by the given amount.
     * @param {object} args - the block arguments.
     *  @property {number} SIZE - the amount of desired size change.
     * @param {object} util - utility object provided by the runtime.
     */
    changePenSizeBy (args, util) {
        this._changePenSizeBy(Cast.toNumber(args.SIZE), util.target);
    }
    _changePenSizeBy (size, target) { // used by compiler
        const penAttributes = this._getPenState(target).penAttributes;
        penAttributes.diameter = this._clampPenSize(penAttributes.diameter + size);
    }

    /**
     * The pen "set pen size to {number}" block sets the pen size to the given amount.
     * @param {object} args - the block arguments.
     *  @property {number} SIZE - the amount of desired size change.
     * @param {object} util - utility object provided by the runtime.
     */
    setPenSizeTo (args, util) {
        this._setPenSizeTo(Cast.toNumber(args.SIZE), util.target);
    }
    _setPenSizeTo (size, target) { // used by compiler
        const penAttributes = this._getPenState(target).penAttributes;
        penAttributes.diameter = this._clampPenSize(size);
    }

    /* LEGACY OPCODES */
    /**
     * Scratch 2 "hue" param is equivelant to twice the new "color" param.
     * @param {object} args - the block arguments.
     *  @property {number} HUE - the amount to set the hue to.
     * @param {object} util - utility object provided by the runtime.
     */
    setPenHueToNumber (args, util) {
        this._setPenHueToNumber(Cast.toNumber(args.HUE), util.target);
    }
    _setPenHueToNumber (hueValue, target) {
        const penState = this._getPenState(target);
        const colorValue = hueValue / 2;
        this._setOrChangeColorParam(ColorParam.COLOR, colorValue, penState, false);
        this._setOrChangeColorParam(ColorParam.TRANSPARENCY, 0, penState, false);
        this._legacyUpdatePenColor(penState);
    }

    /**
     * Scratch 2 "hue" param is equivelant to twice the new "color" param.
     * @param {object} args - the block arguments.
     *  @property {number} HUE - the amount of desired hue change.
     * @param {object} util - utility object provided by the runtime.
     */
    changePenHueBy (args, util) {
        this._changePenHueBy(Cast.toNumber(args.HUE), util.target);
    }
    _changePenHueBy (hueChange, target) { // used by compiler
        const penState = this._getPenState(target);
        const colorChange = hueChange / 2;
        this._setOrChangeColorParam(ColorParam.COLOR, colorChange, penState, true);

        this._legacyUpdatePenColor(penState);
    }

    /**
     * Use legacy "set shade" code to calculate RGB value for shade,
     * then convert back to HSV and store those components.
     * It is important to also track the given shade in penState._shade
     * because it cannot be accurately backed out of the new HSV later.
     * @param {object} args - the block arguments.
     *  @property {number} SHADE - the amount to set the shade to.
     * @param {object} util - utility object provided by the runtime.
     */
    setPenShadeToNumber (args, util) {
        this._setPenShadeToNumber(Cast.toNumber(args.SHADE), util.target);
    }
    _setPenShadeToNumber (shade, target) {
        const penState = this._getPenState(target);
        let newShade = Cast.toNumber(shade);

        // Wrap clamp the new shade value the way scratch 2 did.
        newShade = newShade % 200;
        if (newShade < 0) newShade += 200;

        // And store the shade that was used to compute this new color for later use.
        penState._shade = newShade;

        this._legacyUpdatePenColor(penState);
    }

    /**
     * Because "shade" cannot be backed out of hsv consistently, use the previously
     * stored penState._shade to make the shade change.
     * @param {object} args - the block arguments.
     *  @property {number} SHADE - the amount of desired shade change.
     * @param {object} util - utility object provided by the runtime.
     */
    changePenShadeBy (args, util) {
        this._changePenShadeBy(args.SHADE, util.target);
    }
    _changePenShadeBy (shade, target) {
        const penState = this._getPenState(target);
        const shadeChange = Cast.toNumber(shade);
        this._setPenShadeToNumber(penState._shade + shadeChange, target);
    }

    /**
     * Update the pen state's color from its hue & shade values, Scratch 2.0 style.
     * @param {object} penState - update the HSV & RGB values in this pen state from its hue & shade values.
     * @private
     */
    _legacyUpdatePenColor (penState) {
        // Create the new color in RGB using the scratch 2 "shade" model
        let rgb = Color.hsvToRgb({ h: penState.color * 360 / 100, s: 1, v: 1 });
        const shade = (penState._shade > 100) ? 200 - penState._shade : penState._shade;
        if (shade < 50) {
            rgb = Color.mixRgb(Color.RGB_BLACK, rgb, (10 + shade) / 60);
        } else {
            rgb = Color.mixRgb(rgb, Color.RGB_WHITE, (shade - 50) / 60);
        }

        // Update the pen state according to new color
        const hsv = Color.rgbToHsv(rgb);
        penState.color = 100 * hsv.h / 360;
        penState.saturation = 100 * hsv.s;
        penState.brightness = 100 * hsv.v;

        this._updatePenColor(penState);
    }

    goPenLayer (args) {
        this._getPenLayerID();
        if (!this._penDrawableId) return;
        // layer order is already set correctly, dont do anything
        if (this.runtime.renderer._groupOrdering.at(-1) === LayerNames[args.OPTION]) return;
        if (args.OPTION === LayerParam.FRONT) {
            console.log('setting the layer order to', StageLayering.LAYER_GROUPS_PEN);
            this.runtime.renderer.setLayerGroupOrdering(StageLayering.LAYER_GROUPS_PEN);
            this._penDrawableId = this.runtime.renderer.setDrawableOrder(this._penDrawableId,
                Infinity, StageLayering.PEN_LAYER);
        } else {
            console.log('setting the layer order to', StageLayering.LAYER_GROUPS);
            this.runtime.renderer.setLayerGroupOrdering(StageLayering.LAYER_GROUPS);
            this._penDrawableId = this.runtime.renderer.setDrawableOrder(this._penDrawableId,
                -Infinity, StageLayering.PEN_LAYER);
        }
    }

    _getPenColor (target) {
        const rgba = {};
        const penState = this._getPenState(target);
        rgba.r = penState.penAttributes.color4f[0] * 255;
        rgba.g = penState.penAttributes.color4f[1] * 255;
        rgba.b = penState.penAttributes.color4f[2] * 255;
        rgba.a = this._alphaToTransparency(penState.penAttributes.color4f[3]);
        return Color.rgbToHex(rgba);
    }

    drawComplexShape (args, util) {
        const target = util.target;
        const penState = this._getPenState(target);
        const penAttributes = penState.penAttributes;
        const penColor = this._getPenColor(util.target);
        const points = args.SHAPE;
        const firstPos = points.at(-1);

        const ctx = this._getBitmapCanvas();

        const rgb = Cast.toRgbColorObject(args.COLOR);

        ctx.fillStyle = this._toCanvasColor(rgb, util.target);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penAttributes.diameter;

        ctx.beginPath();
        ctx.moveTo(firstPos.x, -firstPos.y);
        for (const pos of points) {
            ctx.lineTo(pos.x, -pos.y);
        }
        ctx.closePath();

        if (penState.penDown) ctx.stroke();
        ctx.fill();

        this._drawContextToPen(ctx);
    }

    draw4SidedComplexShape (args, util) {
        this.drawComplexShape(args, util);
    }

    drawArrayComplexShape (args, util) {
        const providedData = Cast.toString(args.SHAPE);
        const providedPoints = parseArray(providedData); // ignores objects
        // we can save processing by just ignoring empty arrays
        if (providedPoints.length <= 0) return;
        // the last point is missing a Y value, Y will be 0 for that point
        if (providedPoints.length % 2 !== 0) providedPoints.push(0);
        const points = [];
        let currentPoint = {};
        let isXCoord = true;
        for (const num of providedPoints) {
            if (isXCoord) {
                currentPoint.x = Cast.toNumber(num);
                isXCoord = false;
                continue;
            }
            currentPoint.y = Cast.toNumber(num);
            points.push(currentPoint);
            currentPoint = {}; // make a new object so we dont override the others inside the array
            isXCoord = true;
        }
        this.drawComplexShape({
            ...args,
            SHAPE: points
        }, util);
    }
}

module.exports = Scratch3PenBlocks;
