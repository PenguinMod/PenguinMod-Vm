const Timer = require("./timer");

const BaseAudioSource = require("./base-audio-source");
const OfflineAudioSource = require("./offline-audio-source");

class AudioSource extends BaseAudioSource {
    /**
     * @param {import("./audio-group")} audioGroup The audio group to hold this audio source. All audio sources should be apart of an audio group.
     * @param {import("./index")} extension The extension which this audio source came from.
     */
    constructor(audioGroup, extension) {
        super(audioGroup, extension.audioContext, extension.audioGainNode);

        /**
         * The name of the audio assigned to this source. Empty value is a blank string.
         * Name will likely be a URL, file name, or scratch sound name. It is an arbitrary value.
         * @type {string}
         */
        this.originAudioName = "";

        /**
         * Determines whether or not this source will be rendered in renders.
         * Not used during playback.
         * @type {boolean}
         */
        this.renderAudible = false;
        /**
         * The delay until this source will play in a render.
         * Not used during playback.
         * @type {number}
         */
        this.renderTime = 0;

        // internal vars
        this._resumeSpot = 0;
        this._paused = false;
        this._notPlaying = true;

        this._audioNode = null;
        this._playingSrc = null;

        this._extension = extension;
        this._timer = new Timer(this._extension.runtime, this._extension.audioContext);
    }
    
    /**
     * The current time position of the audio source.
     * When updating this value, getting it again may result in a slightly different value.
     * @returns {number}
     */
    get timePosition () {
        const src = this._activeSource;
        return Math.min(Math.max(this._timer.getTime(true), 0), src.duration);
    }
    set timePosition (newSeconds) {
        if (!this._audioNode && !this._paused) return;

        const src = this._activeSource;
        newSeconds = Math.min(Math.max(newSeconds, 0), src.duration);
        if (this._paused) {
            // only update the time
            this._timer.setTime(newSeconds * 1000);
            return;
        }

        this._timer.setTime(newSeconds * 1000);
        this.play(newSeconds);
    }

