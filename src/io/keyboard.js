const Cast = require('../util/cast');

/**
 * Names used internally for keys used in scratch, also known as "scratch keys".
 * @enum {string}
 */
const KEY_NAME = {
    SPACE: 'space',
    LEFT: 'left arrow',
    UP: 'up arrow',
    RIGHT: 'right arrow',
    DOWN: 'down arrow',
    ENTER: 'enter',
    // tw: extra keys
    BACKSPACE: 'backspace',
    DELETE: 'delete',
    SHIFT: 'shift',
    CAPS_LOCK: 'caps lock',
    SCROLL_LOCK: 'scroll lock',
    CONTROL: 'control',
    ESCAPE: 'escape',
    INSERT: 'insert',
    HOME: 'home',
    END: 'end',
    PAGE_UP: 'page up',
    PAGE_DOWN: 'page down'
};

/**
 * A set of the names of Scratch keys.
 * @type {Set<string>}
 */
const KEY_NAME_SET = new Set(Object.values(KEY_NAME));

class Keyboard {
    constructor (runtime) {
        /**
         * List of currently pressed scratch keys.
         * A scratch key is:
         * A key you can press on a keyboard, excluding modifier keys.
         * An uppercase string of length one;
         *     except for special key names for arrow keys and space (e.g. 'left arrow').
         * Can be a non-english unicode letter like: æ ø ש נ 手 廿.
         * @type{Array.<string>}
         */
        this._keysPressed = [];
        /**
         * pm: ditto of above, but only when hit on that step
         * @type{Array.<string>}
         */
        this._keysHit = [];
        this._keysHitOnStep = {}; // key: the key pressed, value: the step they were pressed on
        this._keyTimestamps = {};
        /**
         * Reference to the owning Runtime.
         * Can be used, for example, to activate hats.
         * @type{!Runtime}
         */
        this.runtime = runtime;
        // tw: track last pressed key
        this.lastKeyPressed = '';
        this._numeralKeyCodesToStringKey = new Map();
        /**
         * Set of Scratch keys used by the project.
         */
        this._usedKeys = new Set();
        
        this.runtime.on("RUNTIME_STEP_END", () => {
            const newHitKeys = [];
            for (const key of this._keysHit) {
                const stepKeyPressedOn = this._keysHitOnStep[key] || -1;
                if (this.runtime.frameLoop._stepCounter <= stepKeyPressedOn) {
                    newHitKeys.push(key);
                }
            }

            // replace with the keys that are now pressed
            this._keysHit = newHitKeys;
        });
    }

    /**
     * Convert from a keyboard event key name to a Scratch key name.
     * @param  {string} keyString the input key string.
     * @return {string} the corresponding Scratch key, or an empty string.
     */
    _keyStringToScratchKey (keyString) {
        keyString = Cast.toString(keyString);
        // Convert space and arrow keys to their Scratch key names.
        switch (keyString) {
        case ' ': return KEY_NAME.SPACE;
        case 'ArrowLeft':
        case 'Left': return KEY_NAME.LEFT;
        case 'ArrowUp':
        case 'Up': return KEY_NAME.UP;
        case 'Right':
        case 'ArrowRight': return KEY_NAME.RIGHT;
        case 'Down':
        case 'ArrowDown': return KEY_NAME.DOWN;
        case 'Enter': return KEY_NAME.ENTER;
        // tw: extra keys
        case 'Backspace': return KEY_NAME.BACKSPACE;
        case 'Delete': return KEY_NAME.DELETE;
        case 'Shift': return KEY_NAME.SHIFT;
        case 'CapsLock': return KEY_NAME.CAPS_LOCK;
        case 'ScrollLock': return KEY_NAME.SCROLL_LOCK;
        case 'Control': return KEY_NAME.CONTROL;
        case 'Escape': return KEY_NAME.ESCAPE;
        case 'Insert': return KEY_NAME.INSERT;
        case 'Home': return KEY_NAME.HOME;
        case 'End': return KEY_NAME.END;
        case 'PageUp': return KEY_NAME.PAGE_UP;
        case 'PageDown': return KEY_NAME.PAGE_DOWN;
        }
        // Ignore modifier keys
        if (keyString.length > 1) {
            return '';
        }
        // tw: toUpperCase() happens later. We need to track key case.
        return keyString;
    }

