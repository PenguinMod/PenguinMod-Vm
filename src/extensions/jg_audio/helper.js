const Cast = require("../../util/cast");
const AudioGroup = require("./audio-group");
const AudioSource = require("./audio-source");

class AudioExtensionHelper {
    constructor(runtime) {
        /**
            * The runtime that the helper will use for all functions.
            * @param {runtime}
        */
        this.runtime = runtime;
        this.audioGroups = {};
        this.audioContext = new AudioContext();
        this.audioGlobalVolumeNode = this.audioContext.createGain();

        this.audioGlobalVolumeNode.gain.value = 1;
        this.audioGlobalVolumeNode.connect(this.audioContext.destination);
    }
    
    /**
        * Creates a new AudioGroup.
        * @param {string} AudioGroup name
        * @param {object} AudioGroup settings (optional)
        * @param {object[]} AudioGroup sources (optional)
    */
    AddAudioGroup(name, data, sources) {
        if (data == null) data = {};
        this.audioGroups[name] = {
            id: name,
            sources: (sources == null ? {} : sources),
            globalVolume: (data.globalVolume == null ? 1 : data.globalVolume),
            globalSpeed: (data.globalSpeed == null ? 1 : data.globalSpeed),
            globalPitch: (data.globalPitch == null ? 0 : data.globalPitch),
            globalPan: (data.globalPan == null ? 0 : data.globalPan)
        };
        return this.audioGroups[name];
    }
    /**
        * Deletes an AudioGroup by name.
        * @param {string}
    */
    DeleteAudioGroup(name) {
        const audioGroup = this.audioGroups[name];
        if (!audioGroup) return;
        this.DisposeAudioGroupSources(audioGroup);
        delete this.audioGroups[name];
    }
    /**
        * Gets an AudioGroup by name.
        * @param {string}
    */
    GetAudioGroup(name) {
        return this.audioGroups[name];
    }
    /**
        * Gets all AudioGroups and returns them in an array.
    */
    GetAllAudioGroups() {
        return Object.values(this.audioGroups);
    }
    /**
        * Gets all AudioSources in an AudioGroup and updates them.
        * @param {AudioGroup}
    */
    UpdateAudioGroupSources(audioGroup) {
        const audioSources = this.GrabAllGrabAudioSources(audioGroup);
        for (let i = 0; i < audioSources.length; i++) {
            const source = audioSources[i];
            source.update();
        }
    }
    /**
        * Gets all AudioSources in an AudioGroup and disposes them.
        * @param {AudioGroup}
    */
    DisposeAudioGroupSources(audioGroup) {
        const audioSources = this.GrabAllGrabAudioSources(audioGroup);
        for (let i = 0; i < audioSources.length; i++) {
            const source = audioSources[i];
            source.dispose();
        }
    }

    /**
        * Creates a new AudioSource inside of an AudioGroup.
        * @param {AudioGroup} AudioSource parent
        * @param {string} AudioSource name
        * @param {string} AudioSource source (optional)
        * @param {object} AudioSource settings (optional)
    */
    AppendAudioSource(parent, name, src, settings) {
        const group = typeof parent == "string" ? this.GetAudioGroup(parent) : parent;
        if (!group) return;
        group.sources[name] = new AudioSource(this.audioContext, group, src, settings, this, this.runtime);
        return group.sources[name];
    }
    /**
        * Deletes an AudioSource by name.
        * @param {AudioGroup} AudioSource parent
        * @param {string}
    */
    RemoveAudioSource(parent, name) {
        const group = typeof parent == "string" ? this.GetAudioGroup(parent) : parent;
        if (!group) return;
        const audioSource = group.sources[name];
        if (!audioSource) return;

        audioSource.dispose();
        delete group.sources[name];
    }
    /**
        * Gets an AudioSource by name.
        * @param {AudioGroup} AudioSource parent
        * @param {string}
    */
    GrabAudioSource(audioGroup, name) {
        const group = typeof audioGroup == "string" ? this.GetAudioGroup(audioGroup) : audioGroup;
        if (!group) return;
        return group.sources[name];
    }
    /**
        * Gets all AudioSources and returns them in an array.
        * @param {AudioGroup} AudioSource parent
    */
    GrabAllGrabAudioSources(audioGroup) {
        const group = typeof audioGroup == "string" ? this.GetAudioGroup(audioGroup) : audioGroup;
        if (!group) return [];
        return Object.values(group.sources);
    }
}

module.exports = AudioExtensionHelper;