    /**
     * Whether or not this audio source is playing.
     * @returns {boolean}
     */
    get playing() {
        return ((!this._paused) && (!this._notPlaying));
    }
    /**
     * Whether or not this audio source is paused.
     * @returns {boolean}
     */
    get paused() {
        return this._paused;
    }

    
    /**
     * Analyzes the current output volume of this AudioSource.
     * @returns {number}
     */
    get outputVolume () {
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
    /**
     * Analyzes the current spectral peak frequency of this AudioSource.
     * This may be simplified to "dominant frequency" but that name is not quite accurate to the result.
     * See https://stackoverflow.com/a/54567527 for more info.
     * @returns {number}
     */
    get spectralPeak () {
        const analyserNode = this._audioAnalyzerNode;

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        // find the max index
        let maxIndex = 0;
        for (let i = 1; i < bufferLength; i++) {
            if (dataArray[i] > dataArray[maxIndex]) {
                maxIndex = i;
            }
        }

        // return the peak freq
        const nyquist = this._audioContext.sampleRate / 2;
        return maxIndex * nyquist / bufferLength;
    }
    
    play(atTime = this.startPosition) {
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

        if (!this._paused) {
            this._timer.reset();
            this._timer.setTime(Math.min(Math.max(atTime ?? this.startPosition, 0), this.duration) * 1000);
            this._timer.start();
        } else {
            this._resumeSpot = this.timePosition;
            this._timer.start();
        }

        // we need to know when the sound starts, so we know how long to play for
        // we also need to change endTimePos if we are looping
        let startTimePos = this._resumeSpot;
        let endTimePos = this.endPosition;
        if (this._paused) {
            this._paused = false;
        } else {
            startTimePos = atTime ?? this.startPosition;
        }
        if (this.looping) {
            endTimePos = this.loopEndPosition;
        }

        // dont play the sound if the playback duration is less than 1 sample frame, otherwise the ended event will not fire
        this._notPlaying = false;
        const playbackDuration = Math.min(Math.max(endTimePos - startTimePos, 0), this.duration);
        if (playbackDuration < 1 / this.src.sampleRate) {
            this._onNodeStop(true);
        } else {
            source.start(0, Math.min(Math.max(startTimePos, 0), this.duration), playbackDuration);

            source.onended = () => {
                this._onNodeStop();
            }
        }
    }
    stop() {
        this._notPlaying = true;
        this._paused = false;
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
        this._paused = true;
        this._notPlaying = true;
        this._timer.pause();

        // onended is already ignored when paused, and stopped nodes cannot restart
        this._audioNode.onended = null;
        this._audioNode.stop();
        this._audioNode = null;
    }

    update() {
        const audioNode = this._audioNode;
        super.update();

        if (!audioNode) return;
        // we actually dont use detune directly, instead playbackRate will calculate it
        audioNode.playbackRate.value = this.playbackRate;
        this._timer.speed = this.playbackRate;
    }
    dispose() {
        this._disposed = true;
        this._timer.dispose();

        // NOTE: this.stop makes _audioNode null so we cant do it with the others
        // force stop and disconnect before running the real stop method
        if (this._audioNode) {
            try {
                this._audioNode.stop();
                this._audioNode.disconnect();
            } catch {
                // ...
            }
        }
        this.stop();

        // dispose of the other stuff
        super.dispose();

        // remove references
        this._audioNode = null;
        this._playingSrc = null;
    }
    
    /**
     * Create a clone of this audio source and copy all public values.
     */
    clone() {
        const newSource = new AudioSource(this._audioGroup, this._extension);
        newSource.src = this.src;
        newSource.originAudioName = this.originAudioName;

        newSource.volume = this.volume;
        newSource.speed = this.speed;
        newSource.detune = this.detune;
        newSource.pan = this.pan;

        newSource.looping = this.looping;
        newSource.startPosition = this.startPosition;
        newSource.endPosition = this.endPosition;
        newSource.loopStartPosition = this.loopStartPosition;
        newSource.loopEndPosition = this.loopEndPosition;

        newSource.renderAudible = this.renderAudible;
        newSource.renderTime = this.renderTime;
        return newSource;
    }
    /**
     * Create a clone of this audio source, but only copies the audio buffer itself.
     * Replicates old behavior of the extension where duplicates of audio sources would only copy the source.
     */
    weakClone() {
        const newSource = new AudioSource(this._audioGroup, this._extension);
        newSource.src = this.src;
        return newSource;
    }
    /**
     * Create a clone of this audio source as an OfflineAudioSource.
     */
    renderable(audioContext, audioGainNode) {
        const newSource = new OfflineAudioSource(this._audioGroup, audioContext, audioGainNode);
        newSource.src = this.src;

        newSource.volume = this.volume;
        newSource.speed = this.speed;
        newSource.detune = this.detune;
        newSource.pan = this.pan;

        newSource.looping = this.looping;
        newSource.startPosition = this.startPosition;
        newSource.endPosition = this.endPosition;
        newSource.loopStartPosition = this.loopStartPosition;
        newSource.loopEndPosition = this.loopEndPosition;

        newSource.renderTime = this.renderTime;
        return newSource;
    }
    
    // internal
    // internal gets and sets
    get _activeSource() {
        if (this._audioNode) return this._playingSrc;
        return this.src;
    }

    // menthods
    _onNodeStop(didNotPlay) {
        if (this._paused || !this._audioNode) return;
        if (!didNotPlay) {
            if (this.looping && !this._notPlaying) {
                this.play(this.loopStartPosition || 0);
                return;
            }
        }

        this._audioNode.onended = null;
        this._notPlaying = true;
        this._audioNode = null;
        this._timer.stop();
    }
};

module.exports = AudioSource;