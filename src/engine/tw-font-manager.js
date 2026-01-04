const EventEmitter = require('events');
const AssetUtil = require('../util/tw-asset-util');
const StringUtil = require('../util/string-util');
const log = require('../util/log');

/**
 * @typedef InternalFont
 * @property {boolean} system True if the font is built in to the system
 * @property {string} family The font's name
 * @property {string} fallback Fallback font family list
 * @property {Asset} [asset] scratch-storage asset if system: false
 */

class FontManager extends EventEmitter {
    /**
     * @param {Runtime} runtime The runtime
     */
    constructor(runtime) {
        super();
        this.runtime = runtime;
        /** @type {Array<InternalFont>} */
        this.fonts = [];
    }

    /**
     * @param {string} family An unknown font family
     * @returns {boolean} true if the family is valid
     */
    isValidFamily(family) {
        return /^[-\w ]+$/.test(family);
    }

    /**
     * @param {string} family The family to check
     * @returns {boolean} If the font exists
     */
    hasFont(family) {
        return !!this.fonts.find(i => i.family === family);
    }

    /**
     * @param {string} family The family to name
     * @returns {string} The new safe name to use
     */
    getSafeName(family) {
        family = family.replace(/[^-\w ]/g, '');
        return StringUtil.unusedName(family, this.fonts.map(i => i.family));
    }

    changed() {
        this.emit('change');
    }

    /**
     * @param {string} family The font family to add
     * @param {string} fallback The font that should be used if it doesnt exist
     * @emits change
     */
    addSystemFont(family, fallback) {
        if (!this.isValidFamily(family)) {
            throw new Error('Invalid family');
        }
        this.fonts.push({
            system: true,
            family,
            fallback
        });
        this.changed();
    }

    /**
     * @param {string} family The name of this font
     * @param {string} fallback The font that should be used if it doesnt exist
     * @param {Asset} asset scratch-storage asset
     */
    addCustomFont(family, fallback, asset) {
        if (!this.isValidFamily(family)) {
            throw new Error('Invalid family');
        }

        this.fonts.push({
            system: false,
            family,
            fallback,
            asset
        });

        this.updateRenderer();
        this.changed();
    }

    /**
     * @returns {Array<{
     *  system: boolean,
     *  name: string,
     *  family: string?,
     *  data: Uint8Array,
     *  format: string?
     * }>} All known fonts for this instance
     */
    getFonts() {
        return this.fonts.map(font => ({
            system: font.system,
            name: font.family,
            family: `"${font.family}", ${font.fallback}`,
            data: font.asset ? font.asset.data : null,
            format: font.asset ? font.asset.dataFormat : null
        }));
    }

    /**
     * @param {number} index Corresponds to index from getFonts()
     */
    deleteFont(index) {
        const [removed] = this.fonts.splice(index, 1);
        if (!removed.system) {
            this.updateRenderer();
        }
        this.changed();
    }

    clear() {
        const hadNonSystemFont = this.fonts.some(i => !i.system);
        this.fonts = [];
        if (hadNonSystemFont) {
            this.updateRenderer();
        }
        this.changed();
    }

    updateRenderer() {
        if (!this.runtime.renderer || !this.runtime.renderer.setCustomFonts) {
            return;
        }

        const fontfaces = {};
        for (const font of this.fonts) {
            if (!font.system) {
                const uri = font.asset.encodeDataURI();
                const fontface = `@font-face { font-family: "${font.family}"; src: url("${uri}"); }`;
                const family = `"${font.family}", ${font.fallback}`;
                fontfaces[family] = fontface;
            }
        }
        this.runtime.renderer.setCustomFonts(fontfaces);
    }

    /**
     * Get data to save in project.json and sb3 files.
     * @returns {Array<{ system: string, family: string, fallback: string, md5ext: string? }>} The serialized fonts
     */
    serializeJSON() {
        if (this.fonts.length === 0) {
            return null;
        }

        return this.fonts.map(font => {
            const serialized = {
                system: font.system,
                family: font.family,
                fallback: font.fallback
            };

            if (!font.system) {
                const asset = font.asset;
                serialized.md5ext = `${asset.assetId}.${asset.dataFormat}`;
            }

            return serialized;
        });
    }

    /**
     * @returns {Asset[]} list of scratch-storage assets
     */
    serializeAssets() {
        return this.fonts
            .filter(i => !i.system)
            .map(i => i.asset);
    }

    /**
     * @param {Array<{ system: string, family: string, fallback: string, md5ext: string? }>} json The output of serializeJSON
     * @param {JSZip} [zip] The zip that contains the project.json file, if missing then none-system fonts will not load
     * @param {boolean} [keepExisting=false] If the current fonts should remain installed
     * @returns {Promise<void>} Resolves once all fonts are loaded
     */
    async deserialize(json, zip, keepExisting) {
        if (!keepExisting) {
            this.clear();
        }

        if (!Array.isArray(json)) {
            return;
        }

        for (const font of json) {
            if (!font || typeof font !== 'object') {
                continue;
            }

            try {
                const system = font.system;
                const family = font.family;
                const fallback = font.fallback;
                if (
                    typeof system !== 'boolean' ||
                    typeof family !== 'string' ||
                    typeof fallback !== 'string' ||
                    this.hasFont(family)
                ) {
                    continue;
                }

                if (system) {
                    this.addSystemFont(family, fallback);
                } else {
                    const md5ext = font.md5ext;
                    if (typeof md5ext !== 'string') {
                        continue;
                    }

                    const asset = await AssetUtil.getByMd5ext(
                        this.runtime,
                        zip,
                        this.runtime.storage.AssetType.Font,
                        md5ext
                    );
                    this.addCustomFont(family, fallback, asset);
                }
            } catch (e) {
                log.error('could not add font', e);
            }
        }
    }
}

module.exports = FontManager;