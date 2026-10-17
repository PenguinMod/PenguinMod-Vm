const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const BlockShape = require('../../extension-support/block-shape');
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
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+cGVuLWljb248L3RpdGxlPjxnIGZpbGw9Im5vbmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjNTc1ZTc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im04Ljc1MyAzNC42MDItNC4yNSAxLjc4IDEuNzgzLTQuMjM3YzEuMjE4LTIuODkyIDIuOTA3LTUuNDIzIDUuMDMtNy41MzhMMzEuMDY2IDQuOTNjLjg0Ni0uODQyIDIuNjUtLjQxIDQuMDMyLjk2NyAxLjM4IDEuMzc1IDEuODE2IDMuMTczLjk3IDQuMDE1TDE2LjMxOCAyOS41OWMtMi4xMjMgMi4xMTYtNC42NjQgMy44LTcuNTY1IDUuMDEyIi8+PHBhdGggZD0iTTI5LjQxIDYuMTFzLTQuNDUtMi4zNzgtOC4yMDIgNS43NzJjLTEuNzM0IDMuNzY2LTQuMzUgMS41NDYtNC4zNSAxLjU0NiIvPjxwYXRoIGZpbGw9IiM0Yzk3ZmYiIGQ9Ik0zNi40MiA4LjgyNWMwIC40NjMtLjE0Ljg3My0uNDMyIDEuMTY0bC05LjMzNSA5LjNjLjI4Mi0uMjkuNDEtLjY2OC40MS0xLjEyIDAtLjg3NC0uNTA3LTEuOTYzLTEuNDA2LTIuODY4LTEuMzYyLTEuMzU4LTMuMTQ3LTEuOC00LjAwMi0uOTlMMzAuOTkgNS4wMWMuODQ0LS44NCAyLjY1LS40MSA0LjAzNS45Ni44OTguOTA0IDEuMzk2IDEuOTgyIDEuMzk2IDIuODU1TTEwLjUxNSAzMy43NzRhMjQgMjQgMCAwIDEtMS43NjQuODNMNC41IDM2LjM4MmwxLjc4Ni00LjIzNWMuMjU4LS42MDQuNTMtMS4xODYuODMzLTEuNzU3LjY5LjE4MyAxLjQ0OC42MjUgMi4xMDggMS4yODIuNjYuNjU4IDEuMTAyIDEuNDEyIDEuMjg3IDIuMTAyIi8+PHBhdGggZmlsbD0iIzU3NWU3NSIgZD0iTTM2LjQ5OCA4Ljc0OGMwIC40NjQtLjE0Ljg3NC0uNDMzIDEuMTY1bC0xOS43NDIgMTkuNjhjLTIuMTMgMi4xMS00LjY3MyAzLjc5My03LjU3MiA1LjAxTDQuNSAzNi4zOGwuOTc0LTIuMzE2IDEuOTI1LS44MDhjMi44OTgtMS4yMTggNS40NC0yLjkgNy41Ny01LjAxbDE5Ljc0My0xOS42OGMuMjkyLS4yOTIuNDMyLS43MDIuNDMyLTEuMTY1IDAtLjY0Ni0uMjctMS40LS43OC0yLjEyMi4yNS4xNzIuNS4zNzcuNzM3LjYxNC44OTguOTA1IDEuMzk2IDEuOTgzIDEuMzk2IDIuODU2IiBvcGFjaXR5PSIuMTUiLz48cGF0aCBmaWxsPSIjNTc1ZTc1IiBkPSJNMTguNDUgMTIuODNhLjkwNC45MDQgMCAxIDEtLjkwMy0uOTAyYy41IDAgLjkwNC40MDQuOTA0LjkwNHoiLz48L2c+PC9zdmc+';

/**
 * LUT for integer / 255 as a float.
 * @type {Float64Array}
 */
const DIVIDE_255_LUT = new Float64Array(256);
for (let i = 0; i < 256; i++) {
    DIVIDE_255_LUT[i] = i / 255;
}

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
 * Enum for default font families.
 * @readonly
 * @enum {string}
 */
