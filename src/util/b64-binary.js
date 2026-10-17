const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodes any Base64 string. Will not throw errors for invalid text.
 * @param {string} input The Base64 to decode
 * @returns {Uint8Array} The decoded binary
 */
const decode = input => {
    input = input.replace(/[^a-z0-9+/]/gi, '');

    const bytes = Math.floor((input.length / 4) * 3);
    const out = new Uint8Array(bytes);

    let c = 0;
    for (let i = 0; i < bytes; i += 3) {
        // get the 3 octects in 4 ascii chars
        const enc1 = keyStr.indexOf(input.charAt(c++));
        const enc2 = keyStr.indexOf(input.charAt(c++));
        const enc3 = keyStr.indexOf(input.charAt(c++));
        const enc4 = keyStr.indexOf(input.charAt(c++));

        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;

        out[i] = chr1;
        out[i +1] = chr2;
        out[i +2] = chr3;
    }

    return out;
};

/**
 * Encodes any array of bytes.
 * @param {Uint8Array} bytes The bytes to encode
 * @returns {string} The Base64 encoded bytes
 */
const encode = bytes => {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const num = ((bytes[i] << 16) & 0xFF0000) + ((bytes[i +1] << 8) & 0x00FF00) + (bytes[i +2] & 0x0000FF);
        out += keyStr[(num >> 18) & 0x3F];
        out += keyStr[(num >> 12) & 0x3F];
        out += keyStr[(num >> 6) & 0x3F];
        out += keyStr[num & 0x3F];
    }

    return out.replace(/A(?=A*$)/g, '=');
};

/**
 * Encodes a string into Base64 using the UTF8 character set.
 * @param {string} string The text to encode
 * @returns {string} The Base64 encoded text
 */
const encodeString = string => {
    const buf = textEncoder.encode(string);
    return encode(buf);
};

/**
 * Decodes Base64 encoded UTF8/UTF16.
 * @param {string} input The Base64 to decode
 * @returns {string} The decoded text
 */
const decodeString = input => {
    const buf = decode(input);
    return textDecoder.decode(buf);
};


module.exports = {
    encode,
    encodeString,
    decode,
    decodeString
};
