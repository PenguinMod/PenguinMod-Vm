// We want to preserve the rotation center of exported SVGs when they are later imported.
// Unfortunately, the SVG itself does not have sufficient information to accomplish this.
// Instead we must add a small amount of extra information to the end of exported SVGs
// that can be read on import.

// Adding this comment in scratch-paint is not a viable approach because the user can
// open projects not made with TurboWarp and we want costumes exported from there to
// have their center saved even if they haven't been edited.

let _TextEncoder;
let _TextDecoder;
if (typeof TextEncoder === 'undefined') {
    _TextEncoder = require('text-encoding').TextEncoder;
    _TextDecoder = require('text-encoding').TextDecoder;
} else {
    _TextEncoder = TextEncoder;
    _TextDecoder = TextDecoder;
}

// Using literal HTML comments tokens will cause this script to be very hard to inline in
// a <script> element, so we'll instead do this terrible hack which the minifier probably
// won't be able to optimize away.
const HTML_COMMENT_START = `<!${'-'.repeat(2)}`;
const HTML_COMMENT_END = `${'-'.repeat(2)}>`;

const ROT_CENTER_REGEX = new RegExp(
    `${HTML_COMMENT_START}rotationCenter:(-?[\\d\\.]+):(-?[\\d\\.]+)${HTML_COMMENT_END}$`
);

const SVG_INNER_REGEX = new RegExp(`<svg[^>]*?>`);

/**
 * @param {string} svgString SVG source
 * @returns {[number, number]|null} The detected rotation center of the SVG, if any.
 */
const parseVectorMetadata = svgString => {
    // TODO: see if this is slow on large strings
    // Note: This can be done at the end of strings, since thats where its injected
    const match = svgString.match(ROT_CENTER_REGEX);
    if (!match) {
        return null;
    }

    const detectedX = +match[1];
    const detectedY = +match[2];
    if (Number.isNaN(detectedX) || Number.isNaN(detectedY)) {
        return null;
    }

    return [detectedX, detectedY];
};

/**
 * @param {Array<Asset>} fonts array of fonts to compile.
 * @returns {string} css string for custom fonts.
 */
const generateCustomFontCSS = (fonts) => {
    let fontCSS = '';
    for (const font of fonts) {
        const base64 = uint8ToBase64(font.asset.data);

        // Normalize format for browser compatibility.
        let format = font.asset.dataFormat.toLowerCase();
        if (format === 'otf') format = 'opentype';
        if (format === 'ttf') format = 'truetype';

        fontCSS += '@font-face {';
        fontCSS += `font-family: "${font.family}";`;
        fontCSS += `src: url('data:font/${format};base64,${base64}') format('${format}');`;
        fontCSS += '}';
    }

    return fontCSS;
};

/**
 * @param {Costume} costume scratch-vm costume object
 * @param {boolean} [optIncludeExtras] determines if we add things like custom fonts to the export
 * @param {VM} [vm] only needed if 'optIncludeExtras' is true, adds a VM context to read fonts from.
 * @returns {Uint8Array} Binary data to export
 */
const exportCostume = (costume, optIncludeExtras, vm) => {
    /** @type {Uint8Array} */
    const originalData = costume.asset.data;

    if (costume.dataFormat !== 'svg') {
        return originalData;
    }

    let decodedData = new _TextDecoder().decode(originalData);

    // It's okay that the regex isn't global because it can only match one item anyways.
    decodedData = decodedData.replace(ROT_CENTER_REGEX, '');

    const centerX = costume.rotationCenterX;
    const centerY = costume.rotationCenterY;
    const extraData = `${HTML_COMMENT_START}rotationCenter:${centerX}:${centerY}${HTML_COMMENT_END}`;
    decodedData += extraData;

    if (optIncludeExtras) {
        if (vm && vm.runtime.fontManager?.fonts) {
            const fonts = vm.runtime.fontManager.fonts.filter(f => !f.system)
                .filter(f => decodedData.includes(`font-family="&quot;${f.family}&quot;, ${f.fallback}"`))

            const cssText = generateCustomFontCSS(fonts);
            if (cssText) {
                const styleElement = `<style type="text/css">${cssText}</style>`;
                decodedData = decodedData.replace(SVG_INNER_REGEX, match => `${match}${styleElement}`);
            }
        } else {
            console.warn('No VM context provided, cannot read custom fonts!');
        }
    }

    return new _TextEncoder().encode(decodedData);
};

module.exports = {
    parseVectorMetadata,
    exportCostume
};
