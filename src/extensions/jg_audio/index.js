const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const xmlEscape = require("../../util/xml-escape");
const Cast = require('../../util/cast');

const AudioGroup = require("./audio-group");
const AudioSource = require("./audio-source");
const OfflineAudioSource = require("./offline-audio-source");

const BLANK_WAV_FILE = "data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA";

const INPUT_STYLES = `
    margin-top: 0.75rem;
    margin-bottom: 1.5rem;
    width: 100%;
    border: 1px solid var(--ui-black-transparent, hsla(0, 0%, 0%, 0.15));
    border-radius: 5px;
    padding: 0 1rem;
    height: 3rem;
    color: --text-primary;
    font-size: .875rem;
`; // just copying the var menu styles

/**
 * Class for AudioGroups & AudioSources
 * @constructor
 */
class AudioExtension {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;

        /**
         * The audio context for jgExtendedAudio
         * @type {AudioContext}
         */
        this.audioContext = new AudioContext();
        /**
         * The offline audio context for jgExtendedAudio used for rendering.
         * Will be null unless a renderer is prepared for use
         * @type {OfflineAudioContext|null}
         */
        this.offlineAudioContext = null;

        this._renderingAudio = false;

        /**
         * The gain node for jgExtendedAudio
         * @type {GainNode}
         */
        this.audioGainNode = this.audioContext.createGain();
        this.audioGainNode.gain.value = 1;
        this.audioGainNode.connect(this.audioContext.destination);

        /**
         * The audio groups created currently.
         * @type {Object<string, AudioGroup>}
         */
        this.audioGroups = {};

        // connect audio context to PM
        // TODO: registerExtensionAudioContext is going to be reworked so use the new function for clarity on what is being shared with PM
        this.runtime.registerExtensionAudioContext("jgExtendedAudio", this.audioContext, this.audioGainNode);

