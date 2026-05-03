const AudioSource = require("./audio-source");

/**
 * An audio group in the jgExtendedAudio extension.
 * Contains audio sources, and has global settings that are applied to all sources.
 * @type {AudioGroup}
 */
class AudioGroup {
    /**
     * The properties to add at the start of an audio group's creation.
     * @typedef {Object} AudioGroupSetupProperties
     * @property {number | null} volume The global volume for all sources in this audio group. Acts like a multiplier.
     * @property {number | null} speed The global speed for all sources in this audio group. Acts like a multiplier.
     * @property {number | null} detune The global detune for all sources in this audio group.
     * @property {number | null} pan The global pan for all sources in this audio group. Range from -1 to 1. -1 = left ear, 1 = right ear
     */
    /**
     * Create an audio group with optional properties.
     * @param {AudioGroupSetupProperties?} properties The properties to add at the start of the audio group's creation.
     */
    constructor(properties = {}) {
        const { volume, speed, detune, pan } = properties;
        
        /**
         * An object with id to AudioSource pairs.
         * @type {Object<string, AudioSource>}
         */
        this.sources = {};

        // make the internal variables
        // we dont need to update sources here since we dont add any on creation
        this._volume = volume ?? 1;
        this._speed = speed ?? 1;
        this._detune = detune ?? 0;
        this._pan = pan ?? 0;
    }

    /**
     * The global volume for all sources in this audio group.
     * Acts like a multiplier.
     * @type {number}
     */
    get volume () {
        return this._volume;
    }
    set volume (value) {
        this._volume = value;
        this.updateSources();
    }

    /**
     * The global speed for all sources in this audio group.
     * Acts like a multiplier.
     * @type {number}
     */
    get speed () {
        return this._speed;
    }
    set speed (value) {
        this._speed = value;
        this.updateSources();
    }

    /**
     * The global detune for all sources in this audio group.
     * @type {number}
     */
    get detune () {
        return this._detune;
    }
    set detune (value) {
        this._detune = value;
        this.updateSources();
    }

    /**
     * The global pan for all sources in this audio group.
     * Range from -1 to 1. -1 = left ear, 1 = right ear
     * @type {number}
     */
    get pan () {
        return this._pan;
    }
    set pan (value) {
        this._pan = value;
        this.updateSources();
    }

    /**
     * Propagate updates from the audio group to audio sources.
     */
    updateSources () {
        for (const audioSourceId in this.sources) {
            const audioSource = this.sources[audioSourceId];
            audioSource.update();
        }
    }
    /**
     * Dispose of all sources in the audio group.
     * Lets you easily delete the whole audio group.
     */
    disposeSources () {
        for (const audioSourceId in this.sources) {
            const audioSource = this.sources[audioSourceId];
            audioSource.dispose();
        }
    }
};

module.exports = AudioGroup;