const Font = {
    SANS_SERIF_ID: 'Sans Serif',
    SERIF_ID: 'Serif',
    HANDWRITING_ID: 'Handwriting',
    MARKER_ID: 'Marker',
    CURLY_ID: 'Curly',
    PIXEL_ID: 'Pixel',

    /* PenguinMod Fonts */
    PLAYFUL_ID: 'Playful',
    BUBBLY_ID: 'Bubbly',
    BITSANDBYTES_ID: 'Bits and Bytes',
    TECHNOLOGICAL_ID: 'Technological',
    ARCADE_ID: 'Arcade',
    ARCHIVO_ID: 'Archivo',
    ARCHIVOBLACK_ID: 'Archivo Black',
    SCRATCH_ID: 'Scratch',
    RANDOM_ID: 'Random'
};

/**
 * Enum for text italics.
 * @readonly
 * @enum {string}
 */
const ItalicsParam = {
    ON: 'on',
    OFF: 'off'
};

/**
 * Default image url for the 'draw image' blocks.
 */
const DEFAULT_IMAGE_SRC = 'https://...'; 

/**
 * Parses a user-entered string representation of an array.
 * @param {string} string String array to parse.
 * @returns {Array<*>} Parsed array.
 */
const parseArray = (string) => {
    try {
        if (Array.isArray(string)) return string;
        if (typeof string.toJSON === 'function') {
            const potentialArray = string.toJSON();
            if (Array.isArray(potentialArray)) return potentialArray;
        }

        const parsed = JSON.parse(Cast.toString(string));
        if (Array.isArray(parsed)) return parsed;
        else return [];
    } catch {
       return [];
    }
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
         * The attributes for printed text.
         * @type {object}
         */
        this.printTextAttributes = {
            weight: '400',
            italic: false,
            size: '28',
            font: 'Arial',
            color: '#000000',
            strokeColor: '#000000',
            strokeWidth: 0
        };

        /**
         * Map containing preloaded images for printing.
         * @type {Map<string, Image>}
         */
        this.preloadedImages = new Map();

        /**
         * The camera this pen paper is bound to.
         */
        this.cameraBound = -1;

        this.bitmapCanvas = document.createElement('canvas');
        this.bitmapContext = this.bitmapCanvas.getContext('2d', { willReadFrequently: true });
        this.bitmapCanvas.width = runtime.stageWidth;
        this.bitmapCanvas.height = runtime.stageHeight;
        this.bitmapSkinID = runtime.renderer.createBitmapSkin(this.bitmapCanvas, 1);
        this.bitmapDrawableID = runtime.renderer.createDrawable(StageLayering.PEN_LAYER);
        runtime.renderer.updateDrawableSkinId(this.bitmapDrawableID, this.bitmapSkinID);
        runtime.renderer.updateDrawableVisible(this.bitmapDrawableID, false);

        this._onTargetCreated = this._onTargetCreated.bind(this);
        this._onTargetMoved = this._onTargetMoved.bind(this);
        this._onCameraMoved = this._onCameraMoved.bind(this);

        runtime.on('targetWasCreated', this._onTargetCreated);
        runtime.on('RUNTIME_DISPOSED', this.clear.bind(this));
        runtime.on("STAGE_SIZE_CHANGED", (width, height) => {
            // This will clear the canvas if the value is changed from the previous size.
            this.bitmapCanvas.width = width;
            this.bitmapCanvas.height = height;
        });
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
        return {min: 1, max: 1e308};
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
                if (
                    this.runtime.extensionManager.isExtensionLoaded("pmCamera") ||
                    this.runtime.extensionManager.isExtensionLoaded("jwCamera")
                ) {
                    // Use the rendered camera position of the sprite rather than the sprite's position.
                    const [newX, newY] = target._translatePossitionToCamera();
                    if (target.cameraBound >= 0) {
                        [oldX, oldY] = translateForCamera(this.runtime, target.cameraBound, oldX, oldY);
                    }

                    this.runtime.renderer.penLine(penSkinId, penState.penAttributes, oldX, oldY, newX, newY);
                } else {
                    this.runtime.renderer.penLine(penSkinId, penState.penAttributes, oldX, oldY, target.x, target.y);
                }

                this.runtime.requestRedraw();
            }
        }
    }

    /**
     * Callback for when the binded camera moves.
     * @param {number} screen Camera ID.
     */
    _onCameraMoved (screen) {
        if (screen !== this.cameraBound) return;

        const cameraState = this.runtime.cameraStates[screen];
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penTranslate(penSkinId, ...cameraState.pos, cameraState.scale, cameraState.dir);
        }
        this.runtime.requestRedraw();
    }

    /**
     * Binds this pen paper to a given gamera.
     * @param {number} screen Camera ID.
     */
    bindToCamera (screen) {
        this.cameraBound = screen;
        this._onCameraMoved();
    }

    /**
     * Removes the camera binding from this pen paper.
     */
    removeCameraBinding () {
        this.cameraBound = -1;
        const penSkinId = this._getPenLayerID();
        if (penSkinId >= 0) {
            this.runtime.renderer.penTranslate(penSkinId, 0, 0, 1, 0);
        }
    }

    /**
     * Convert a Scratch RGB(A) color object to a canvas color string.
     * If rgb.a exists use it, otherwise fallback to the pen transparency.
     * @param {object} rgb
     * @param {Target} [target]
     * @returns {string} rgba string.
     * @private
     */
    _toCanvasColor (rgb, target) {
        let alpha = 1;

        if (Object.prototype.hasOwnProperty.call(rgb, 'a')) {
            alpha = rgb.a / 255;
        } else if (target) {
            const penState = this._getPenState(target);
            alpha = this._transparencyToAlpha(penState.transparency);
        }

        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Returns the context of the pen paper bitmap context.
     */
    _getBitmapCanvas () {
        const penSkinId = this._getPenLayerID();
        const penSkin = this.runtime.renderer._allSkins[penSkinId];

        const width = Math.max(1, penSkin._size[0]);
        const height = Math.max(1, penSkin._size[1]);

        this.bitmapCanvas.width = width;
        this.bitmapCanvas.height = height;

        const ctx = this.bitmapContext;

        ctx.save();

        ctx.translate(width / 2, height / 2);
        ctx.scale(
            penSkin.renderQuality,
            penSkin.renderQuality
        );

        return ctx;
    }

    /**
     * Draws a canvas context to the pen paper.
     * @param {CanvasContext2d} ctx Context to draw.
     */
    _drawContextToPen (ctx) {
        const penSkinId = this._getPenLayerID();
        const width = this.bitmapCanvas.width;
        const height = this.bitmapCanvas.height;

        ctx.restore();

        const printSkin = this.runtime.renderer._allSkins[this.bitmapSkinID];
        const imageData = ctx.getImageData(
            0,
            0,
            width,
            height
        );

        printSkin._setTexture(imageData);

        this.runtime.renderer.penStamp(penSkinId, this.bitmapDrawableID);
        this.runtime.requestRedraw();
    }

    /**
     * Gets this drawing target's pen color.
     * @param {VM.Target} target
     * @returns Pen color as hex code.
     */
    _getPenColor (target) {
        const rgba = {};
        const penState = this._getPenState(target);
        rgba.r = penState.penAttributes.color4f[0] * 255;
        rgba.g = penState.penAttributes.color4f[1] * 255;
        rgba.b = penState.penAttributes.color4f[2] * 255;
        rgba.a = this._alphaToTransparency(penState.penAttributes.color4f[3]);
        return Color.rgbToHex(rgba);
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

    /**
     * Initialize italic toggler menu with localized strings.
     * @returns {array} of the localized text and values for each menu element.
     * @private
     */
    _initItalicsToggleParam () {
        return [
            {
                text: formatMessage({
                    id: 'pm.pen.italicsToggle.on',
                    default: 'on',
                    description: 'label for on'
                }),
                value: ItalicsParam.ON
            },
            {
                text: formatMessage({
                    id: 'pm.pen.italicsToggle.off',
                    default: 'off',
                    description: 'label for off'
                }),
                value: ItalicsParam.OFF
            }
        ];
    }

    /**
     * Initialize font selection menu.
     * @returns {array} of text and values for each menu element.
     * @private
     */
    _getFonts () {
        return [
            {
                text: 'Sans Serif',
                value: Font.SANS_SERIF_ID
            },
            {
                text: 'Serif',
                value: Font.SERIF_ID
            },
            {
                text: 'Handwriting',
                value: Font.HANDWRITING_ID
            },
            {
                text: 'Marker',
                value: Font.MARKER_ID
            },
            {
                text: 'Curly',
                value: Font.CURLY_ID
            },
            {
                text: 'Pixel',
                value: Font.PIXEL_ID
            },
            {
                text: 'Playful',
                value: Font.PLAYFUL_ID
            },
            {
                text: 'Bubbly',
                value: Font.BUBBLY_ID
            },
            {
                text: 'Arcade',
                value: Font.ARCADE_ID
            },
            {
                text: 'Bits and Bytes',
                value: Font.BITSANDBYTES_ID
            },
            {
                text: 'Technological',
                value: Font.TECHNOLOGICAL_ID
            },
            {
                text: 'Scratch',
                value: Font.SCRATCH_ID
            },
            {
                text: 'Archivo',
                value: Font.ARCHIVO_ID
            },
            {
                text: 'Archivo Black',
                value: Font.ARCHIVOBLACK_ID
            },
            ...this.runtime.fontManager.getFonts().map(i => ({
                text: i.name,
                value: i.family
            })),
            {
                text: 'random font',
                value: Font.RANDOM_ID
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
                // tw: additional message when on the stage for clarity
                {
                    blockType: BlockType.LABEL,
                    text: formatMessage({
                        id: 'tw.pen.stageSelected',
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
                            shape: BlockShape.SQUARE,
                            defaultValue: '[-20, 20, 20, 20, 0, -20]'
                        },
                        COLOR: {
                            type: ArgumentType.COLOR
                        }
                    },
                },
                "---",
                {
                    opcode: 'preloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'preload image [URI] as [NAME]',
                    arguments: {
                        URI: {
                            type: ArgumentType.STRING,
                            defaultValue: DEFAULT_IMAGE_SRC
                        },
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "my image"
                        }
                    }
                },
                {
                    opcode: 'unloadUriImage',
                    blockType: BlockType.COMMAND,
                    text: 'remove image [NAME]',
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "my image"
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
                            defaultValue: DEFAULT_IMAGE_SRC
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
                            defaultValue: DEFAULT_IMAGE_SRC
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
                            defaultValue: DEFAULT_IMAGE_SRC
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
                            defaultValue: 'Hello world!'
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
                            defaultValue: 5
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
                            /*type: ArgumentType.POLYGON,
                            nodes: 3*/
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
                            /*type: ArgumentType.POLYGON,
                            nodes: 4*/
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
                        default: 'set pen shade to [SHADE]',
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
                        default: 'change pen shade by [SHADE]',
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
                        default: 'set pen color to [HUE]',
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
                        default: 'change pen color by [HUE]',
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
                    text: formatMessage({
                        id: 'pen.GoPenLayer',
                        default: 'go to [OPTION] layer',
                        description: 'go to front layer(pen)'
                    }),
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'layerParam'
                        }
                    },
                    hideFromPalette: true,
                }
            ],
            menus: {
                colorParam: {
                    acceptReporters: true,
                    items: this._initColorParam()
                },
                italicsToggleParam: {
                    acceptReporters: false,
                    items: this._initItalicsToggleParam()
                },
                FONT: {
                    items: '_getFonts',
                    isTypeable: true
                },
                layerParam: {
                    acceptReporters: false,
                    items: [''] // This is deprecated.
                },
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

        let r;
        let g;
        let b;
        if (typeof color === 'string' && color.charCodeAt(0) === 35 /* # */) {
            const rgb = Color.hexToRgb(color);
            if (rgb) {
                r = rgb.r;
                g = rgb.g;
                b = rgb.b;
            } else {
                // Invalid hex colors are black
                r = 0;
                g = 0;
                b = 0;
            }
            penState.transparency = 0;
        } else {
            const decimal = Cast.toNumber(color);
            const a = (decimal >> 24) & 0xFF;
            r = (decimal >> 16) & 0xFF;
            g = (decimal >> 8) & 0xFF;
            b = decimal & 0xFF;
            penState.transparency = 100 * (1 - ((a > 0 ? a : 255) / 255.0));
        }

        const rFloat = DIVIDE_255_LUT[r];
        const gFloat = DIVIDE_255_LUT[g];
        const bFloat = DIVIDE_255_LUT[b];

        // Now, we convert to HSV.
        const x = Math.min(Math.min(rFloat, gFloat), bFloat);
        const v = Math.max(Math.max(rFloat, gFloat), bFloat);
        let h = 0;
        let s = 0;
        if (x !== v) {
            const f = (rFloat === x) ? gFloat - bFloat : ((gFloat === x) ? bFloat - rFloat : rFloat - gFloat);
            const i = (rFloat === x) ? 3 : ((gFloat === x) ? 5 : 1);
            h = (i - (f / (v - x))) * 60;
            // h is in [0, 360] here, so this is equivalent to h % 360 without the slow floating point modulo.
            // Pure reds give exactly 360.
            if (h === 360) h = 0;
            s = (v - x) / v;
        }

        penState.color = (h / 360) * 100;
        penState.saturation = s * 100;
        penState.brightness = v * 100;

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
        let rgb = Color.hsvToRgb({h: penState.color * 360 / 100, s: 1, v: 1});
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

    /** PM Extra Blocks */
    setPrintFont (args) {
        this.printTextAttributes.font = Cast.toString(args.FONT);
    }

    setPrintFontSize (args) {
        this.printTextAttributes.size = Cast.toNumber(args.SIZE);
    }

    setPrintFontColor (args, util) {
        const rgb = Cast.toRgbColorObject(args.COLOR);
        this.printTextAttributes.color = this._toCanvasColor(rgb, util.target);
    }

    setPrintFontStrokeColor (args, util) {
        const rgb = Cast.toRgbColorObject(args.COLOR);
        this.printTextAttributes.strokeColor = this._toCanvasColor(rgb, util.target);
    }

    setPrintFontStrokeWidth (args) {
        this.printTextAttributes.strokeWidth = Cast.toNumber(args.WIDTH);
    }

    setPrintFontWeight (args) {
        this.printTextAttributes.weight = Cast.toNumber(args.WEIGHT);
    }

    setPrintFontItalics (args) {
        this.printTextAttributes.italic = args.OPTION === ItalicsParam.ON;
    }

    printText (args) {
        const x = Cast.toNumber(args.X);
        const y = -Cast.toNumber(args.Y);
        const ctx = this._getBitmapCanvas();

        let resultFont = '';
        resultFont += `${this.printTextAttributes.italic ? 'italic ' : ''}`;
        resultFont += `${this.printTextAttributes.weight} `;
        resultFont += `${this.printTextAttributes.size}px `;
        resultFont += this.printTextAttributes.font;
        ctx.font = resultFont;

        ctx.strokeStyle = this.printTextAttributes.strokeWidth > 0 ? this.printTextAttributes.strokeColor : this.printTextAttributes.color;
        ctx.lineWidth = this.printTextAttributes.strokeWidth;
        ctx.fillStyle = this.printTextAttributes.color;

        if (this.printTextAttributes.strokeWidth > 0) {
            ctx.strokeText(args.TEXT, x, y);
        }

        ctx.fillText(args.TEXT, x, y);

        this._drawContextToPen(ctx);
    }

    async _drawUriImage({URI, X, Y, WIDTH, HEIGHT, ROTATE, CROPX, CROPY, CROPW, CROPH}) {
        const isPreloadedImg = this.preloadedImages.has(URI);

        const image = isPreloadedImg
            ? this.preloadedImages.get(URI)
            : await new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = "anonymous";
                image.onload = () => resolve(image);
                image.onerror = err => {
                    console.error('failed to load', URI, err);
                    reject('Image failed to load');
                };
                image.src = URI;
            });

        // Protect the user from uninteligable errors that may be thrown but probably never will.
        if (!image.complete) throw new Error('the provided image never loaded');
        if (image.width <= 0) throw new Error(`the image has an invalid width of ${image.width}`);
        if (image.height <= 0) throw new Error(`the image has an invalid height of ${image.height}`);

        const ctx = this._getBitmapCanvas();
        ctx.rotate(MathUtil.degToRad(Cast.toNumber(ROTATE) - 90));

        // Use size from the image if none specified.
        const width = WIDTH ? Cast.toNumber(WIDTH) : image.width;
        const height = HEIGHT ? Cast.toNumber(HEIGHT) : image.height;
        const realX = Cast.toNumber(X) - (width / 2);
        const realY = -Cast.toNumber(Y) - (height / 2);

        const hasCrop = CROPX !== undefined &&
            CROPY !== undefined &&
            CROPW !== undefined &&
            CROPH !== undefined;

        if (hasCrop) {
            ctx.drawImage(
                image,
                Cast.toNumber(CROPX), Cast.toNumber(CROPY),
                Cast.toNumber(CROPW), Cast.toNumber(CROPH),
                realX, realY,
                width, height
            );
        } else {
            ctx.drawImage(image, realX, realY, width, height);
        }

        this._drawContextToPen(ctx);
    }

    drawUriImage (args) {
        const isPreloadedImg = this.preloadedImages.has(args.URI);
        const possiblePromise = this._drawUriImage(args);

        if (!isPreloadedImg) {
            return possiblePromise;
        }
    }
    drawUriImageWHR (args) {
        return this.drawUriImage(args);
    }
    drawUriImageWHCX1Y1X2Y2R (args) {
        return this.drawUriImage(args);
    }

    preloadUriImage ({ URI, NAME }) {
        return new Promise(resolve => {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
                this.preloadedImages.set(Cast.toString(NAME), image);
                resolve();
            };
            image.onerror = resolve;
            image.src = Cast.toString(URI);
        });
    }

    unloadUriImage ({ NAME }) {
        const name = Cast.toString(NAME);
        if (this.preloadedImages.has(name)) {
            this.preloadedImages.get(name).remove();
        }

        this.preloadedImages.delete(name);
    }

    drawRect (args, util) {
        const ctx = this._getBitmapCanvas();

        const rgb = Cast.toRgbColorObject(args.COLOR);
        const color = this._toCanvasColor(rgb, util.target);

        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        ctx.fillRect(
            Cast.toNumber(args.X),
            -Cast.toNumber(args.Y),
            Cast.toNumber(args.WIDTH),
            Cast.toNumber(args.HEIGHT)
        );

        this._drawContextToPen(ctx);
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
        for (let i = 0; i < points.length; i++) {
            ctx.lineTo(points[i].x, -points[i].y);
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
        const providedPoints = parseArray(args.SHAPE);
        if (providedPoints.length < 6) return; // We need to make a triangle at minimum.

        // The last point is missing a Y value, Y will be 0 for that point.
        if (providedPoints.length % 2 !== 0) providedPoints.push(0);

        const points = [];
        let currentPoint = {};
        let isXCoord = true;
        for (let i = 0; i < providedPoints.length; i++) {
            if (isXCoord) {
                currentPoint.x = providedPoints[i];
                isXCoord = false;
            } else {
                currentPoint.y = providedPoints[i];
                points.push(currentPoint);

                // Move to next point.
                currentPoint = {};
                isXCoord = true;
            }
        }

        this.drawComplexShape({
            ...args,
            SHAPE: points
        }, util);
    }

    goPenLayer () {
        console.warn('This pen block is deprecated!');
    }
}

module.exports = Scratch3PenBlocks;