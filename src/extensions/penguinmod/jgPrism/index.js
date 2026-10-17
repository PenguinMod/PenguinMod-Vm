const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const SandboxRunner = require('../../../util/sandboxed-javascript-runner');
const beatgammit = {
    deflate: require('./beatgammit-deflate'),
    inflate: require('./beatgammit-inflate')
};
const { validateArray } = require('../../../util/json-block-utilities');
const Cast = require('../../../util/cast');

const warningIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC8SURBVDhPpZPBDYMwDEWhJw4MQzdgG0bi0APDlHuPZRv6X2xUaqJWpE8y2Pk/JkRJFVnXtVOMiqdig5yxzm1HJDZu+gWexqcZDCjuqHtcRo/gfTdRkf2yy7kGMG4i/5wlGYSXObqL9MFsRQw06C0voq9ZhxcHasH7m4cV/AUNFkuLWGgwW17EzB5wPB9Wn+aanmoysVGRJAovI5PLydAqzh7l1mWDAUV2JQE8n5P3SORo3xTxOjMWrnNVvQChGZRpEqnWPQAAAABJRU5ErkJggg==";

/**
 * Class for Prism blocks
 * @constructor
 */
class JgPrismBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this.audioPlayer = new Audio();
        this.isJSPermissionGranted = false;
        this.isCameraScreenshotEnabled = false;

        this.mouseScrollDelta = { x: 0, y: 0, z: 0 };
        addEventListener("wheel", e => {
            this.mouseScrollDelta.x = e.deltaX;
            this.mouseScrollDelta.y = e.deltaY;
            this.mouseScrollDelta.z = e.deltaZ;
        });
        setInterval(() => {
            this.mouseScrollDelta = { x: 0, y: 0, z: 0 };
        }, 65);

        this.encodeCharacterLength = 6;
    }


    /**
     * dummy function for reseting user provided permisions when a save is loaded
     */
    deserialize() {
        this.isJSPermissionGranted = false;
        this.isCameraScreenshotEnabled = false;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgPrism',
            name: 'Prism',
            color1: '#BC7FFF',
            blocks: [
                {
                    opcode: 'playAudioFromUrl',
                    text: 'play audio from [URL]',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'https://extensions.turbowarp.org/meow.mp3'
                        }
                    }
                },
                {
                    opcode: 'setAudioToLooping',
                    text: 'set audio to loop',
                    hideFromPalette: true,
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setAudioToNotLooping',
                    text: 'set audio to not loop',
                    hideFromPalette: true,
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'pauseAudio',
                    text: 'pause audio',
                    hideFromPalette: true,
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'playAudio',
                    text: 'resume audio',
                    hideFromPalette: true,
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'setAudioPlaybackSpeed',
                    text: 'set audio speed to [SPEED]%',
                    hideFromPalette: true,
                    blockType: BlockType.COMMAND,
                    arguments: {
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'getAudioPlaybackSpeed',
                    text: 'audio speed',
                    hideFromPalette: true,
                    disableMonitor: false,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'setAudioPosition',
                    text: 'set audio position to [POSITION] seconds',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    arguments: {
                        POSITION: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'getAudioPosition',
                    text: 'audio position',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'setAudioVolume',
                    text: 'set audio volume to [VOLUME]%',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    arguments: {
                        VOLUME: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: 'getAudioVolume',
                    text: 'audio volume',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockType: BlockType.REPORTER
                },
                {
                    blockType: BlockType.LABEL,
                    text: "Data URIs"
                },
                {
                    opcode: 'screenshotStage',
                    text: 'screenshot the stage',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'dataUriOfCostume',
                    text: 'data url of costume #[INDEX]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    // these blocks will be replaced in the future
                    // hideFromPalette: true,
                    arguments: {
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "1"
                        }
                    }
                },
                {
                    opcode: 'dataUriFromImageUrl',
                    text: 'data url of image at url: [URL]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    // these blocks will be replaced in the future
                    // hideFromPalette: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "url"
                        }
                    }
                },
                {
                    opcode: 'dataUriFromArrayBuffer',
                    text: 'convert array buffer [BUFFER] to data url',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        BUFFER: {
                            type: ArgumentType.STRING,
                            defaultValue: "[72,101,108,108,111]"
                        }
                    }
                },
                {
                    opcode: 'arrayBufferFromDataUri',
                    text: 'convert data url [URL] to array buffer',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "data:text/plain;base64,SGVsbG8="
                        }
                    }
                },
                // {
                //     blockType: BlockType.LABEL,
                //     text: "More Mouse Inputs"
                // },
                {
                    opcode: 'currentMouseScrollX',
                    text: 'mouse scroll x',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockIconURI: warningIcon,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'currentMouseScroll',
                    text: 'mouse scroll y',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockIconURI: warningIcon,
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'currentMouseScrollZ',
                    text: 'mouse scroll z',
                    disableMonitor: false,
                    hideFromPalette: true,
                    blockIconURI: warningIcon,
                    blockType: BlockType.REPORTER
                },
                {
                    blockType: BlockType.LABEL,
                    text: "Base64"
                },
                {
                    opcode: 'base64Encode',
                    text: 'base64 encode [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    }
                },
                {
                    opcode: 'base64Decode',
                    text: 'base64 decode [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "YWJj"
                        }
                    }
                },
                // {
                //     blockType: BlockType.LABEL,
                //     text: "String Character Codes"
                // },
                {
                    opcode: 'fromCharacterCodeString',
                    text: 'character from character code [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    hideFromPalette: true,
                    blockIconURI: warningIcon,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 97
                        }
                    }
                },
                {
                    opcode: 'toCharacterCodeString',
                    text: 'character code of [TEXT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    hideFromPalette: true,
                    blockIconURI: warningIcon,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "a"
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "JS Deflate by BeatGammit"
                },
                {
                    opcode: 'lib_deflate_deflateArray',
                    text: 'deflate [ARRAY]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        ARRAY: {
                            type: ArgumentType.STRING,
                            defaultValue: "[]"
                        }
                    }
                },
                {
                    opcode: 'lib_deflate_inflateArray',
                    text: 'inflate [ARRAY]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        ARRAY: {
                            type: ArgumentType.STRING,
                            defaultValue: "[]"
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "Numerical Encoding by cs2627883"
                },
                {
                    opcode: 'NumericalEncode',
                    blockType: BlockType.REPORTER,
                    text: 'encode [DATA] to number',
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello!'
                        }
                    }
                },
                {
                    opcode: 'NumericalDecode',
                    blockType: BlockType.REPORTER,
                    text: 'decode [ENCODED] from number',
                    arguments: {
                        ENCODED: {
                            type: ArgumentType.STRING,
                            defaultValue: '000072000101000108000108000111000033'
                        }
                    }
                },
                // "---",
                // {
                //     blockType: BlockType.LABEL,
                //     text: "Deprecated blocks"
                // },
                // "---",
                // {
                //     blockType: BlockType.LABEL,
                //     text: "Don't use any of the blocks below."
                // },
                // {
                //     blockType: BlockType.LABEL,
                //     text: "They will be removed soon."
                // },
                // "---",
                // {
                //     blockType: BlockType.LABEL,
                //     text: "(Deprecated) JavaScript"
                // },
                {
                    opcode: 'evaluate',
                    text: 'eval [JAVASCRIPT]',
                    blockType: BlockType.COMMAND,
                    blockIconURI: warningIcon,
                    hideFromPalette: true,
                    arguments: {
                        JAVASCRIPT: {
                            type: ArgumentType.STRING,
                            defaultValue: "console.log('Hello!')"
                        }
                    }
                },
                {
                    opcode: 'evaluate2',
                    text: 'eval [JAVASCRIPT]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    blockIconURI: warningIcon,
                    hideFromPalette: true,
                    arguments: {
                        JAVASCRIPT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Math.random()"
                        }
                    }
                },
                {
                    opcode: 'evaluate3',
                    text: 'eval [JAVASCRIPT]',
                    blockType: BlockType.HAT,
                    blockIconURI: warningIcon,
                    hideFromPalette: true,
                    arguments: {
                        JAVASCRIPT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Math.round(Math.random()) == 1"
                        }
                    }
                }
            ]
        };
    }
    playAudioFromUrl(args) {
        if (!this.audioPlayer) this.audioPlayer = new Audio();
        this.audioPlayer.pause();
        this.audioPlayer.src = `${args.URL}`;
        this.audioPlayer.currentTime = 0;
        this.audioPlayer.play();
    }
    setAudioToLooping() {
        this.audioPlayer.loop = true;
    }
    setAudioToNotLooping() {
        this.audioPlayer.loop = false;
    }
    pauseAudio() {
        this.audioPlayer.pause();
    }
    playAudio() {
        this.audioPlayer.play();
    }
    setAudioPlaybackSpeed(args) {
        this.audioPlayer.playbackRate = (isNaN(Number(args.SPEED)) ? 100 : Number(args.SPEED)) / 100;
    }
    getAudioPlaybackSpeed() {
        return this.audioPlayer.playbackRate * 100;
    }
    setAudioPosition(args) {
        this.audioPlayer.currentTime = isNaN(Number(args.POSITION)) ? 0 : Number(args.POSITION);
    }
    getAudioPosition() {
        return this.audioPlayer.currentTime;
    }
    setAudioVolume(args) {
        this.audioPlayer.volume = (isNaN(Number(args.VOLUME)) ? 100 : Number(args.VOLUME)) / 100;
    }
    getAudioVolume() {
        return this.audioPlayer.volume * 100;
    }
    // eslint-disable-next-line no-unused-vars
    evaluate(args, util, realBlockInfo) {
        return new Promise((resolve, reject) => {
            SandboxRunner.execute(String(args.JAVASCRIPT)).then(result => {
                if (!result.success) {
                    alert(result.value);
                    console.error(result.value);
                    return;
                }
                resolve(result.value)
            })
        })
    }
    // eslint-disable-next-line no-unused-vars
    evaluate2(args, util, realBlockInfo) {
        return new Promise((resolve, reject) => {
            SandboxRunner.execute(String(args.JAVASCRIPT)).then(result => {
                if (!result.success) {
                    console.error(result.value);
                }
                resolve(result.value)
            })
        })
    }
    // eslint-disable-next-line no-unused-vars
    evaluate3(args, util, realBlockInfo) {
        return new Promise((resolve, reject) => {
            SandboxRunner.execute(String(args.JAVASCRIPT)).then(result => {
                if (!result.success) {
                    console.error(result.value);
                }
                resolve(result.value === true)
            })
        })
    }
    screenshotStage() {
        // should we look for an external canvas
        if (this.runtime.prism_screenshot_checkForExternalCanvas) {
            // if so, does one exist (this will check for more than 1 in the future)
            if (this.runtime.prism_screenshot_externalCanvas) {
                // we dont need to check camera permissions since external canvases
                // will never have the ability to get camera data
                return this.runtime.prism_screenshot_externalCanvas.toDataURL();
            }
        }
        
        // renderer will handle not capturing video data
        return new Promise(resolve => {
            vm.renderer.requestSnapshot(uri => {
                resolve(uri);
            });
        });
    }
    dataUriOfCostume(args, util) {
        const index = Number(args.INDEX);
        if (isNaN(index)) return "";
        if (index < 1) return "";

        const target = util.target;
        // eslint-disable-next-line no-undefined
        if (target.sprite.costumes[index - 1] === undefined || target.sprite.costumes[index - 1] === null) return "";
        const dataURI = target.sprite.costumes[index - 1].asset.encodeDataURI();
        return String(dataURI);
    }
    dataUriFromImageUrl(args) {
        return new Promise(resolve => {
            if (window && !window.FileReader) return resolve("");
            if (window && !window.fetch) return resolve("");
            fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(String(args.URL))}`).then(r => {
                r.blob().then(blob => {
                    const reader = new FileReader();
                    reader.onload = e => {
                        resolve(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                })
                    .catch(() => {
                        resolve("");
                    });
            })
                .catch(() => {
                    resolve("");
                });
        });
    }

    dataUriFromArrayBuffer(args) {
        const array = validateArray(args.BUFFER);
        if (!array.isValid) return 'data:text/plain;base64,';
        const buffer = (new Uint8Array(array.array)).buffer;
        let binary = '';
        let bytes = new Uint8Array(buffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        // use "application/octet-stream", we have no idea what the buffer actually contains
        return `data:application/octet-stream;base64,${btoa(binary)}`;
    }
    arrayBufferFromDataUri(args) {
        const dataUrl = Cast.toString(args.URL);
        return new Promise((resolve) => {
            fetch(dataUrl).then(res => {
                res.arrayBuffer().then(buffer => {
                    const array = Array.from(new Uint8Array(buffer));
                    resolve(JSON.stringify(array));
                }).catch(() => {
                    resolve('[]');
                });
            }).catch(() => {
                resolve('[]');
            });
        });
    }

    currentMouseScrollX() {
        return this.mouseScrollDelta.x;
    }
    currentMouseScroll() {
        return this.mouseScrollDelta.y;
    }
    currentMouseScrollZ() {
        return this.mouseScrollDelta.z;
    }
    base64Encode(args) {
        let result = "";
        try {
            result = btoa(String(args.TEXT));
        } catch {
            // what a shame
        }
        return result;
    }
    base64Decode(args) {
        let result = "";
        try {
            result = atob(String(args.TEXT));
        } catch {
            // what a shame
        }
        return result;
    }
    fromCharacterCodeString(args) {
        return String.fromCharCode(args.TEXT);
    }
    toCharacterCodeString(args) {
        return String(args.TEXT).charCodeAt(0);
    }
    lib_deflate_deflateArray(args) {
        const array = validateArray(args.ARRAY).array;

        return JSON.stringify(beatgammit.deflate(array));
    }
    lib_deflate_inflateArray(args) {
        const array = validateArray(args.ARRAY).array;

        return JSON.stringify(beatgammit.inflate(array));
    }

    NumericalEncode(args) {
        const toencode = String(args.DATA);
        let encoded = "";
        for (let i = 0; i < toencode.length; ++i) {
            // Get char code of character
            let encodedchar = String(toencode.charCodeAt(i));
            // Pad encodedchar with 0s to ensure all encodedchars are the same length
            encodedchar = "0".repeat(this.encodeCharacterLength - encodedchar.length) + encodedchar;
            encoded += encodedchar;
        }
        return encoded;
    }
    NumericalDecode(args) {
        const todecode = String(args.ENCODED);
        if (todecode == "") {
            return "";
        }
        let decoded = "";
        // Create regex to split by char length
        const regex = new RegExp('.{1,' + this.encodeCharacterLength + '}', 'g');
        // Split into array of characters
        let encodedchars = todecode.match(regex);
        for (let i = 0; i < encodedchars.length; i++) {
            // Get character from char code
            let decodedchar = String.fromCharCode(encodedchars[i]);
            decoded += decodedchar;
        }
        return decoded;
    }
}

module.exports = JgPrismBlocks;
