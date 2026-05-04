const BaseAudioSource = require("./base-audio-source");

class OfflineAudioSource extends BaseAudioSource {
    constructor(audioGroup, audioContext, audioGainNode) {
        super(audioGroup, audioContext, audioGainNode);

        /**
         * The delay until this source will play.
         * @type {number}
         */
        this.renderTime = 0;

        // internal vars
        this._audioNode = null;
    }

    play(atTime = this.startPosition) {
        if (!this.src) throw "Cannot play an empty audio source";
        if (this._audioNode) throw "Source has already played";

        // NOTE: We save this source for .update() to work since we also expect .dispose() to be ran after rendering completes
        const source = this._audioContext.createBufferSource();
        this._audioNode = source;
        this.update();

        source.buffer = this.src;
        source.connect(this._audioGainNode);

        // TODO: IMPORTANT: Implement looping in OfflineAudioSources
        // we need to know when the sound starts, so we know how long to play for
        // we also need to change endTimePos if we are looping
        let startTimePos = atTime ?? this.startPosition;
        let endTimePos = this.endPosition;
        if (this.looping) {
            endTimePos = this.loopEndPosition;
        }

        // dont play the sound if the playback duration is less than 1 sample frame to match AudioSource
        const playbackDuration = Math.min(Math.max(endTimePos - startTimePos, 0), this.duration);
        if (playbackDuration < 1 / this.src.sampleRate) {
            return;
        } else {
            source.start(this.renderTime, Math.min(Math.max(startTimePos, 0), this.duration), playbackDuration);
        }
    }

    update() {
        const audioNode = this._audioNode;
        super.update();

        if (!audioNode) return;
        // we actually dont use detune directly, instead playbackRate will calculate it
        audioNode.playbackRate.value = this.playbackRate;
    }
    dispose() {
        this._disposed = true;

        if (this._audioNode) {
            try {
                this._audioNode.disconnect();
            } catch {
                // ...
            }
        }

        // dispose of the other stuff
        super.dispose();

        // remove references
        this._audioNode = null;
    }
};

module.exports = OfflineAudioSource;