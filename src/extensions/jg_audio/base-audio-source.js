const Cast = require("../../util/cast");
const Timer = require("./timer");

const audioBufferToWav = require("../../util/wav-encoder");

class BaseAudioSource {
    /**
     * @param {import("./audio-group")} audioGroup The audio group to hold this audio source. All audio sources should be apart of an audio group.
     * @param {import("./index")} extension The extension which this audio source came from.
     */
    constructor(audioGroup, extension) {
        /**
         * The buffer to use when playing. Must be set before playback.
         * @type {AudioBuffer?}
         */
        this.src = null;
        /**
         * The name of the audio assigned to this source. Empty value is a blank string.
         * Name will likely be a URL, file name, or scratch sound name. It is an arbitrary value.
         * @type {string}
         */
        this.originAudioName = "";

        /**
         * The volume for this source.
         * Acts like a multiplier.
         * @type {number}
         */
        this.volume = 1;
        /**
         * The speed for this source.
         * Acts like a multiplier.
         * @type {number}
         */
        this.speed = 1;
        /**
         * The detune for this source.
         * @type {number}
         */
        this.detune = 0;
        /**
         * The pan for this source.
         * Range from -1 to 1. -1 = left ear, 1 = right ear
         * @type {number}
         */
        this.pan = 0;

        /**
         * Whether or not this sound loops.
         * @type {boolean}
         */
        this.looping = false;
        /**
         * Where this audio source is expected to play on start.
         * This is not used when a loop ends. Set loopStartPosition to set the starting point.
         * @type {number}
         */
        this.startPosition = 0;
        /**
         * Where this audio source is expected to end.
         * This is not used for looping audio. Use loopEndPosition to set the looping point.
         * @type {number}
         */
        this.endPosition = Infinity;
        /**
         * Where this audio source is expected to play when the audio loops over.
         * Used only for looping audio.
         * @type {number}
         */
        this.loopStartPosition = 0;
        /**
         * Where this audio source is expected loop over.
         * Used only for looping audio.
         * @type {number}
         */
        this.loopEndPosition = Infinity;

        // internal vars
        this._resumeSpot = 0;
        this._paused = false;
        this._notPlaying = true;

        /** @type {import("./index")} */
        this._extension = extension;

        this._audioNode = null;
        this._audioContext = extension.audioContext;
        this._audioGroup = audioGroup;

        this._audioPanner = this._audioContext.createPanner();
        this._audioGainNode = this._audioContext.createGain();
        this._audioAnalyzerNode = this._audioContext.createAnalyser();

        this._audioPanner.panningModel = 'equalpower';
        this._audioGainNode.gain.value = 1;

        this._audioGainNode.connect(this._audioPanner);
        this._audioPanner.connect(this._audioAnalyzerNode);
        this._audioAnalyzerNode.connect(this._extension.audioGainNode);

        this._playingSrc = null;

        this._timer = new Timer(this._extension.runtime, this._extension.audioContext);
        this._disposed = false;
    }

    /**
     * The current audio group that this sound is apart of.
     * 
     * Audio sources can be regrouped during playback, though you are in charge of making sure the audio groups themselves
     * do not contain references to audio sources not apart of their group anymore.
     */
    get audioGroup () {
        return this._audioGroup;
    }
    set audioGroup (newGroup) {
        this._audioGroup = newGroup;
        this.update();
    }

    /**
     * Get the duration of the audio buffer.
     * @returns {number}
     */
    get duration () {
        if (!this.src) return 0;
        return this.src.duration;
    }
    /**
     * Get the actual speed multiplier that this source will play at.
     */
    get playbackRate () {
        // we need to manually calculate detune to prevent problems when using playbackRate for other things
        return (this.speed * Math.pow(2, this.detune / 1200)) * this._audioGroup.speed * Math.pow(2, this._audioGroup.detune / 1200);
    }
    /**
     * Get the duration of the audio source, accounting for the playback speed.
     * @returns {number}
     */
    get scaledDuration() {
        return this.duration;
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
    get playing () {
        return ((!this._paused) && (!this._notPlaying));
    }
    /**
     * Whether or not this audio source is paused.
     * @returns {boolean}
     */
    get paused () {
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

    /**
     * Updates any playing audio node to new values on the audio group or settings on the audio source.
     */
    update() {
        if (!this._audioNode) return;
        const audioNode = this._audioNode;
        const audioGroup = this._audioGroup;
        const audioGainNode = this._audioGainNode;
        const audioPanner = this._audioPanner;

        // we actually dont use detune directly, instead playbackRate will calculate it
        audioNode.playbackRate.value = this.playbackRate;
        audioGainNode.gain.value = this.volume * audioGroup.volume;
        this._timer.speed = this.playbackRate;

        const pan = Math.min(Math.max(this.pan + audioGroup.pan, -1), 1);
        audioPanner.positionX.value = pan;
        audioPanner.positionY.value = 0;
        audioPanner.positionZ.value = 1 - Math.abs(pan);
    }
    /**
     * Dispose of any objects created by this audio source.
     * Undefined behavior will occur if you keep using this audio source after it has been disposed of.
     */
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

        // dispose of the nodes
        try {
            if (this._audioGainNode) this._audioGainNode.disconnect();
            if (this._audioPanner) this._audioPanner.disconnect();
            if (this._audioAnalyzerNode) this._audioAnalyzerNode.disconnect();
        } catch {
            // ...
        }

        // remove references
        this._audioNode = null;
        this._audioContext = null;
        this._audioGroup = null;
        this._audioPanner = null;
        this._audioGainNode = null;
        this._audioAnalyzerNode = null;
        this._playingSrc = null;
        this._extension = null;
        this._audioGroup = null;
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
     * Generates a .wav Data URL from the audio source buffer.
     * @param {"16"|"32"} format `"16"` for 16-bit PCM, `"32"` for 32-bit float
     * @returns {Promise<ArrayBuffer>}
     */
    async generateArrayBuffer(format) {
        // NOTE: We might want to make audioBufferToWav async at some point
        const arrayBuffer = audioBufferToWav(this.src, { float32: format === "32" });
        return arrayBuffer;
    }
    /**
     * See `generateArrayBuffer`
     * @param {"16"|"32"} format `"16"` for 16-bit PCM, `"32"` for 32-bit float
     * @returns {Promise<string>}
     */
    generateDataUrl(format) {
        if (!this.src) throw "No source clip is set";

        return new Promise(async (resolve, reject) => {
            const arrayBuffer = await this.generateArrayBuffer(format);
            const blob = new Blob([arrayBuffer], { type: "audio/wav" });
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
        });
    }

    render() {
        if (!this.src) throw "Cannot render an empty audio source";
    }

    reverse() {
        if (!this.src) throw "Cannot reverse an empty audio source";

        // basically based on the scratch implementation of reversing
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
    invert() {
        if (!this.src) throw "Cannot invert an empty audio source";

        const buffer = this.src;
        const destinationBuffer = this._audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length,
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const destinationData = destinationBuffer.getChannelData(channel);

            for (let i = 0; i < buffer.length; i++) {
                destinationData[i] = sourceData[i] * -1;
            }
        }
        this.src = destinationBuffer;
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

module.exports = BaseAudioSource;