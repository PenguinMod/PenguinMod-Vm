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

    // NOTE: We actually dont mutate in place because audio source clones shouldnt make new audio buffers unless they need to.
    // This also means that cloning an audio buffer from an existing audio source is an instant operation, and doesn't need async
    /**
     * Generic function for processing mutations to the audio source.
     * @param {(buffer:AudioBuffer, index:number, sourceData:Float32Array<ArrayBuffer>, destinationData:Float32Array<ArrayBuffer>)} callback 
     */
    mutateSource(callback) {
        if (!this.src) throw "Cannot mutate an empty audio source";

        // basically based on the scratch implementation of reversing
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
                callback(buffer, i, sourceData, destinationData);
            }
        }
        this.src = destinationBuffer;
    }
    /**
     * Reverses the audio buffer in a sync function.
     * Meant for replicating old behavior incase we feel like making
     * some or all mutations async.
     * @deprecated
     */
    reverseSync() {
        // NOTE: This error message is carried over for compat
        if (!this.src) throw "Cannot reverse an empty audio source";
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = sourceData[buffer.length - 1 - i];
        });
    }

    /**
     * Reverses the audio buffer.
     */
    async reverse() {
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = sourceData[buffer.length - 1 - i];
        });
    }
    /**
     * Phase-inverts the audio buffer.
     */
    async invert() {
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = sourceData[i] * -1;
        });
    }
    /**
     * Silences the audio buffer.
     */
    async silence() {
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = sourceData[i] * 0;
        });
    }

    /**
     * Normalizes the audio buffer.
     */
    async normalize() {
        if (!this.src) throw "Cannot mutate an empty audio source";

        // we actually need to do a loop ourselves to get peakAmplitude
        const buffer = this.src;
        let peakAmplitude = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                const amplitude = Math.abs(sourceData[i]);
                if (amplitude > peakAmplitude) peakAmplitude = amplitude;
            }
        }

        // the result wont do anything
        const multiplier = 1 / peakAmplitude;
        if (peakAmplitude === 0 || peakAmplitude === 1) return;
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = sourceData[i] * multiplier;
        });
    }

    /**
     * Amplifies the audio buffer.
     * Note that this multiplication is linear, not logarithmic.
     * @param {number} level The multiplication factor to use.
     */
    async amplify(level) {
        this.mutateSource((buffer, i, sourceData, destinationData) => {
            destinationData[i] = Math.min(Math.max(sourceData[i] * level, -1), 1);
        });
    }

    /**
     * Modifes the audio buffer by slicing regions out. Note that unlike other methods, sample times are expected.
     * 
     * Cutting behaves where the `start` sample is removed, and samples are removed up *untiL* the `end` sample.
     * 
     * - `[0, 2]` will result in sample 0 and 1 being removed, and samples 2+ kept.
     * - `[0, 0]` will result in samples 0+ kept. No samples are removed.
     * 
     * An even number of points is expected, and the sample times should be in chronological order.
     * Sample times are expected to be integers, and should not exceed the bounds of the .
     * @param {Array<number>} points [start, end] sample times for each slice.
     */
    async cutRegions(points) {
        if (!this.src) throw "Cannot mutate an empty audio source";

        // Calculate the new length of the buffer. This is why an even number of points is expected.
        const buffer = this.src;
        let newBufferLength = buffer.length;
        for (let i = 0; i < points.length; i += 2) {
            const start = points[i];
            const end = points[i + 1];
            newBufferLength -= end - start;
        }

        // create the dest buffer
        // NOTE: we actually cant make a buffer of length 0 so we have to disobey the expected result in src.duration cuts
        const destinationBuffer = this._audioContext.createBuffer(
            buffer.numberOfChannels,
            Math.max(newBufferLength, 1),
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const destinationData = destinationBuffer.getChannelData(channel);

            // an even pointsIndex means points[pointsIndex] is a start of cut region
            // an odd pointsIndex means points[pointsIndex] is an end of cut region
            let pointsIndex = 0;
            let skippedSamples = 0;
            for (let i = 0; i < buffer.length; i++) {
                // check if the current sample is entering/exiting a cut region
                // we use while since cropping audio may cause cases of [0, 0, 44100, 95000] (notice the 0, 0)
                // in this case we should handle a 0 length cut by just ignoring it
                while (pointsIndex < points.length && i >= points[pointsIndex]) {
                    pointsIndex++;
                }

                // if odd pointsIndex then this sample is inside a cutting region
                // if we are skipping samples, then we should count in skippedSamples to know how far to offset idx by in the dest
                const skippingSamples = (pointsIndex % 2 === 1);
                if (skippingSamples) {
                    skippedSamples++;
                    continue;
                }
                destinationData[i - skippedSamples] = sourceData[i];
            }
        }
        this.src = destinationBuffer;
    }
    /**
     * Prepends or appends a buffer to the start/end of the audio buffer.
     * @param {AudioBuffer} addingBuffer The buffer to stitch together
     * @param {boolean} append `true` for append, `false` for prepend
     */
    async stitchBuffer(addingBuffer, append) {
        if (!this.src) throw "Cannot mutate an empty audio source";
        if (this.src.sampleRate !== addingBuffer.sampleRate) throw "Cannot work with mismatched sample rates";
        if (this.src.numberOfChannels !== addingBuffer.numberOfChannels) throw "Cannot work with mismatched channel counts";

        const buffer = this.src;
        const destinationBuffer = this._audioContext.createBuffer(
            buffer.numberOfChannels,
            buffer.length + addingBuffer.length,
            buffer.sampleRate
        );

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const sourceData = buffer.getChannelData(channel);
            const addingData = addingBuffer.getChannelData(channel);
            const destinationData = destinationBuffer.getChannelData(channel);

            if (!append) { // prepend
                destinationData.set(addingData, 0);
                destinationData.set(sourceData, addingData.length);
            } else { // append
                destinationData.set(sourceData, 0);
                destinationData.set(addingData, sourceData.length);
            }
        }
        this.src = destinationBuffer;
    }
};

module.exports = BaseAudioSource;