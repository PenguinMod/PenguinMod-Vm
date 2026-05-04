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
        // NOTE: We just hope that the workspace updates because emitWorkspaceUpdate causes errors on load sometimes
        this.extension = vm.runtime.ext_jgExtendedAudio;
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
                    opcode: 'audioSourceAmplify', text: 'amplify clip by [AMOUNT] [METHOD] in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        AMOUNT: { type: ArgumentType.NUMBER, defaultValue: 1 },
                        METHOD: { type: ArgumentType.STRING, menu: 'amplifyMethod', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceTrim', text: '[TRIMOPTION] clip from [START] to [END] seconds in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        TRIMOPTION: { type: ArgumentType.STRING, menu: 'trimOptions', defaultValue: "" },
                        START: { type: ArgumentType.NUMBER, defaultValue: 0 },
                        END: { type: ArgumentType.NUMBER, defaultValue: 1 },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceBasicEffect', text: '[EFFECT] clip in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        EFFECT: { type: ArgumentType.STRING, menu: 'basicEffect', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
            ],
            menus: {
                audioGroup: 'fetchAudioGroupMenu',
                basicEffect: {
                    acceptReporters: true,
                    items: [
                        { text: "silence", value: "silence" },
                        { text: "normalize", value: "normalize" },
                        { text: "reverse", value: "reverse" },
                        { text: "invert", value: "invert" },
                    ]
                },
                amplifyMethod: {
                    acceptReporters: true,
                    items: [
                        { text: "x", value: "x" },
                        { text: "dB", value: "dB" },
                    ]
                },
                trimOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "trim", value: "trim" },
                        { text: "crop", value: "crop" },
                    ]
                },
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
    // Mutations
    async audioSourceAmplify(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;

        const level = Cast.toNumber(args.AMOUNT);
        switch (args.METHOD) {
            case "x":
            case "linear":
            case "linearly":
                return await audioSource.amplify(level);
            case "dB":
            case "db":
            case "decibel":
            case "decibels":
                const logarithmicToLinear = 10 ** (level / 20);
                return await audioSource.amplify(logarithmicToLinear);
        }
    }
    async audioSourceTrim(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        if (!audioSource.src) throw "Cannot mutate an empty audio source"; // copy the cutRegions error message

        // validate, we convert to sample times here to make sure we never exceed src.length
        let start = Math.max(0, Math.round(Cast.toNumber(args.START) * audioSource.src.sampleRate));
        let end = Math.min(Math.round(Cast.toNumber(args.END) * audioSource.src.sampleRate), audioSource.src.length);
        if (start > end) {
            let end2 = end;
            end = start;
            start = end2;
        }

        // now we can do the acutal operation
        switch (args.TRIMOPTION) {
            case "trim":
                return await audioSource.cutRegions([ start, end ]);
            case "crop":
                return await audioSource.cutRegions([ 0, start, end, audioSource.src.length ]);
        }
    }
    async audioSourceBasicEffect(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;

        switch (args.EFFECT) {
            case "silence":
                return await audioSource.silence();
            case "normalize":
                return await audioSource.normalize();
            case "reverse":
                return await audioSource.reverse();
            case "invert":
                return await audioSource.invert();
        }
    }
}

module.exports = AudioEffectsExtension;