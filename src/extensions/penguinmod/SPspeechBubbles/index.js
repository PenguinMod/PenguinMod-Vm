const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');
const TargetType = require('../../../extension-support/target-type');
const formatMessage = require('format-message');

/**
 * Icon svg to be displayed on the toolbox category, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2Ny4zNDMiIGhlaWdodD0iNjcuMzQzIiB2aWV3Qm94PSIwIDAgNjcuMzQzIDY3LjM0MyI+PGcgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMy44NjggMzMuNjcxYzAtMTYuNDYgMTMuMzQzLTI5LjgwMyAyOS44MDMtMjkuODAzczI5LjgwMyAxMy4zNDMgMjkuODAzIDI5LjgwMy0xMy4zNDMgMjkuODAzLTI5LjgwMyAyOS44MDNTMy44NjggNTAuMTMxIDMuODY4IDMzLjY3MXoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzc3NGRjYiIgc3Ryb2tlLXdpZHRoPSI3LjUiLz48cGF0aCBkPSJNMy44NjggMzMuNjcxYzAtMTYuNDYgMTMuMzQzLTI5LjgwMyAyOS44MDMtMjkuODAzczI5LjgwMyAxMy4zNDMgMjkuODAzIDI5LjgwMy0xMy4zNDMgMjkuODAzLTI5LjgwMyAyOS44MDNTMy44NjggNTAuMTMxIDMuODY4IDMzLjY3MSIgZmlsbD0iIzk2ZiIvPjxwYXRoIGQ9Ik0wIDY3LjM0MlYuMDAxaDY3LjM0MnY2Ny4zNDJ6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTEzLjcyNyAzMS40ODFjLS4yMDMtOS45NzggNS41MjgtMTMuMTc0IDkuODQ0LTEzLjE3NCA1LjI1MiAwIDEwLjU4NC0uMzAzIDE5LjUzNCAwIDQuMzcxLjE0OCAxMC43MiAzLjQ2MiAxMC41MSAxMy4xNzQtLjIgOS4xOTItNy4yOTIgMTEuOTktMTAuNTg0IDExLjk5aC03LjM5N2MtMS41MDMgMC01LjcxMyA3LjkzNC0xMi41ODIgNy42OTctNC44Ny0uMTY4IDIuNzctNy42OTcuODE1LTcuNjk3LTUuNzk4IDAtOS45OTktNS4wNDUtMTAuMTQtMTEuOTkiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+';

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
    SCRATCH_ID: 'Scratch'
};

/**
 * Enum for bubble properties.
 * @readonly
 * @enum {string}
 */
const BubbleProps = {
    FONT: 'font',
    FONT_SIZE: 'font size',
    BORDER: 'border',
    BACKGROUND: 'background',
    TEXT: 'text',
    MIN_WIDTH: 'minimum width',
    MAX_WIDTH: 'maximum width',
    BORDER_WIDTH: 'border width',
    PADDING: 'padding size',
    CORNER: 'corner radius',
    TAIL: 'tail height',
    FONT_HEIGHT: 'font height ratio',
    LINE_HEIGHT: 'line height'
};