        // stop sources on end
        this.runtime.on('PROJECT_STOP_ALL', () => {
            for (const audioGroupId in this.audioGroups) {
                const audioGroup = this.audioGroups[audioGroupId];
                for (const sourceId in audioGroup.sources) {
                    const audioSource = audioGroup.sources[sourceId];
                    audioSource.stop();
                }
            }
        });
    }

    // scratch runtime funcs
    deserialize(data) {
        for (const audioGroupId in this.audioGroups) {
            const audioGroup = this.audioGroups[audioGroupId];
            audioGroup.disposeSources();
        }
        this.audioGroups = {};

        if (!data) return;
        for (const serializedAudioGroup of data) {
            const audioGroup = new AudioGroup({
                volume: serializedAudioGroup.globalVolume,
                speed: serializedAudioGroup.globalSpeed,
                detune: serializedAudioGroup.globalPitch,
                pan: serializedAudioGroup.globalPan,
            });
            this.audioGroups[serializedAudioGroup.id] = audioGroup;
        }
    }

    serialize() {
        const serializedAudioGroups = [];
        for (const audioGroupId in this.audioGroups) {
            const audioGroup = this.audioGroups[audioGroupId];
            serializedAudioGroups.push({
                // NOTE: we use the old names for everything here
                // importantly, detune is pitch in the old naming
                id: audioGroupId,
                globalVolume: audioGroup.volume,
                globalSpeed: audioGroup.speed,
                globalPitch: audioGroup.detune,
                globalPan: audioGroup.pan,
            });
        }
        return serializedAudioGroups;
    }

    // metadata
    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        const audioGroupIds = Object.keys(this.audioGroups);
        const hasAudioGroups = audioGroupIds.length > 0;
        return {
            id: 'jgExtendedAudio',
            name: 'Sound Systems',
            color1: '#E256A1',
            color2: '#D33388',
            isDynamic: true,
            blocks: [
                // button handlers
                { opcode: 'createAudioGroupButton', text: 'New Audio Group', blockType: BlockType.BUTTON, },
                {
                    opcode: 'deleteAudioGroupButton', text: 'Remove an Audio Group', blockType: BlockType.BUTTON,
                    hideFromPalette: !hasAudioGroups,
                },
                // blocks
                // audio group list
                {
                    opcode: 'audioGroupGet', text: '[AUDIOGROUP]', blockType: BlockType.REPORTER,
                    arguments: {
                        AUDIOGROUP: { menu: 'audioGroup', defaultValue: '{audioGroupId}', type: ArgumentType.STRING, }
                    },
                    hideFromPalette: true,
                },
                {
                    blockType: BlockType.XML,
                    xml: audioGroupIds.map(audioGroupId => `"<block type=\"jgExtendedAudio_audioGroupGet\"><field name=\"AUDIOGROUP\">${xmlEscape(audioGroupId)}</field></block>"`),
                },
                // Operations
                {
                    text: "Operations", blockType: BlockType.LABEL,
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioGroupSetVolumeSpeedPitchPan', text: 'set [AUDIOGROUP] [VSPP] to [VALUE]%', blockType: BlockType.COMMAND,
                    arguments: {
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        VSPP: { type: ArgumentType.STRING, menu: 'vspp', defaultValue: "" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 100 },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioGroupCopyVolumeSpeedPitchPan', text: 'copy [SRC] settings to [TARGET]', blockType: BlockType.COMMAND,
                    arguments: {
                        SRC: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TARGET: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioGroupGetModifications', text: '[AUDIOGROUP] [OPTION]', blockType: BlockType.REPORTER, disableMonitor: true,
                    arguments: {
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioGroupOptions', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                "---",
                {
                    opcode: 'audioSourceCreate', text: '[CREATEOPTION] source named [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        CREATEOPTION: { type: ArgumentType.STRING, menu: 'createOptions', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceDuplicate2', text: 'duplicate source from [NAME] to [COPY] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        COPY: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceDeleteAll', text: '[DELETEOPTION] all sources in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        DELETEOPTION: { type: ArgumentType.STRING, menu: 'deleteOptions', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                "---",
                {
                    opcode: 'audioSourceSetScratch', text: 'set source [NAME] in [AUDIOGROUP] to clip [SOUND]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        SOUND: { type: ArgumentType.STRING, menu: 'sounds', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceSetUrl', text: 'set source [NAME] in [AUDIOGROUP] to clip [URL]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        URL: { type: ArgumentType.STRING, defaultValue: "https://extensions.turbowarp.org/meow.mp3" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceSetSourceBuffer', text: 'copy clip from source [SRCSOURCE] in [SRCGROUP] into [TARSOURCE] in [TARGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        SRCSOURCE: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        SRCGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TARSOURCE: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        TARGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourcePlayerOption', text: '[PLAYEROPTION] source [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        PLAYEROPTION: { type: ArgumentType.STRING, menu: 'playerOptions', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                "---",
                {
                    opcode: 'audioSourceSetBooleanOption', text: 'set source [NAME] [OPTION] in [AUDIOGROUP] to [BOOL]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        OPTION: { type: ArgumentType.STRING, menu: 'booleanOption' },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        BOOL: { type: ArgumentType.BOOLEAN },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceSetTime2', text: 'set source [NAME] [TIMEPOS] position in [AUDIOGROUP] to [TIME] seconds', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        TIMEPOS: { type: ArgumentType.STRING, menu: 'timePosition' },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TIME: { type: ArgumentType.NUMBER, defaultValue: 0.3 },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceSetVolumeSpeedPitchPan', text: 'set source [NAME] [VSPP] in [AUDIOGROUP] to [VALUE]%', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        VSPP: { type: ArgumentType.STRING, menu: 'vspp', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 100 },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                "---",
                {
                    opcode: 'audioSourceGetModificationsBoolean', text: 'source [NAME] [OPTION] in [AUDIOGROUP]', blockType: BlockType.BOOLEAN, disableMonitor: true,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioSourceOptionsBooleans', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceGetModificationsNormal', text: 'source [NAME] [OPTION] in [AUDIOGROUP]', blockType: BlockType.REPORTER, disableMonitor: true,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioSourceOptions', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceGetDataURL', text: 'generate [WAVOPTION] data: URL from clip in [NAME] in [AUDIOGROUP]', blockType: BlockType.REPORTER, disableMonitor: true,
                    arguments: {
                        WAVOPTION: { type: ArgumentType.STRING, menu: 'wavExportOptions', defaultValue: "16" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: !hasAudioGroups,
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
                // Rendering
                {
                    text: "Rendering", blockType: BlockType.LABEL,
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceRendererCreate', text: 'prepare audio renderer with [SAMPLERATE] hz [CHANNELS] channel audio for [LENGTH] seconds', blockType: BlockType.COMMAND,
                    arguments: {
                        SAMPLERATE: { type: ArgumentType.NUMBER, defaultValue: 44100 },
                        CHANNELS: { type: ArgumentType.NUMBER, defaultValue: 2 },
                        LENGTH: { type: ArgumentType.NUMBER, defaultValue: 10 },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceRendererExecute', text: 'render audio clip into source [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        DURATION: { type: ArgumentType.NUMBER, defaultValue: 5 },
                    },
                    hideFromPalette: !hasAudioGroups,
                },
                {
                    opcode: 'audioSourceRendererRendering', text: 'audio renderer rendering?', blockType: BlockType.BOOLEAN, disableMonitor: true,
                    hideFromPalette: !hasAudioGroups,
                },
                
                // deleted blocks
                {
                    opcode: 'audioSourceSetTime', text: 'set source [NAME] start position in [AUDIOGROUP] to [TIME] seconds', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TIME: { type: ArgumentType.NUMBER, defaultValue: 0.3 },
                    },
                    hideFromPalette: true,
                },
                {
                    opcode: 'audioSourceDuplicate', text: 'weakly duplicate source from [NAME] to [COPY] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        COPY: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                    hideFromPalette: true,
                },
                {
                    opcode: 'audioSourceSetLoop', text: 'set source [NAME] in [AUDIOGROUP] to [LOOP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        LOOP: { type: ArgumentType.STRING, menu: 'loop', defaultValue: "loop" },
                    },
                    hideFromPalette: true,
                },
            ],
            menus: {
                audioGroup: 'fetchAudioGroupMenu',
                sounds: 'fetchScratchSoundMenu',
                // specific menus
                vspp: {
                    acceptReporters: true,
                    items: [
                        { text: "volume", value: "volume" },
                        { text: "speed", value: "speed" },
                        { text: "detune", value: "pitch" },
                        { text: "pan", value: "pan" },
                    ]
                },
                playerOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "play", value: "play" },
                        { text: "pause", value: "pause" },
                        { text: "stop", value: "stop" },
                    ]
                },
                loop: {
                    acceptReporters: true,
                    items: [
                        { text: "loop", value: "loop" },
                        { text: "not loop", value: "not loop" },
                    ]
                },
                booleanOption: {
                    acceptReporters: true,
                    items: [
                        { text: "looping", value: "looping" },
                        { text: "audible in render", value: "audible in render" },
                    ]
                },
                timePosition: {
                    acceptReporters: true,
                    items: [
                        { text: "time", value: "time" },
                        { text: "start", value: "start" },
                        { text: "end", value: "end" },
                        { text: "start loop", value: "start loop" },
                        { text: "end loop", value: "end loop" },
                        { text: "render time", value: "render time" },
                    ]
                },
                deleteOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "delete", value: "delete" },
                        { text: "play", value: "play" },
                        { text: "pause", value: "pause" },
                        { text: "stop", value: "stop" },
                    ]
                },
                createOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "create", value: "create" },
                        { text: "delete", value: "delete" },
                    ]
                },
                // audio group stuff
                audioGroupOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "volume", value: "volume" },
                        { text: "speed", value: "speed" },
                        { text: "detune", value: "pitch" },
                        { text: "pan", value: "pan" },
                    ]
                },
                // audio source stuff
                audioSourceOptionsBooleans: {
                    acceptReporters: true,
                    items: [
                        { text: "playing", value: "playing" },
                        { text: "paused", value: "paused" },
                        { text: "looping", value: "looping" },
                        { text: "audible in render", value: "audible in render" }
                    ]
                },
                audioSourceOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "volume", value: "volume" },
                        { text: "speed", value: "speed" },
                        { text: "detune", value: "pitch" },
                        { text: "pan", value: "pan" },
                        { text: "calculated speed", value: "calculated speed" },
                        { text: "output volume", value: "output volume" },
                        { text: "spectral peak", value: "spectral peak" },
                        { text: "time position", value: "time position" },
                        { text: "start position", value: "start position" },
                        { text: "end position", value: "end position" },
                        { text: "start loop position", value: "start loop position" },
                        { text: "end loop position", value: "end loop position" },
                        { text: "render time position", value: "render time position" },
                        { text: "sound length", value: "sound length" },
                        { text: "origin clip name", value: "origin sound" },
                    ]
                },
                wavExportOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "16-bit PCM", value: "16" },
                        { text: "32-bit float", value: "32" },
                    ]
                },
            }
        };
    }

    // button handlers
    createAudioGroupButton() {
        // @ts-expect-error
        if (typeof ScratchBlocks === "undefined") return;
        const audioGroupIds = Object.keys(this.audioGroups);
        const defaultGroupId = 'audio group ' + (audioGroupIds.length + 1);

        // create modal
        // https://docs.penguinmod.com/development/extensions/api/custom-modals/
        const input = document.createElement("input");
        input.type = "text";
        input.value = defaultGroupId;
        input.style = INPUT_STYLES;

        let promptHandle = null;
        ScratchBlocks.customPrompt({
            title: "New Audio Group",
        }, {
            content: { width: "360px" }
        }, [
            {
                name: "OK", role: "ok", dontClose: true, callback: () => {
                    const newGroupId = input.value;
                    if (this.audioGroups[newGroupId])
                        // replicate scratch menu behavior
                        return alert(`An audio group named "${newGroupId}" already exists.`);
                    promptHandle.closePrompt();
                    this.createAudioGroupButtonResult(newGroupId);
                }
            },
            { name: "Cancel", role: "close", callback: () => {} }
        ], (handle) => {
            promptHandle = handle;
        }).then(modal => {
            const header = document.createElement("p");
            header.innerHTML = "New audio group name:";
            modal.appendChild(header);
            modal.appendChild(input);

            input.onkeydown = (event) => {
                if (event.key === "Enter") {
                    const okButton = (promptHandle.customPromptObject.buttons || []).find(button => button.role === "ok");
                    okButton.callback();
                }
            };
            input.focus();
        });
    }
    createAudioGroupButtonResult(newGroupId) {
        if (!newGroupId) return;
        if (this.audioGroups[newGroupId]) return;

        // make the new audio group
        const audioGroup = new AudioGroup();
        this.audioGroups[newGroupId] = audioGroup;

        this.runtime.vm.emitWorkspaceUpdate();
        this.serialize();
    }
    deleteAudioGroupButton() {
        // @ts-expect-error
        if (typeof ScratchBlocks === "undefined") return;

        // create modal
        // https://docs.penguinmod.com/development/extensions/api/custom-modals/
        const select = document.createElement("select");
        select.value = "";
        select.style = INPUT_STYLES;

        ScratchBlocks.customPrompt({
            title: "Delete Audio Group",
        }, {
            content: { width: "360px" }
        }, [
            {
                name: "Delete", role: "ok", style: { background: "rgb(255, 92, 92)" }, callback: () => {
                    const groupId = select.value;
                    this.deleteAudioGroupButtonResult(groupId);
                }
            },
            { name: "Cancel", role: "close", callback: () => {} }
        ]).then(modal => {
            const header = document.createElement("p");
            header.innerHTML = "Delete audio group named:";
            modal.appendChild(header);
            modal.appendChild(select);

            for (const audioGroupId in this.audioGroups) {
                const option = document.createElement("option");
                option.value = audioGroupId;
                option.innerText = audioGroupId;
                select.appendChild(option);
            }
        });
    }
    deleteAudioGroupButtonResult(groupId) {
        if (!groupId) return;
        const group = this.audioGroups[groupId];
        if (!group) return;

        // delete the audio group
        group.disposeSources();
        delete this.audioGroups[groupId];

        this.runtime.vm.emitWorkspaceUpdate();
        this.serialize();
    }

    // menus
    fetchAudioGroupMenu() {
        const audioGroupIds = Object.keys(this.audioGroups);
        if (audioGroupIds.length <= 0) {
            return [
                {
                    text: '',
                    value: ''
                }
            ];
        }
        return audioGroupIds.map(audioGroupId => ({
            text: audioGroupId,
            value: audioGroupId
        }));
    }
    fetchScratchSoundMenu() {
        const sounds = this.runtime.vm.editingTarget.sprite.sounds; // this function only gets used in the editor so we are safe to use editingTarget
        if (sounds.length <= 0) return [{ text: '', value: '' }];
        return sounds.map(sound => ({
            text: sound.name,
            value: sound.name
        }));
    }

    // blocks
    // audio group list
    audioGroupGet(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        return JSON.stringify(Object.keys(audioGroup.sources));
    }

    // Operations
    audioGroupSetVolumeSpeedPitchPan(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        switch (args.VSPP) {
            case "volume":
                audioGroup.volume = Math.min(Math.max(Cast.toNumber(args.VALUE) / 100, 0), 1);
                break;
            case "speed":
                audioGroup.speed = Math.min(Math.max(Cast.toNumber(args.VALUE) / 100, 0), Infinity);
                break;
            case "detune":
            case "pitch":
                audioGroup.detune = Cast.toNumber(args.VALUE);
                break;
            case "pan":
                audioGroup.pan = Math.min(Math.max(Cast.toNumber(args.VALUE), -100), 100) / 100;
                break;
        }
        audioGroup.updateSources();
    }
    audioGroupCopyVolumeSpeedPitchPan(args) {
        const sourceGroup = this.audioGroups[args.SRC];
        if (!sourceGroup) return;
        const targetGroup = this.audioGroups[args.TARGET];
        if (!targetGroup) return;
        
        targetGroup.volume = sourceGroup.volume;
        targetGroup.speed = sourceGroup.speed;
        targetGroup.detune = sourceGroup.detune;
        targetGroup.pan = sourceGroup.pan;
        targetGroup.updateSources();
    }
    audioGroupGetModifications(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        switch (args.OPTION) {
            case "volume":
                return audioGroup.volume * 100;
            case "speed":
                return audioGroup.speed * 100;
            case "detune":
            case "pitch":
                return audioGroup.detune;
            case "pan":
                return audioGroup.pan * 100;
            default:
                return 0;
        }
    }

    audioSourceCreate(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;

        const audioSourceId = args.NAME;
        switch (args.CREATEOPTION) {
            case "create":
                audioGroup.disposeIfExists(audioSourceId);

                const audioSource = new AudioSource(audioGroup, this);
                audioGroup.sources[audioSourceId] = audioSource;
                break;
            case "delete":
                audioGroup.disposeIfExists(audioSourceId);
                break;
        }
    }
    audioSourceDuplicate(args) { // deleted block
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const origin = Cast.toString(args.NAME);
        const newName = Cast.toString(args.COPY);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[origin];
        if (!audioSource) return;

        // remove it if it already exists
        audioGroup.disposeIfExists(newName);

        const newAudioSource = audioSource.weakClone();
        audioGroup.sources[newName] = newAudioSource;
    }
    audioSourceDuplicate2(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const origin = Cast.toString(args.NAME);
        const newName = Cast.toString(args.COPY);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[origin];
        if (!audioSource) return;

        // remove it if it already exists
        audioGroup.disposeIfExists(newName);

        const newAudioSource = audioSource.clone();
        audioGroup.sources[newName] = newAudioSource;
    }
    audioSourceDeleteAll(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];

        for (const sourceId in audioGroup.sources) {
            const audioSource = audioGroup.sources[sourceId];
            switch (args.DELETEOPTION) {
                case "delete":
                    audioGroup.disposeIfExists(sourceId);
                    break;
                case "play":
                    audioSource.play();
                    break;
                case "pause":
                    audioSource.pause();
                    break;
                case "stop":
                    audioSource.stop();
                    break;
            }
        }
    }

    audioSourceSetScratch(args, util) {
        return new Promise((resolve, reject) => {
            const audioGroup = this.audioGroups[args.AUDIOGROUP];
            if (!audioGroup) return resolve();
            const audioSource = audioGroup.sources[args.NAME];
            if (!audioSource) return resolve();
            const sound = util.target.sprite.sounds.find(sound => sound.name === args.SOUND);
            if (!sound) return resolve();

            // for simplicity just try oneshotting grabbing the buffer
            try {
                // eslint-disable-next-line
                const buffer = util.target.sprite.soundBank.getSoundPlayer(sound.soundId).buffer
                audioSource.src = buffer;
                audioSource.originAudioName = `${args.SOUND}`;
                resolve();
            } catch {
                return resolve();
            }
        });
    }
    audioSourceSetUrl(args, util) {
        return new Promise((resolve, reject) => {
            const audioGroup = this.audioGroups[args.AUDIOGROUP];
            if (!audioGroup) return resolve();
            const audioSource = audioGroup.sources[args.NAME];
            if (!audioSource) return resolve();
            fetch(args.URL).then(response => response.arrayBuffer().then(arrayBuffer => {
                this.audioContext.decodeAudioData(arrayBuffer, buffer => {
                    audioSource.src = buffer;
                    audioSource.originAudioName = `${args.URL}`;
                    resolve();
                }, resolve);
            }).catch(resolve)).catch(async err => {
                // this is not a url, try some other stuff instead
                await this.audioSourceSetScratch({
                    AUDIOGROUP: args.AUDIOGROUP,
                    NAME: args.NAME,
                    SOUND: args.URL,
                }, util);
                return resolve();
            });
        })
    }
    audioSourceSetSourceBuffer(args, util) {
        const sourceGroup = this.audioGroups[args.SRCGROUP];
        if (!sourceGroup) return;
        const sourceSource = sourceGroup.sources[args.SRCSOURCE];
        if (!sourceSource) return;

        const targetGroup = this.audioGroups[args.TARGROUP];
        if (!targetGroup) return;
        const targetSource = targetGroup.sources[args.TARSOURCE];
        if (!targetSource) return;

        // copy source to target
        targetSource.src = sourceSource.src;
        targetSource.originAudioName = sourceSource.originAudioName;
    }
    audioSourcePlayerOption(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;
        if (!["play", "pause", "stop"].includes(args.PLAYEROPTION)) return;
        audioSource[args.PLAYEROPTION]();
    }

    audioSourceSetBooleanOption(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;

        switch (args.OPTION) {
            case "looping":
                audioSource.looping = Cast.toBoolean(args.BOOL);
                break;
            case "audible in render":
                audioSource.renderAudible = Cast.toBoolean(args.BOOL);
                break;
        }
    }
    audioSourceSetLoop(args) { // deleted block
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;

        const stringed = Cast.toString(args.LOOP);
        if (!["loop", "not loop"].includes(stringed)) return;
        audioSource.looping = stringed === "loop";
    }
    audioSourceSetTime(args) { // deleted block
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;
        audioSource.startPosition = Cast.toNumber(args.TIME);
    }
    audioSourceSetTime2(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;
        
        switch (args.TIMEPOS) {
            case "time":
            case "time position":
                audioSource.timePosition = Cast.toNumber(args.TIME);
                break;
            case "start":
            case "start position":
                audioSource.startPosition = Cast.toNumber(args.TIME);
                break;
            case "end":
            case "end position":
                audioSource.endPosition = Cast.toNumber(args.TIME);
                break;
            case "start loop":
            case "start loop position":
                audioSource.loopStartPosition = Cast.toNumber(args.TIME);
                break;
            case "end loop":
            case "end loop position":
                audioSource.loopEndPosition = Cast.toNumber(args.TIME);
                break;
            case "render time":
            case "render time position":
                audioSource.renderTime = Cast.toNumber(args.TIME);
                break;
        }
    }
    audioSourceSetVolumeSpeedPitchPan(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;

        switch (args.VSPP) {
            case "volume":
                audioSource.volume = Math.min(Math.max(Cast.toNumber(args.VALUE) / 100, 0), 1);
                break;
            case "speed":
                audioSource.speed = Math.min(Math.max(Cast.toNumber(args.VALUE) / 100, 0), Infinity);
                break;
            case "detune":
            case "pitch":
                audioSource.detune = Cast.toNumber(args.VALUE);
                break;
            case "pan":
                audioSource.pan = Math.min(Math.max(Cast.toNumber(args.VALUE), -100), 100) / 100;
                break;
        }
        audioSource.update();
    }

    audioSourceGetModificationsBoolean(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return false;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return false;
        switch (args.OPTION) {
            case "playing":
                return audioSource.playing;
            case "paused":
                return audioSource.paused;
            case "looping":
                return audioSource.looping;
            case "audible in render":
                return audioSource.renderAudible;
            default:
                return false;
        }
    }
    audioSourceGetModificationsNormal(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return "";
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return "";
        switch (args.OPTION) {
            case "volume":
                return audioSource.volume * 100;
            case "speed":
                return audioSource.speed * 100;
            case "detune":
            case "pitch":
                return audioSource.detune;
            case "pan":
                return audioSource.pan * 100;
            case "calculated speed":
                return audioSource.playbackRate * 100;
            case "output volume":
                return audioSource.outputVolume * 100;
            case "spectral peak":
                return audioSource.spectralPeak;
            case "time position":
                return audioSource.timePosition;
            case "start position":
                return audioSource.startPosition;
            case "end position":
                return audioSource.endPosition;
            case "start loop position":
                return audioSource.loopStartPosition;
            case "end loop position":
                return audioSource.loopEndPosition;
            case "render time position":
                return audioSource.renderTime;
            case "sound length":
                return audioSource.duration;
            case "origin clip name":
            case "origin sound":
                return audioSource.originAudioName;
            default:
                return "";
        }
    }
    async audioSourceGetDataURL(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return BLANK_WAV_FILE;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return BLANK_WAV_FILE;
        if (!audioSource.src) return BLANK_WAV_FILE;

        let format = "16";
        switch (args.WAVFORMAT) {
            case "16":
            case "16-bit PCM":
                format = "16";
                break;
            case "32":
            case "32-bit float":
                format = "32";
                break;
        }
        return await audioSource.generateDataUrl(format);
    }

    // Mutations
    audioSourceReverse(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        audioSource.reverse();
    }
    audioSourceInvertPhase(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        audioSource.invert();
    }

    // Rendering
    audioSourceRendererCreate(args) {
        if (this._renderingAudio) throw "Cannot prepare a new renderer while rendering";
        let channelCount = Math.min(Math.max(Math.round(Cast.toNumber(args.CHANNELS)), 1), 32);
        let sampleRate = Math.min(Math.max(Math.round(Cast.toNumber(args.SAMPLERATE)), 3000), 768000);
        const length = Cast.toNumber(args.LENGTH);

        // Chrome limits:
        // 1, 32 numberOfChannels
        // 3000, 768000 sampleRate

        // NOTE: We dont fallback here incase the project ENFORCES higher quality rendering.
        // They can decide to fallback if necessary since it's one block to make a new renderer at 44100 hz 2 channel
        this.offlineAudioContext = new OfflineAudioContext({
            numberOfChannels: channelCount,
            sampleRate: sampleRate,
            length: Math.max(sampleRate * length, 1),
        });
    }
    async audioSourceRendererExecute(args) {
        if (this._renderingAudio) throw "Cannot render while rendering";
        if (!this.offlineAudioContext) throw "Cannot render without an unprepared renderer";
        // we save the contents of the render into the target source
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) throw "Target audio group doesn't exist";
        const target = Cast.toString(args.NAME);
        const targetSource = audioGroup.sources[target];
        if (!targetSource) throw "Target audio source doesn't exist";

        const offlineAudioSources = [];
        let audioGainNode = null;
        this._renderingAudio = true;
        try {
            // make the gain node
            audioGainNode = this.offlineAudioContext.createGain();
            audioGainNode.gain.value = 1;
            audioGainNode.connect(this.offlineAudioContext.destination);

            // make offline audio sources for renderAudible sources
            for (const audioGroupId in this.audioGroups) {
                const audioGroup = this.audioGroups[audioGroupId];
                for (const audioSourceId in audioGroup.sources) {
                    const audioSource = audioGroup.sources[audioSourceId];
                    if (!audioSource.renderAudible) continue;

                    // make the offline audio source
                    const offlineAudioSource = audioSource.renderable(this.offlineAudioContext, audioGainNode);
                    offlineAudioSource.update();
                    offlineAudioSources.push(offlineAudioSource);
                }
            }

            // rendering
            for (const offlineAudioSource of offlineAudioSources) {
                offlineAudioSource.play();
            }
            const audioBuffer = await this.offlineAudioContext.startRendering();
            targetSource.src = audioBuffer;
            targetSource.originAudioName = "render";
        } finally {
            this.offlineAudioContext = null;

            // dispose of the nodes we used
            try {
                audioGainNode.disconnect();
            } catch {
                //...
            }
            for (const offlineAudioSource of offlineAudioSources) {
                offlineAudioSource.dispose();
            }

            // mark as not rendering anymore
            this._renderingAudio = false;
        }
    }
    audioSourceRendererRendering() {
        return this._renderingAudio;
    }
}

module.exports = AudioExtension;
