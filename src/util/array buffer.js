class bufferUtil {
    /**
     * converts an array buffer into an array
     * @param {ArrayBuffer} buffer the buffer to convert
     * @param {Function|undefined} process a function to run on every item before converting it
     * @returns {Array} the converted array
     */
    bufferToArray (buffer, process) {
        buffer = new DataView(buffer);
        const array = [];
        const processNum = typeof process === 'function' 
            ? process 
            : num => num;
        for (let idx = 0; idx < buffer.byteLength; idx++) {
            const number = buffer.getUint8(idx);
            array.push(processNum(number));
        }
        return array;
    }

    arrayToBuffer (array, patch) {
        patch = typeof process === 'function' 
            ? patch 
            : num => num;
        const buffer = new ArrayBuffer(array.length);
        const view = new DataView(buffer);
        array.forEach((byte, offset) => {
            byte = patch(byte);
            view.setUint8(offset, byte);
        });
        return view.buffer;
    }

    uint8ArrayToBuffer (array) {
        return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
    }
    bufferToUint8Array (buffer) {
        return new Uint8Array(buffer);
    }
    
    /**
     * converts a buffer into a string of hex bytes
     * @param {ArrayBuffer} buffer the array buffer to convert
     * @param {string|undefined} spacer what to put inbetween each byte
     * @param {Function|undefined} process a function to run on every item before converting it
     * @returns {string} the string of bytes
     */
    bufferToString (buffer, spacer, process) {
        if (!spacer) spacer = ' ';
        const array = this.bufferToArray(buffer)
            .map(typeof process === 'function' 
                ? process 
                : num => num.toString(16))
            .map(byte => {
                if (byte.length < 2) return `0${byte}`;
                return byte;
            });
        return array.join(spacer);
    }
}

module.exports = bufferUtil;
