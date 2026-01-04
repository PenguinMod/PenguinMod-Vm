const Cast = require("../../util/cast");
const Timer = require("./timer");

function MathOver(number, max) {
    let num = number;
    while (num > max) {
        num -= max;
    }
    return num;
}
function Clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}

class AudioSource {
    /**
     * @param {AudioContext} audioContext 
     * @param {object} audioGroup 
     * @param {AudioBuffer} source 
     * @param {object} data 
     * @param {object} parent 
     */
    constructor(audioContext, audioGroup, source, data, parent, runtime) {
        if (source == null) source = "";
        if (data == null) data = {};
        this.runtime = runtime;

        this.src = source;
        this.duration = source.duration;
        this.originAudioName = "";

        this.volume = data.volume ?? 1;
        this.speed = data.speed ?? 1;
        this.pitch = data.pitch ?? 0;
        this.pan = data.pan ?? 0;
        this.looping = data.looping ?? false;

        this.startPosition = data.startPosition ?? 0;
        this.endPosition = data.endPosition ?? Infinity;
        this.loopStartPosition = data.loopStartPosition ?? 0;
        this.loopEndPosition = data.loopEndPosition ?? Infinity;

        this.resumeSpot = 0;
        this.paused = false;
        this.notPlaying = true;
        this.parent = parent;

        this._audioNode = null;
        this._audioContext = audioContext;
        this._audioGroup = audioGroup;

        this._audioPanner = this._audioContext.createPanner();
        this._audioGainNode = this._audioContext.createGain();
        this._audioAnalyzerNode = this._audioContext.createAnalyser();
        
        this._audioPanner.panningModel = 'equalpower';
        this._audioGainNode.gain.value = 1;

        this._audioGainNode.connect(this._audioPanner);
        this._audioPanner.connect(this._audioAnalyzerNode);
        this._audioAnalyzerNode.connect(parent.audioGlobalVolumeNode);

        this._originalConfig = data;
        this._playingSrc = null;

        this._timer = new Timer(runtime, audioContext);
        this._disposed = false;
    }

    play(atTime) {
        if (!this.src) throw "Cannot play an empty audio source";
        try {
            if (this._audioNode) {
                this._audioNode.onended = null;
                this._audioNode.stop();
            }
        } catch {
            // ... idk
        } finally {
            this._audioNode = null;
        }

        const source = this._audioContext.createBufferSource();
        this._audioNode = source;
        this.update();

        source.buffer = this.src;
        source.connect(this._audioGainNode);
        this._playingSrc = source.buffer;
        
        if (!this.paused) {
            this._timer.reset();
            this._timer.setTime(Clamp(atTime ?? this.startPosition, 0, this.duration) * 1000);
            this._timer.start();
        } else {
            this.resumeSpot = this.getTimePosition();
            this._timer.start();
        }

        // we need to know when the sound starts, so we know how long to play for
        // we also need to change endTimePos if we are looping
        let startTimePos = this.resumeSpot;
        let endTimePos = this.endPosition;
        if (this.paused) {
            this.paused = false;
        } else {
            startTimePos = atTime ?? this.startPosition;
        }
        if (this.looping) {
            endTimePos = this.loopEndPosition;
        }

        // dont play the sound if the playback duration is less than 1 sample frame, otherwise the ended event will not fire
        this.notPlaying = false;
        const playbackDuration = Clamp(endTimePos - startTimePos, 0, this.duration);
        if (playbackDuration < 1 / this.src.sampleRate) {
            this._onNodeStop(true);
        } else {
            source.start(0, Clamp(startTimePos, 0, this.duration), playbackDuration);
    
            source.onended = () => {
                this._onNodeStop();
            }
        }
    }
    stop() {
        this.notPlaying = true;
        this.paused = false;
        this._timer.stop();
        try {
            if (this._audioNode) {
                this._audioNode.stop();
            }
        } catch {
            // ... idk
        } finally {
            this._audioNode = null;
        }
    }
    pause() {
        if (!this._audioNode) return;
        this.paused = true;
        this.notPlaying = true;
        this._timer.pause();
        
        // onended is already ignored when paused, and stopped nodes cannot restart
        this._audioNode.onended = null;
        this._audioNode.stop();
        this._audioNode = null;
    }

