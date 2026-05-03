const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

const AudioGroup = require("./audio-group");
const AudioSource = require("./audio-source");

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

    orderCategoryBlocks(blocks) {
        const buttons = {
            create: blocks[0],
            delete: blocks[1]
        };
        const varBlock = blocks[2];
        blocks.splice(0, 3);
        // create the variable block xml's
        const varBlocks = Object.keys(this.audioGroups).map(audioGroupId => varBlock.replace('{audioGroupId}', audioGroupId));
        if (varBlocks.length <= 0) {
            return [buttons.create];
        }
        // push the button to the top of the var list
        varBlocks.reverse();
        varBlocks.push(buttons.delete);
        varBlocks.push(buttons.create);
        // merge the category blocks and variable blocks into one block list
        blocks = varBlocks
            .reverse()
            .concat(blocks);
        return blocks;
    }

    // metadata
    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgExtendedAudio',
            name: 'Sound Systems',
            color1: '#E256A1',
            color2: '#D33388',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks.bind(this),
            blocks: [
                { opcode: 'createAudioGroup', text: 'New Audio Group', blockType: BlockType.BUTTON, },
                { opcode: 'deleteAudioGroup', text: 'Remove an Audio Group', blockType: BlockType.BUTTON, },
                {
                    opcode: 'audioGroupGet', text: '[AUDIOGROUP]', blockType: BlockType.REPORTER,
                    arguments: {
                        AUDIOGROUP: { menu: 'audioGroup', defaultValue: '{audioGroupId}', type: ArgumentType.STRING, }
                    },
                },
                { text: "Operations", blockType: BlockType.LABEL, },
                {
                    opcode: 'audioGroupSetVolumeSpeedPitchPan', text: 'set [AUDIOGROUP] [VSPP] to [VALUE]%', blockType: BlockType.COMMAND,
                    arguments: {
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        VSPP: { type: ArgumentType.STRING, menu: 'vspp', defaultValue: "" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 100 },
                    },
                },
                {
                    opcode: 'audioGroupGetModifications', text: '[AUDIOGROUP] [OPTION]', blockType: BlockType.REPORTER, disableMonitor: true,
                    arguments: {
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioGroupOptions', defaultValue: "" },
                    },
                },
                "---",
                {
                    opcode: 'audioSourceCreate', text: '[CREATEOPTION] audio source named [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        CREATEOPTION: { type: ArgumentType.STRING, menu: 'createOptions', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                {
                    opcode: 'audioSourceDuplicate2', text: 'duplicate audio source from [NAME] to [COPY] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        COPY: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                {
                    opcode: 'audioSourceReverse', text: 'reverse audio source used in [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        COPY: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                {
                    opcode: 'audioSourceDeleteAll', text: '[DELETEOPTION] all audio sources in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        DELETEOPTION: { type: ArgumentType.STRING, menu: 'deleteOptions', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                "---",
                {
                    opcode: 'audioSourceSetScratch', text: 'set audio source [NAME] in [AUDIOGROUP] to use [SOUND]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        SOUND: { type: ArgumentType.STRING, menu: 'sounds', defaultValue: "" },
                    },
                },
                {
                    opcode: 'audioSourceSetUrl', text: 'set audio source [NAME] in [AUDIOGROUP] to use [URL]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        URL: { type: ArgumentType.STRING, defaultValue: "https://extensions.turbowarp.org/meow.mp3" },
                    },
                },
                {
                    opcode: 'audioSourcePlayerOption', text: '[PLAYEROPTION] audio source [NAME] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        PLAYEROPTION: { type: ArgumentType.STRING, menu: 'playerOptions', defaultValue: "" },
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                "---",
                {
                    opcode: 'audioSourceSetLoop', text: 'set audio source [NAME] in [AUDIOGROUP] to [LOOP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        LOOP: { type: ArgumentType.STRING, menu: 'loop', defaultValue: "loop" },
                    },
                },
                {
                    opcode: 'audioSourceSetTime2', text: 'set audio source [NAME] [TIMEPOS] position in [AUDIOGROUP] to [TIME] seconds', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        TIMEPOS: { type: ArgumentType.STRING, menu: 'timePosition' },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TIME: { type: ArgumentType.NUMBER, defaultValue: 0.3 },
                    },
                },
                {
                    opcode: 'audioSourceSetVolumeSpeedPitchPan', text: 'set audio source [NAME] [VSPP] in [AUDIOGROUP] to [VALUE]%', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        VSPP: { type: ArgumentType.STRING, menu: 'vspp', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        VALUE: { type: ArgumentType.NUMBER, defaultValue: 100 },
                    },
                },
                "---",
                {
                    opcode: 'audioSourceGetModificationsBoolean', text: 'audio source [NAME] [OPTION] in [AUDIOGROUP]', blockType: BlockType.BOOLEAN, disableMonitor: true,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioSourceOptionsBooleans', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                {
                    opcode: 'audioSourceGetModificationsNormal', text: 'audio source [NAME] [OPTION] in [AUDIOGROUP]', blockType: BlockType.REPORTER, disableMonitor: true,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        OPTION: { type: ArgumentType.STRING, menu: 'audioSourceOptions', defaultValue: "" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                    },
                },
                // deleted blocks
                {
                    opcode: 'audioSourceSetTime', text: 'set audio source [NAME] start position in [AUDIOGROUP] to [TIME] seconds', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
                        TIME: { type: ArgumentType.NUMBER, defaultValue: 0.3 },
                    },
                    hideFromPalette: true,
                },
                {
                    opcode: 'audioSourceDuplicate', text: 'weakly duplicate audio source from [NAME] to [COPY] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: { type: ArgumentType.STRING, defaultValue: "AudioSource1" },
                        COPY: { type: ArgumentType.STRING, defaultValue: "AudioSource2" },
                        AUDIOGROUP: { type: ArgumentType.STRING, menu: 'audioGroup', defaultValue: "" },
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
                timePosition: {
                    acceptReporters: true,
                    items: [
                        { text: "time", value: "time" },
                        { text: "start", value: "start" },
                        { text: "end", value: "end" },
                        { text: "start loop", value: "start loop" },
                        { text: "end loop", value: "end loop" },
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
                    ]
                },
                audioSourceOptions: {
                    acceptReporters: true,
                    items: [
                        { text: "volume", value: "volume" },
                        { text: "speed", value: "speed" },
                        { text: "detune", value: "pitch" },
                        { text: "pan", value: "pan" },
                        { text: "time position", value: "time position" },
                        { text: "output volume", value: "output volume" },
                        { text: "start position", value: "start position" },
                        { text: "end position", value: "end position" },
                        { text: "start loop position", value: "start loop position" },
                        { text: "end loop position", value: "end loop position" },
                        { text: "sound length", value: "sound length" },
                        { text: "origin sound", value: "origin sound" },

                        // see https://stackoverflow.com/a/54567527 as to why this is not a menu option
                        // { text: "dominant frequency", value: "dominant frequency" },
                    ]
                }
            }
        };
    }

    // button handlers
    createAudioGroup() {
        const audioGroupIds = Object.keys(this.audioGroups);
        const newGroupId = prompt('Set a name for this Audio Group:', 'audio group ' + (audioGroupIds.length + 1));
        if (!newGroupId) return alert('Cancelled');
        if (this.audioGroups[newGroupId]) return alert(`"${newGroupId}" is taken!`);

        // make the new audio group
        const audioGroup = new AudioGroup();
        this.audioGroups[newGroupId] = audioGroup;

        this.runtime.vm.emitWorkspaceUpdate();
        this.serialize();
    }
    deleteAudioGroup() {
        const groupId = prompt('Which audio group would you like to delete?');
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
    audioSourceReverse(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[target];
        if (!audioSource) return;
        audioSource.reverse();
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
    audioSourcePlayerOption(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;
        if (!["play", "pause", "stop"].includes(args.PLAYEROPTION)) return;
        audioSource[args.PLAYEROPTION]();
    }

    audioSourceSetLoop(args) {
        const audioGroup = this.audioGroups[args.AUDIOGROUP];
        if (!audioGroup) return;
        const audioSource = audioGroup.sources[args.NAME];
        if (!audioSource) return;
        if (!["loop", "not loop"].includes(args.LOOP)) return;
        audioSource.looping = args.LOOP === "loop";
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
                audioSource.timePosition = Cast.toNumber(args.TIME);
                break;
            case "start":
                audioSource.startPosition = Cast.toNumber(args.TIME);
                break;
            case "end":
                audioSource.endPosition = Cast.toNumber(args.TIME);
                break;
            case "start loop":
                audioSource.loopStartPosition = Cast.toNumber(args.TIME);
                break;
            case "end loop":
                audioSource.loopEndPosition = Cast.toNumber(args.TIME);
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
            case "start position":
                return audioSource.startPosition;
            case "end position":
                return audioSource.endPosition;
            case "start loop position":
                return audioSource.loopStartPosition;
            case "end loop position":
                return audioSource.loopEndPosition;
            case "time position":
                return audioSource.timePosition;
            case "sound length":
                return audioSource.duration;
            case "origin sound":
                return audioSource.originAudioName;
            case "output volume":
                return audioSource.outputVolume * 100;
            case "dominant frequency":
                return audioSource.dominantFrequency;
            default:
                return "";
        }
    }
}

module.exports = AudioExtension;
