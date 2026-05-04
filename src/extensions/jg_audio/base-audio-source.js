const Cast = require("../../util/cast");

const audioBufferToWav = require("../../util/wav-encoder");

class BaseAudioSource {
    /**
     * @param {import("./audio-group")} audioGroup The audio group to assume this audio source is apart of. All audio sources should be apart of an audio group.
     * @param {AudioContext|OfflineAudioContext} audioContext The audio context to use.
     * @param {GainNode} audioGainNode The master audio gain node to use.
     */
    constructor(audioGroup, audioContext, audioGainNode) {
        /**
         * The buffer to use when playing. Must be set before playback.
         * @type {AudioBuffer?}
         */
        this.src = null;

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
        this._audioContext = audioContext;
        this._audioGroup = audioGroup;

        this._audioPanner = this._audioContext.createPanner();
        this._audioGainNode = this._audioContext.createGain();
        this._audioAnalyzerNode = this._audioContext.createAnalyser();

        this._audioPanner.panningModel = 'equalpower';
        this._audioGainNode.gain.value = 1;

        this._audioGainNode.connect(this._audioPanner);
        this._audioPanner.connect(this._audioAnalyzerNode);
        this._audioAnalyzerNode.connect(audioGainNode);

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
        if (this.playbackRate <= 0) return Infinity;
        return this.duration / this.playbackRate;
    }

    /**
     * Updates nodes to new values on the audio group or settings on the audio source.
     */
    update() {
        const audioGroup = this._audioGroup;
        const audioGainNode = this._audioGainNode;
        const audioPanner = this._audioPanner;

        audioGainNode.gain.value = this.volume * audioGroup.volume;

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

        // dispose of the nodes
        try {
            if (this._audioGainNode) this._audioGainNode.disconnect();
            if (this._audioPanner) this._audioPanner.disconnect();
            if (this._audioAnalyzerNode) this._audioAnalyzerNode.disconnect();
        } catch {
            // ...
        }

        // remove references
        this._audioContext = null;
        this._audioGroup = null;
        this._audioPanner = null;
        this._audioGainNode = null;
        this._audioAnalyzerNode = null;
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

    /**
     * Reverses the audio buffer in a sync function.
     * Meant for replicating old behavior incase we feel like making
     * some or all mutations async.
     */
    reverseSync() {
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

    /**
     * Reverses the audio buffer.
     * Calls `reverseSync` but should be used over it incase we feel like making
     * some or all mutations async.
     */
    async reverse() {
        this.reverseSync();
    }
    /**
     * Phase-inverts the audio buffer.
     */
    async invert() {
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
    /**
     * Silences the audio buffer.
     */
    async silence() {
        if (!this.src) throw "Cannot silence an empty audio source";

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
                destinationData[i] = sourceData[i] * 0;
            }
        }
        this.src = destinationBuffer;
    }
};

module.exports = BaseAudioSource;