class Extension {
    constructor(runtime) {
        this.runtime = runtime;

        this.ext_looks = this.runtime.ext_scratch3_looks;
    }
    getInfo() {
        return {
            id: 'SPspeechBubbles',
            name: formatMessage({
                id: 'pm.SPspeechBubbles.categoryName',
                default: 'Speech Bubbles',
                description: 'Label for the speech bubble extension category'
            }),
            menuIconURI: menuIconURI,
            color1: '#9966ff',
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: formatMessage({
                        id: 'pm.SPspeechBubbles.stageSelected',
                        default: 'Stage selected: no speech blocks',
                        description: 'Label that appears in the extension category when the stage is selected'
                    }),
                    filter: [TargetType.STAGE]
                },
                {
                    opcode: 'setSpeechDirection',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pm.SPspeechBubbles.setSpeechDirection',
                        default: 'show speech on [SIDE]',
                        description: 'Displays the speech bubble on the left/right side of the sprite'
                    }),
                    arguments: {
                        SIDE: {
                            type: ArgumentType.STRING,
                            menu: 'SPEECH_DIRECTION'
                        }
                    },
                    filter: [TargetType.SPRITE],
                    extensions: ['colours_looks']
                },
                // TODO: whenever we implement a way to make 'sprite-specific' monitors in extension blocks,
                // The commented lines should be implemented.
                {
                    opcode: 'spokenValue',
                    labelFn: 'spokenValueMonitor',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pm.SPspeechBubbles.spokenValue',
                        default: 'my speech',
                        description: 'Returns the spoken text of the sprite'
                    }),
                    // hideFromPalette: true,
                    filter: [TargetType.SPRITE],
                    extensions: ['colours_looks']
                },
                /*
                // Hide the above block and render it with XML:
                {
                    blockType: BlockType.XML,
                    xml: `<block id="${this._getBlockSpecificId('spokenValue')}" type="SPspeechBubbles_spokenValue"></block>`,
                    filter: [TargetType.SPRITE]
                },*/
                '---',
                {
                    blockType: BlockType.XML,
                    xml: `<block type="looks_setFont">
                      <value name="font">
                        <shadow type="SPspeechBubbles_menu_FONT">
                          <field name="FONT">Helvetica</field>
                        </shadow>
                      </value>
                      <value name="size">
                        <shadow type="math_number">
                          <field name="NUM">14</field>
                        </shadow>
                      </value>
                    </block>`,
                    filter: [TargetType.SPRITE]
                },
                {
                    blockType: BlockType.XML,
                    xml: `<block type="looks_setColor">
                      <value name="color">
                        <shadow type="colour_picker"></shadow>
                      </value>
                      <field name="prop">BUBBLE_STROKE</field>
                    </block>`,
                    filter: [TargetType.SPRITE]
                },
                {
                    blockType: BlockType.XML,
                    xml: `<block type="looks_setShape">
                      <value name="color">
                        <shadow type="math_number">
                          <field name="NUM">0</field>
                        </shadow>
                      </value>
                      <field name="prop">STROKE_WIDTH</field>
                    </block>`,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'resetBubble',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'pm.SPspeechBubbles.resetBubble',
                        default: 'reset speech bubble',
                        description: 'Resets visual effects applied to a speech bubble'
                    }),
                    filter: [TargetType.SPRITE],
                    extensions: ['colours_looks']
                },
                '---',
                {
                    opcode: 'getBubbleProperty',
                    labelFn: 'bubblePropertyMonitor',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'pm.SPspeechBubbles.getBubbleProperty',
                        default: 'bubble [PROP]',
                        description: 'Gets a visual property of a speech bubble'
                    }),
                    arguments: {
                        PROP: {
                            type: ArgumentType.STRING,
                            menu: 'BUBBLE_PROPERTIES'
                        }
                    },
                    filter: [TargetType.SPRITE],
                    extensions: ['colours_looks']
                },
                '---',
                {
                    blockType: BlockType.XML,
                    xml: `<block id="${this._getBlockSpecificId('sayWidth')}" type="looks_sayWidth"></block>`,
                    filter: [TargetType.SPRITE]
                },
                {
                    blockType: BlockType.XML,
                    xml: `<block id="${this._getBlockSpecificId('sayHeight')}" type="looks_sayHeight"></block>`,
                    filter: [TargetType.SPRITE]
                },
            ],
            menus: {
                SPEECH_DIRECTION: {
                    acceptReporters: false,
                    items: [
                        {
                            text: 'left',
                            value: 'left',
                        },
                        {
                            text: 'right',
                            value: 'right',
                        },
                        {
                            text: 'auto',
                            value: 'auto',
                        },
                    ]
                },
                BUBBLE_PROPERTIES: {
                    acceptReporters: false,
                    items: '_getBubbleProps',
                },
                FONT: {
                    acceptReporters: true,
                    items: '_getFonts',
                    isTypeable: true
                },
            },
        };
    }

    /**
     * Initialize bubble properties selection menu.
     * @returns {array} of text and values for each menu element.
     * @private
     */
    _getBubbleProps () {
        return [
            {
                text: 'font',
                value: BubbleProps.FONT
            },
            {
                text: 'font size',
                value: BubbleProps.FONT_SIZE
            },
            {
                text: 'border color',
                value: BubbleProps.BORDER
            },
            {
                text: 'background color',
                value: BubbleProps.BACKGROUND
            },
            {
                text: 'text color',
                value: BubbleProps.TEXT
            },
            {
                text: 'minimum width',
                value: BubbleProps.MIN_WIDTH
            },
            {
                text: 'maximum width',
                value: BubbleProps.MAX_WIDTH
            },
            {
                text: 'border width',
                value: BubbleProps.BORDER_WIDTH
            },
            {
                text: 'padding size',
                value: BubbleProps.PADDING
            },
            {
                text: 'corner radius',
                value: BubbleProps.CORNER
            },
            {
                text: 'tail height',
                value: BubbleProps.TAIL
            },
            {
                text: 'font height ratio',
                value: BubbleProps.FONT_HEIGHT
            },
            {
                text: 'line height',
                value: BubbleProps.LINE_HEIGHT
            },
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
            }))
        ];
    }

    /**
     * Creates a unique block id for sprite-specific, xml-based blocks.
     * @param {string} opcode Opcode of block to append.
     * @returns {string} block id.
     * @private
     */
    _getBlockSpecificId(opcode) {
        if (this.runtime._editingTarget) {
            return this.runtime._editingTarget.id + '_' + opcode;
        }

        return opcode;
    }

    setSpeechDirection(args, util) {
        const state = this.ext_looks._getBubbleState(util.target);
        if (!state) return; // Shouldn't happen.

        const oldDirectionState = state.onSpriteRight;
        const oldAutoState = state._forceSide;

        const side = Cast.toString(args.SIDE).toLowerCase();
        state._forceSide = side !== 'auto';
        state.onSpriteRight = side === 'right' || !state._forceSide;

        if (
            oldDirectionState !== state.onSpriteRight ||
            oldAutoState !== state._forceSide
        ) {
            this.ext_looks._renderBubble(util.target);
        }
    }

    spokenValue(_, util) {
        const state = this.ext_looks._getBubbleState(util.target);

        if (state) return state.text;
        else return '';
    }

    spokenValueMonitor () {
        return vm.runtime._editingTarget.getName() + ': speech';
    }

    resetBubble(_, util) {
        const state = this.ext_looks._getBubbleState(util.target);
        if (!state) return; // Shouldn't happen

        state.style = this.ext_looks.constructor.DEFAULT_BUBBLE_STYLE;
        this.ext_looks._renderBubble(util.target);
    }

    getBubbleProperty(args, util) {
        const state = this.ext_looks._getBubbleState(util.target);
        if (!state) return ''; // Shouldn't happen

        switch (Cast.toString(args.PROP)) {
            case BubbleProps.FONT: return state.style.font;
            case BubbleProps.FONT_SIZE: return state.style.fontSize;
            case BubbleProps.BORDER: return state.style.bubbleStroke;
            case BubbleProps.BACKGROUND: return state.style.bubbleFill;
            case BubbleProps.TEXT: return state.style.textFill;
            case BubbleProps.MIN_WIDTH: return state.minWidth;
            case BubbleProps.MAX_WIDTH: return state.style.maxLineWidth;
            case BubbleProps.BORDER_WIDTH: return state.style.strokeWidth;
            case BubbleProps.PADDING: return state.style.padding;
            case BubbleProps.CORNER: return state.style.cornerRadius
            case BubbleProps.TAIL: return state.style.tailHeight;
            case BubbleProps.FONT_HEIGHT: return state.style.fontHeightRatio;
            case BubbleProps.LINE_HEIGHT: return state.style.lineHeight;
            default: return '';
        }
    }

    bubblePropertyMonitor(params) {
        return vm.runtime._editingTarget.getName() + ': bubble ' + params.PROP;
    }
}

module.exports = Extension;