    update() {
        if (!this._audioNode) return;
        const audioNode = this._audioNode;
        const audioGroup = this._audioGroup;
        const audioGainNode = this._audioGainNode;
        const audioPanner = this._audioPanner;

        // we need to manually calculate detune to prevent problems when using playbackRate for other things
        audioNode.playbackRate.value = this.speed * Math.pow(2, this.pitch / 1200);
        audioGainNode.gain.value = this.volume;

        audioNode.playbackRate.value *= audioGroup.globalSpeed * Math.pow(2, audioGroup.globalPitch / 1200);
        audioGainNode.gain.value *= audioGroup.globalVolume;
        this._timer.speed = audioNode.playbackRate.value;

        const pan = Clamp(this.pan + audioGroup.globalPan, -1, 1);
        audioPanner.positionX.value = pan;
        audioPanner.positionY.value = 0;
        audioPanner.positionZ.value = 1 - Math.abs(pan);
    }
    dispose() {
        this._disposed = true;
        this._timer.dispose();
        this.stop();
    }
    clone() {
        const newSource = new AudioSource(this._audioContext, this._audioGroup, this.src, this._originalConfig, this.parent, this.runtime);
        return newSource;
    }
    reverse() {
        if (!this.src) throw "Cannot reverse an empty audio source";

        const buffer = this.src;
        const reversedBuffer = this._audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );
    
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const destinationData = reversedBuffer.getChannelData(channel);
    
            for (let i = 0; i < buffer.length; i++) {
                destinationData[i] = sourceData[buffer.length - 1 - i];
            }
        }
        this.src = reversedBuffer;
    }

    setTimePosition(newSeconds) {
        if (!this._audioNode && !this.paused) return;
        const src = this._getActiveSource();
        newSeconds = Clamp(newSeconds, 0, src.duration);
        if (this.paused) {
            // only update the time
            this._timer.setTime(newSeconds * 1000);
            return;
        }

        this._timer.setTime(newSeconds * 1000);
        this.play(newSeconds);
    }

    getVolume() {
        const analyserNode = this._audioAnalyzerNode;

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        let sumSquares = 0.0;
        for (let i = 0; i < bufferLength; i++) {
          const sample = (dataArray[i] / 128.0) - 1.0;
          sumSquares += sample * sample;
        }
        const volume = Math.sqrt(sumSquares / bufferLength);
        return volume;
    }
    getFrequency() {
        const analyserNode = this._audioAnalyzerNode;
        const src = this._getActiveSource();
    
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);
    
        // find the max frequency
        let maxIndex = 0;
        for (let i = 1; i < bufferLength; i++) {
            if (dataArray[i] > dataArray[maxIndex]) {
                maxIndex = i;
            }
        }
    
        // return the dominant freq
        const nyquist = src.sampleRate / 2;
        return maxIndex * nyquist / bufferLength;
    }
    getTimePosition() {
        const src = this._getActiveSource();
        return Clamp(this._timer.getTime(true), 0, src.duration);
    }

    _getActiveSource() {
        if (this._audioNode) return this._playingSrc;
        return this.src;
    }
    _onNodeStop(didNotPlay) {
        if (this.paused || !this._audioNode) return;
        if (!didNotPlay) {
            if (this.looping && !this.notPlaying) {
                this.play(this.loopStartPosition || 0);
                return;
            }
        }

        this._audioNode.onended = null;
        this.notPlaying = true;
        this._audioNode = null;
        this._timer.stop();
    }
}
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

    /**
        * Finds a sound with the specified ID in the sound list.
        * @param {Array} soundList
        * @param {string} Sound ID
    */
    FindSoundBySoundId(soundList, id) {
        for (let i = 0; i < soundList.length; i++) {
            const sound = soundList[i];
            if (sound.soundId == id) return sound;
        }
        return null;
    }
    /**
    * Finds a sound with the specified name in the sound list.
    * @param {Array} soundList
    * @param {string} Sound name
    */
    FindSoundByName(soundList, name) {
        for (let i = 0; i < soundList.length; i++) {
            const sound = soundList[i];
            if (sound.name == name) return sound;
        }
        return null;
    }
    /**
        * Clamps numbers to stay inbetween 2 values.
        * @param {number}
    */
    Clamp(number, min, max) {
        return Math.min(Math.max(number, min), max);
    }
}

module.exports.Helper = AudioExtensionHelper
module.exports.AudioSource = AudioSource