    /**
     * Convert from a block argument to a Scratch key name.
     * @param  {string} keyArg the input arg.
     * @return {string} the corresponding Scratch key.
     */
    _keyArgToScratchKey (keyArg) {
        // If a number was dropped in, try to convert from ASCII to Scratch key.
        if (typeof keyArg === 'number') {
            // Check for the ASCII range containing numbers, some punctuation,
            // and uppercase letters.
            if (keyArg >= 48 && keyArg <= 90) {
                return String.fromCharCode(keyArg);
            }
            switch (keyArg) {
            case 32: return KEY_NAME.SPACE;
            case 37: return KEY_NAME.LEFT;
            case 38: return KEY_NAME.UP;
            case 39: return KEY_NAME.RIGHT;
            case 40: return KEY_NAME.DOWN;
            }
        }

        keyArg = Cast.toString(keyArg);

        // If the arg matches a special key name, return it.
        // No special keys have a name that is only 1 character long, so we can avoid the lookup
        // entirely in the most common case.
        if (keyArg.length > 1 && KEY_NAME_SET.has(keyArg)) {
            return keyArg;
        }

        // Use only the first character.
        if (keyArg.length > 1) {
            keyArg = keyArg[0];
        }

        // Check for the space character.
        if (keyArg === ' ') {
            return KEY_NAME.SPACE;
        }
        // tw: support Scratch 2 hacked blocks
        // There are more hacked blocks but most of them get mangled by Scratch 2 -> Scratch 3 conversion
        if (keyArg === '\r') {
            // this probably belongs upstream
            return KEY_NAME.ENTER;
        }
        if (keyArg === '\u001b') {
            return KEY_NAME.ESCAPE;
        }

        return keyArg.toUpperCase();
    }

    /**
     * Keyboard DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        if (!data.key) return;
        // tw: convert single letter keys to uppercase because of changes in _keyStringToScratchKey
        const scratchKeyCased = this._keyStringToScratchKey(data.key);
        const scratchKey = scratchKeyCased.length === 1 ? scratchKeyCased.toUpperCase() : scratchKeyCased;
        if (scratchKey === '') return;
        const index = this._keysPressed.indexOf(scratchKey);
        if (data.isDown) {
            // tw: track last pressed key
            this.lastKeyPressed = scratchKeyCased;
            this.runtime.emit('KEY_PRESSED', scratchKey);
            // If not already present, add to the list.
            if (index < 0) {
                this._keysPressed.push(scratchKey);
                this._keyTimestamps[scratchKey] = Date.now();
                
                this._keysHit.push(scratchKey);
                this._keysHitOnStep[scratchKey] = this.runtime.frameLoop._stepCounter;
                this.runtime.emit('KEY_HIT', scratchKey);
            }
        } else if (index > -1) {
            // If already present, remove from the list.
            this._keysPressed.splice(index, 1);
            if (scratchKey in this._keyTimestamps) {
                delete this._keyTimestamps[scratchKey];
            }
        }
        // Fix for https://github.com/LLK/scratch-vm/issues/2271
        if (Object.prototype.hasOwnProperty.call(data, 'keyCode')) {
            const keyCode = data.keyCode;
            if (this._numeralKeyCodesToStringKey.has(keyCode)) {
                const lastKeyOfSameCode = this._numeralKeyCodesToStringKey.get(keyCode);
                if (lastKeyOfSameCode !== scratchKey) {
                    const indexToUnpress = this._keysPressed.indexOf(lastKeyOfSameCode);
                    if (indexToUnpress !== -1) {
                        this._keysPressed.splice(indexToUnpress, 1);
                        if (scratchKey in this._keyTimestamps) {
                            delete this._keyTimestamps[lastKeyOfSameCode];
                        }
                    }
                }
            }
            this._numeralKeyCodesToStringKey.set(keyCode, scratchKey);
        }
    }

    /**
     * Get key down state for a specified key.
     * @param  {Any} keyArg key argument.
     * @return {boolean} Is the specified key down?
     */
    getKeyIsDown (keyArg) {
        if (keyArg === 'any') {
            return this._keysPressed.length > 0;
        }
        const scratchKey = this._keyArgToScratchKey(keyArg);
        this._usedKeys.add(scratchKey);
        return this._keysPressed.indexOf(scratchKey) > -1;
    }

    getKeyIsHit (keyArg) {
        if (keyArg === 'any') {
            return this._keysHit.length > 0;
        }
        const scratchKey = this._keyArgToScratchKey(keyArg);
        this._usedKeys.add(scratchKey);
        return this._keysHit.indexOf(scratchKey) > -1;
    }

    // tw: expose last pressed key
    getLastKeyPressed () {
        return this.lastKeyPressed;
    }

    getAllKeysPressed() {
        return this._keysPressed;
    }
    
    getKeyTimestamp (keyArg) {
        if (keyArg === 'any') {
            // loop through all keys and see which one we have held the longest
            let oldestTimestamp = Infinity;
            let found = false;
            for (const keyName in this._keyTimestamps) {
                const timestamp = this._keyTimestamps[keyName];
                if (timestamp < oldestTimestamp) {
                    oldestTimestamp = timestamp;
                    found = true;
                }
            }
            if (!found) return 0;
            return oldestTimestamp;
        }
        // everything else
        const scratchKey = this._keyArgToScratchKey(keyArg);
        if (!(scratchKey in this._keyTimestamps)) {
            return 0;
        }
        return this._keyTimestamps[scratchKey];
    }
    getKeyTimestamps () {
        return this._keyTimestamps;
    }

    /**
     * @param {string} scratchKey Scratch key
     * @returns {boolean} true if the project has used this key
     */
    hasUsedKey (scratchKey) {
        return this._usedKeys.has(scratchKey);
    }
}

module.exports = Keyboard;
