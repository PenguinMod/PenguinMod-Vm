class extensionsPatch {
    /**
     * constructor
     * @param {Runtime} runtime runtime
     */
    constructor (runtime) {
        this.runtime = runtime;
        this.extensions = {};
        this.loaded = [];
    }

    /**
     * replaces a core extension with a external extension for the loader
     * @param {string} id extension id
     * @param {string} url new extension url
     * @param {object} extensions sb3 loader extension object
     */
    basicPatch (id, url, extensions) {
        extensions.extensionURLs.set(id, url);
    }

    /**
     * runs the patch for an extension
     * @param {string} id the extension to patch
     * @param {object} extensions the extensions object
     * @param {Blocks} object all of the blocks
     */
    runExtensionPatch (id, extensions, object) {
        const patch = this.extensions[id];
        if (typeof patch === 'object') {
            if (!this.loaded.includes(id)) {
                // patch to fix added urls not loading
                this.runtime.extensionManager.loadExtensionURL(patch.url);
                this.loaded.push(id);
            }
            this.basicPatch(patch.id, patch.url, extensions);
            return;
        }
        patch(extensions, object, this.runtime);
    }

    /**
     * registers extension patches to the patcher
     * @param {object} list a list of patches to register
     */
    registerExtensions (list) {
        this.extensions = Object.assign(this.extensions, list);
    }

    /**
     * gets if a patch exists for an extension
     * @param {string} id the extension id to check
     * @returns {boolean} if the given extension exists
     */
    patchExists (id) {
        return !!this.extensions[id];
    }
}

module.exports = extensionsPatch;
