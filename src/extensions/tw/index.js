const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

// eslint-disable-next-line max-len
const iconURI = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path fill="none" stroke="#fff" stroke-width="11.51815371" d="M24.457 7.707a18.41 18.41 0 0 0-.365 2.31c-.02.224 0 .507.06.852.061.405.092.689.092.851 0 .527-.345.79-1.034.79-.446 0-.74-.131-.881-.395-.02-.446-.01-1.054.03-1.824.04-.912.061-1.52.061-1.824-.02 0-.05-.02-.091-.06a98.522 98.522 0 0 0-5.32.364c-.04.264-.04.588 0 .973l.122 1.094c-.081.629-.122 1.56-.122 2.797.061.527.091 2.786.091 6.779v2.219c0 .344.051.587.152.73h1.885c.77-.102 1.155.222 1.155.972 0 .446-.213.76-.638.942-.264.102-.73.122-1.399.061-.405-.04-.881-.05-1.428-.03-.75.101-1.662.182-2.736.243-1.094.06-1.763-.091-2.006-.456-.162-.243-.162-.496 0-.76.283-.446 1.023-.669 2.219-.669.628 0 .942-.172.942-.516 0-.183-.01-.355-.03-.517 0-.507.01-.953.03-1.338.06-1.094.06-2.634 0-4.62-.081-2.878-.05-5.462.091-7.752l-.09-.09c-.63.04-1.805.03-3.527-.031-.081 0-.7.04-1.854.121.283 1.946.446 3.334.486 4.165l-.06.82c-.021.305-.274.457-.76.457-.386 0-.71-.73-.973-2.19-.122-.87-.244-1.752-.365-2.644 0-.142-.071-.385-.213-.73-.122-.364-.39-.97-.39-1.152 0-.641.593-.489 1.363-.61.06 0 .162.01.304.03.142.02.243.03.304.03H17.1a57.098 57.098 0 0 0 5.411-.486c.122-.06.304-.121.547-.182.426-.04.79.06 1.095.304.304.223.405.547.304.972z"/><path fill="none" stroke="#ff4c4c" stroke-width="5.75909785" d="M24.333 7.71q-.244 1.065-.365 2.311-.03.335.06.851.092.608.092.851 0 .79-1.034.79-.669 0-.881-.394-.03-.67.03-1.824.06-1.368.06-1.824-.03 0-.09-.061-2.827.122-5.32.365-.06.395 0 .973l.122 1.094q-.122.942-.122 2.796.091.79.091 6.78v2.218q0 .517.152.73h1.885q1.155-.152 1.155.973 0 .668-.638.942-.396.152-1.399.06-.608-.06-1.428-.03-1.125.152-2.736.243-1.642.092-2.006-.456-.244-.364 0-.76.425-.668 2.219-.668.942 0 .942-.517 0-.274-.03-.517 0-.76.03-1.337.091-1.642 0-4.62-.122-4.317.091-7.752l-.091-.091q-.942.06-3.526-.03-.122 0-1.854.12.425 2.919.486 4.165l-.06.821q-.031.456-.76.456-.578 0-.974-2.189-.182-1.307-.364-2.644 0-.213-.213-.73-.182-.547-.182-.82 0-.76 1.155-.943.09 0 .304.03.212.03.304.03h7.538q2.797-.12 5.411-.485.182-.092.547-.183.639-.06 1.095.304.456.335.304.973z"/><path fill="#fff" d="M24.31 7.714q-.243 1.064-.365 2.31-.03.335.061.852.091.608.091.85 0 .791-1.033.791-.67 0-.882-.395-.03-.669.03-1.824.061-1.368.061-1.824-.03 0-.09-.06-2.828.121-5.32.364-.061.396 0 .973l.121 1.094q-.121.943-.121 2.797.09.79.09 6.779v2.219q0 .517.153.73h1.884q1.156-.153 1.156.972 0 .669-.639.942-.395.152-1.398.061-.608-.06-1.429-.03-1.125.152-2.736.243-1.641.091-2.006-.456-.243-.365 0-.76.426-.669 2.22-.669.941 0 .941-.516 0-.274-.03-.517 0-.76.03-1.338.092-1.641 0-4.62-.121-4.317.092-7.752l-.092-.09q-.942.06-3.526-.031-.121 0-1.854.121.426 2.919.486 4.165l-.06.82q-.03.457-.76.457-.578 0-.973-2.19-.182-1.306-.365-2.644 0-.212-.213-.73-.182-.546-.182-.82 0-.76 1.155-.942.091 0 .304.03t.304.03h7.539q2.796-.121 5.41-.486.183-.091.548-.182.638-.061 1.094.304.456.334.304.972z"/></svg>')}`;

/**
 * Class for TurboWarp blocks
 * @constructor
 */
class TurboWarpBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'tw',
            name: 'TurboWarp',
            color: '#ff4c4c',
            docsURI: 'https://docs.turbowarp.org/blocks',
            menuIconURI: iconURI,
            blockIconURI: iconURI,
            blocks: [
                {
                    opcode: 'getLastKeyPressed',
                    text: formatMessage({
                        id: 'tw.blocks.lastKeyPressed',
                        default: 'last key pressed',
                        description: 'Block that returns the last key that was pressed'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getButtonIsDown',
                    text: formatMessage({
                        id: 'tw.blocks.buttonIsDown',
                        default: '[MOUSE_BUTTON] mouse button down?',
                        description: 'Block that returns whether a specific mouse button is down'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        MOUSE_BUTTON: {
                            type: ArgumentType.NUMBER,
                            menu: 'mouseButton',
                            defaultValue: '0'
                        }
                    }
                }
            ],
            menus: {
                mouseButton: {
                    items: [
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.primary',
                                default: '(0) primary',
                                description: 'Dropdown item to select primary (usually left) mouse button'
                            }),
                            value: '0'
                        },
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.middle',
                                default: '(1) middle',
                                description: 'Dropdown item to select middle mouse button'
                            }),
                            value: '1'
                        },
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.secondary',
                                default: '(2) secondary',
                                description: 'Dropdown item to select secondary (usually right) mouse button'
                            }),
                            value: '2'
                        }
                    ],
                    acceptReporters: true
                }
            }
        };
    }

    getLastKeyPressed (args, util) {
        return util.ioQuery('keyboard', 'getLastKeyPressed');
    }

    getButtonIsDown (args, util) {
        const button = Cast.toNumber(args.MOUSE_BUTTON);
        return util.ioQuery('mouse', 'getButtonIsDown', [button]);
    }
}

module.exports = TurboWarpBlocks;
