const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const xmlEscape = require("../../util/xml-escape");
const Cast = require('../../util/cast');

/**
 * Class for frontend to jgExtendedAudio effects (jgExtendedAudioEffects)
 * @constructor
 */
class AudioEffectsExtension {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;

        /**
         * jgExtendedAudio instance, if present. The extension will try to load it if possible.
         * @type {import("../jg_audio")|null}
         */
        this.extension = null;
        this.loadDependency();

        // add listeners
        this._extRemovedFunc = this.extensionRemoved.bind(this);
        this.runtime.on('EXTENSION_REMOVED', this._extRemovedFunc);
    }
    extensionRemoved (extensionId) {
        if (extensionId === "jgExtendedAudioEffects") {
            this.runtime.off('EXTENSION_REMOVED', this._extRemovedFunc);
            this._extRemovedFunc = null;
            this.extension = null;
            return;
        }
        if (extensionId === "jgExtendedAudio") this.unloadDependency();
    }

    unloadDependency () {
        const vm = this.runtime.vm;
        this.extension = null;
        this.runtime.vm.emitWorkspaceUpdate();
    }
    loadDependency () {
        const vm = this.runtime.vm;

        // NOTE: The runtime cant load the extension in time for loadDependency if
        // we try to listen for it being re-added. This is why we just tell the
        // user to reload the tab, otherwise trying to add the extension if it's
        // missing can cause hundreds of clones get loaded at once.
        // This would be solved by a real extension dependency system, if we had that.
        if (this.extension) return;
        if (!vm.runtime.ext_jgExtendedAudio)
            vm.extensionManager.loadExtensionIdSync('jgExtendedAudio');
        this.extension = vm.runtime.ext_jgExtendedAudio;
        this.runtime.vm.emitWorkspaceUpdate();
    }

    /**
     * The audio groups created currently.
     * @type {Object<string, import("../jg_audio/audio-group")>}
     */
    get audioGroups () {
        if (!this.extension) return {};
        return this.extension.audioGroups;
    }

    // metadata
    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        const audioGroupIds = Object.keys(this.audioGroups);
        const hasAudioGroups = audioGroupIds.length > 0;
        return {
            id: 'jgExtendedAudioEffects',
            name: 'Sound Systems Effects',
            color1: '#E256A1',
            color2: '#D33388',
            isDynamic: true,
            blocks: [
                // no jgExtendedAudio
                {
                    text: "Sound Systems was removed.", blockType: BlockType.LABEL,
                    hideFromPalette: !!this.extension,
                },
                {
                    text: "Please reload the tab.", blockType: BlockType.LABEL,
                    hideFromPalette: !!this.extension,
                },
                // no audio gorups
                {
                    text: "No Audio Groups: no effect blocks", blockType: BlockType.LABEL,
                    hideFromPalette: (!this.extension) || hasAudioGroups,
                },
                // Mutations
                {
                    text: "Mutations", blockType: BlockType.LABEL,
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceReverse', text: 'reverse clip in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceInvertPhase', text: 'invert phase of clip in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
            ],
            menus: {
                audioGroup: 'fetchAudioGroupMenu',
            },
        };
    }

    // menus
    fetchAudioGroupMenu() {
        if (!this.extension) return [
            {
                text: '',
                value: ''
            }
        ];
        return this.extension.fetchAudioGroupMenu();
    }

    // blocks
    async audioSourceReverse(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        await audioSource.reverse();
    }
    async audioSourceInvertPhase(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        await audioSource.invert();
    }
}

module.exports = AudioEffectsExtension;