const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

const HelperTool = require('./helper');
const Helper = new HelperTool.Helper();

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
        this.helper = Helper;
        this.helper.runtime = this.runtime;

        this.runtime.on('PROJECT_STOP_ALL', () => {
            for (const audioGroupName in Helper.audioGroups) {
                const audioGroup = Helper.GetAudioGroup(audioGroupName);
                for (const sourceName in audioGroup.sources) {
                    audioGroup.sources[sourceName].stop();
                }
            }
        });

        this.runtime.registerExtensionAudioContext("jgExtendedAudio", this.helper.audioContext, this.helper.audioGlobalVolumeNode);
    }

    deserialize(data) {
        for (const audioGroup in Helper.audioGroups) {
            Helper.DeleteAudioGroup(audioGroup);
        }
        Helper.audioGroups = {};
        for (const audioGroup of data) {
            Helper.AddAudioGroup(audioGroup.id, audioGroup);
        }
    }

    serialize() {
        return Helper.GetAllAudioGroups().map(audioGroup => ({
            id: audioGroup.id,
            sources: {},
            globalVolume: audioGroup.globalVolume,
            globalSpeed: audioGroup.globalSpeed,
            globalPitch: audioGroup.globalPitch,
            globalPan: audioGroup.globalPan
        }));
    }

    orderCategoryBlocks(blocks) {
        const buttons = {
            create: blocks[0],
            delete: blocks[1]
        };
        const varBlock = blocks[2];
        blocks.splice(0, 3);
        // create the variable block xml's
        const varBlocks = Helper.GetAllAudioGroups().map(audioGroup => varBlock.replace('{audioGroupId}', audioGroup.id));
        if (!varBlocks.length) {
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

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgExtendedAudio',
            name: 'Sound Systems',
            color: '#E256A1',
            menuIconURI: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZS13aWR0aDogMTsgc3Ryb2tlOiByZ2IoMTgxLCA2OSwgMTI5KTsgZmlsbDogcmdiKDIyNiwgODYsIDE2MSk7IiBjeD0iMTAiIGN5PSIxMCIgcng9IjkuNSIgcnk9IjkuNSI+PC9lbGxpcHNlPgogIDxwYXRoIGQ9Ik0gMTEuNTQ5IDUuNjQ5IEMgMTEuNjg2IDUuMTE0IDEyLjIzMSA0Ljc5MiAxMi43NjYgNC45MjkgQyAxNC4yODQgNS4zOCAxNS42NjcgNi41NzkgMTYuMjUxIDcuOTIzIEMgMTYuODM0IDkuMjY2IDE2Ljc2NyAxMS4xMTkgMTUuOTc5IDEyLjYxOCBMIDE2LjExMyAxMi4zNjMgTCAxNi4xMTMgMTIuMTE4IEwgMTYuMTEzIDEyLjEyMSBMIDE2LjExMyAxMi4zOTcgTCAxNS45NzkgMTIuNjIxIEMgMTUuNjMyIDEzLjIwMiAxNS4xMjcgMTMuNzg0IDE0LjYwNyAxNC4xNzcgQyAxNC4wODYgMTQuNTcxIDEzLjExNiAxNC44OTkgMTMuMTE2IDE0Ljg5OSBDIDEzLjAzMyAxNC45NSAxMy4xMTYgMTQuODk5IDEzLjExNiAxNC44OTkgQyAxMi42NzYgMTUuMjMyIDEyLjA0OSAxNS4xNDYgMTEuNzE1IDE0LjcwNiBDIDExLjM4MiAxNC4yNjYgMTEuNDY4IDEzLjYzOSAxMS45MDggMTMuMzA1IEMgMTEuOTA4IDEzLjMwNSAxMS45OTEgMTMuMjU0IDExLjkwOCAxMy4zMDUgQyAxMS45MDggMTMuMzA1IDEzLjAzNCAxMi44NTkgMTMuMzk5IDEyLjU4MyBDIDEzLjc2NSAxMi4zMDUgMTQuMDE5IDEyLjAzNyAxNC4yNDYgMTEuNjIyIEwgMTQuMTEyIDExLjg2NiBMIDE0LjExMiAxMi4xMjEgTCAxNC4xMTIgMTIuMTE4IEwgMTQuMTEyIDExLjgyMyBMIDE0LjI0NiAxMS42MTggQyAxNC45MDEgMTAuNjE3IDE0Ljg0IDkuNjk1IDE0LjQxNiA4LjcxOSBDIDEzLjk5MyA3Ljc0NSAxMy4zNTcgNy4wODMgMTIuMjY4IDYuODY1IEMgMTEuNzMzIDYuNzI4IDExLjQxMSA2LjE4MyAxMS41NDggNS42NDggTCAxMS41NDkgNS42NDkgWiIgc3R5bGU9ImZpbGw6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAxOyI+PC9wYXRoPgogIDxwYXRoIGQ9Ik0gNS4xODcgNy4yNjUgQyA0LjE4IDcuMjY1IDMuMzY0IDguMDgyIDMuMzY0IDkuMDg4IEwgMy4zNjQgMTAuOTEyIEMgMy4zNjQgMTEuOTE5IDQuMTggMTIuNzM1IDUuMTg3IDEyLjczNSBMIDcuMDExIDEyLjczNSBDIDguODM0IDE0LjU1OCA4LjgzNCAxNC41NTggOC44MzQgMTIuNzM1IEwgOC44MzQgNy4yNjUgQyA4LjgzNCA1LjQ0MiA4LjgzNCA1LjQ0MiA3LjAxMSA3LjI2NSBMIDUuMTg3IDcuMjY1IFoiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSIjZmZmIiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAwLjU7Ij48L3BhdGg+CiAgPHBhdGggZD0iTSAxMC4zMDQgNy45MzkgQyAxMS42MTQgOC4yNzUgMTIuMzMzIDkuODA5IDExLjYwOCAxMS4wNjUgTCAxMS42MDggMTEuMDY3IEMgMTEuMzIgMTEuNTY3IDEwLjg0NSAxMS45MjEgMTAuMzAxIDEyLjA2MiIgc3R5bGU9ImZpbGw6IG5vbmU7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2UtbGluZWNhcDogcm91bmQ7IHN0cm9rZS13aWR0aDogMjsiPjwvcGF0aD4KPC9zdmc+',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
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
                    opcode: 'audioSourceDuplicate', text: 'duplicate audio source from [NAME] to [COPY] in [AUDIOGROUP]', blockType: BlockType.COMMAND,
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

    createAudioGroup() {
        const newGroup = prompt('Set a name for this Audio Group:', 'audio group ' + (Helper.GetAllAudioGroups().length + 1));
        if (!newGroup) return alert('Canceled')
        if (Helper.GetAudioGroup(newGroup)) return alert(`"${newGroup}" is taken!`);
        Helper.AddAudioGroup(newGroup);
        vm.emitWorkspaceUpdate();
        this.serialize();
    }
    deleteAudioGroup() {
        const group = prompt('Which audio group would you like to delete?');
        // helper deals with audio groups that dont exist, so we just call the function with no check
        Helper.DeleteAudioGroup(group);
        vm.emitWorkspaceUpdate();
        this.serialize();
    }

    fetchAudioGroupMenu() {
        const audioGroups = Helper.GetAllAudioGroups();
        if (audioGroups.length <= 0) {
            return [
                {
                    text: '',
                    value: ''
                }
            ];
        }
        return audioGroups.map(audioGroup => ({
            text: audioGroup.id,
            value: audioGroup.id
        }));
    }
    fetchScratchSoundMenu() {
        const sounds = vm.editingTarget.sprite.sounds; // this function only gets used in the editor so we are safe to use editingTarget
        if (sounds.length <= 0) return [{ text: '', value: '' }];
        return sounds.map(sound => ({
            text: sound.name,
            value: sound.name
        }));
    }

    audioGroupGet(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        return JSON.stringify(Object.getOwnPropertyNames(audioGroup.sources));
    }

    audioGroupSetVolumeSpeedPitchPan(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        switch (args.VSPP) {
            case "volume":
                audioGroup.globalVolume = Helper.Clamp(Cast.toNumber(args.VALUE) / 100, 0, 1);
                break;
            case "speed":
                audioGroup.globalSpeed = Helper.Clamp(Cast.toNumber(args.VALUE) / 100, 0, Infinity);
                break;
            case "detune":
            case "pitch":
                audioGroup.globalPitch = Cast.toNumber(args.VALUE);
                break;
            case "pan":
                audioGroup.globalPan = Helper.Clamp(Cast.toNumber(args.VALUE), -100, 100) / 100;
                break;
        }
        Helper.UpdateAudioGroupSources(audioGroup);
    }

    audioSourceCreate(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        switch (args.CREATEOPTION) {
            case "create":
                Helper.RemoveAudioSource(audioGroup, args.NAME);
                Helper.AppendAudioSource(audioGroup, args.NAME);
                break;
            case "delete":
                Helper.RemoveAudioSource(audioGroup, args.NAME);
                break;
        }
    }
    audioSourceDuplicate(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        const origin = Cast.toString(args.NAME);
        const newName = Cast.toString(args.COPY);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, origin);
        if (!audioSource) return;
        Helper.RemoveAudioSource(audioGroup, newName);
        audioGroup.sources[newName] = audioSource.clone();
    }
    audioSourceReverse(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        const target = Cast.toString(args.NAME);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, target);
        if (!audioSource) return;
        audioSource.reverse();
    }
    audioSourceDeleteAll(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;

        for (const sourceName in audioGroup.sources) {
            switch (args.DELETEOPTION) {
                case "delete":
                    Helper.RemoveAudioSource(audioGroup, sourceName);
                    break;
                case "play":
                    audioGroup.sources[sourceName].play();
                    break;
                case "pause":
                    audioGroup.sources[sourceName].pause();
                    break;
                case "stop":
                    audioGroup.sources[sourceName].stop();
                    break;
            }
        }
    }

    audioSourceSetScratch(args, util) {
        return new Promise((resolve, reject) => {
            const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
            if (!audioGroup) return resolve();
            const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
            if (!audioSource) return resolve();
            const sound = Helper.FindSoundByName(util.target.sprite.sounds, args.SOUND);
            if (!sound) return resolve();
            let canUse = true;
            try {
                // eslint-disable-next-line no-unused-vars
                util.target.sprite.soundBank.getSoundPlayer(sound.soundId).buffer;
            } catch {
                canUse = false;
            }
            if (!canUse) return resolve();
            const buffer = util.target.sprite.soundBank.getSoundPlayer(sound.soundId).buffer
            audioSource.duration = buffer.duration;
            audioSource.src = buffer;
            audioSource.originAudioName = `${args.SOUND}`;
            resolve();
        })
    }
    audioSourceSetUrl(args, util) {
        return new Promise((resolve, reject) => {
            const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
            if (!audioGroup) return resolve();
            const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
            if (!audioSource) return resolve();
            fetch(args.URL).then(response => response.arrayBuffer().then(arrayBuffer => {
                Helper.audioContext.decodeAudioData(arrayBuffer, buffer => {
                    audioSource.duration = buffer.duration;
                    audioSource.src = buffer;
                    audioSource.originAudioName = `${args.URL}`;
                    resolve();
                }, resolve);
            }).catch(resolve)).catch(err => {
                // this is not a url, try some other stuff instead
                const sound = Helper.FindSoundByName(util.target.sprite.sounds, args.URL);
                if (sound) {
                    // this is a scratch sound name
                    let canUse = true;
                    try {
                        // eslint-disable-next-line no-unused-vars
                        util.target.sprite.soundBank.getSoundPlayer(sound.soundId).buffer;
                    } catch {
                        canUse = false;
                    }
                    if (!canUse) return resolve();
                    const buffer = util.target.sprite.soundBank.getSoundPlayer(sound.soundId).buffer
                    audioSource.duration = buffer.duration;
                    audioSource.src = buffer;
                    audioSource.originAudioName = `${args.URL}`;
                    return resolve();
                }
                console.warn(err);
                return resolve();
            });
        })
    }

    audioSourcePlayerOption(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return;
        if (!["play", "pause", "stop"].includes(args.PLAYEROPTION)) return;
        audioSource[args.PLAYEROPTION]();
    }
    audioSourceSetLoop(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return;
        if (!["loop", "not loop"].includes(args.LOOP)) return;
        audioSource.looping = args.LOOP == "loop";
    }
    audioSourceSetTime(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return;
        audioSource.startPosition = Cast.toNumber(args.TIME);
    }
    audioSourceSetTime2(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return;
        
        switch (args.TIMEPOS) {
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
            case "time":
                audioSource.setTimePosition(Cast.toNumber(args.TIME));
                break;
        }
    }
    audioSourceSetVolumeSpeedPitchPan(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return;
        switch (args.VSPP) {
            case "volume":
                audioSource.volume = Helper.Clamp(Cast.toNumber(args.VALUE) / 100, 0, 1);
                break;
            case "speed":
                audioSource.speed = Helper.Clamp(Cast.toNumber(args.VALUE) / 100, 0, Infinity);
                break;
            case "detune":
            case "pitch":
                audioSource.pitch = Cast.toNumber(args.VALUE);
                break;
            case "pan":
                audioSource.pan = Helper.Clamp(Cast.toNumber(args.VALUE), -100, 100) / 100;
                break;
        }
        Helper.UpdateAudioGroupSources(audioGroup);
    }

    audioGroupGetModifications(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return;
        switch (args.OPTION) {
            case "volume":
                return audioGroup.globalVolume * 100;
            case "speed":
                return audioGroup.globalSpeed * 100;
            case "detune":
            case "pitch":
                return audioGroup.globalPitch;
            case "pan":
                return audioGroup.globalPan * 100;
            default:
                return 0;
        }
    }
    audioSourceGetModificationsBoolean(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return false;
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return false;
        switch (args.OPTION) {
            case "playing":
                return ((!audioSource.paused) && (!audioSource.notPlaying));
            case "paused":
                return audioSource.paused;
            case "looping":
                return audioSource.looping;
            default:
                return false;
        }
    }
    audioSourceGetModificationsNormal(args) {
        const audioGroup = Helper.GetAudioGroup(args.AUDIOGROUP);
        if (!audioGroup) return "";
        const audioSource = Helper.GrabAudioSource(audioGroup, args.NAME);
        if (!audioSource) return "";
        switch (args.OPTION) {
            case "volume":
                return audioSource.volume * 100;
            case "speed":
                return audioSource.speed * 100;
            case "detune":
            case "pitch":
                return audioSource.pitch;
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
                return audioSource.getTimePosition();
            case "sound length":
                return audioSource.duration;
            case "origin sound":
                return audioSource.originAudioName;
            case "output volume":
                return audioSource.getVolume() * 100;
            case "dominant frequency":
                return audioSource.getFrequency();
            default:
                return "";
        }
    }
}

module.exports = AudioExtension;
