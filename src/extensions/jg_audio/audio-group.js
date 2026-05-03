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

        /**
         * The global volume for all sources in this audio group.
         * Acts like a multiplier.
         * @type {number}
         */
        this.volume = volume ?? 1;
        /**
         * The global speed for all sources in this audio group.
         * Acts like a multiplier.
         * @type {number}
         */
        this.speed = speed ?? 1;
        /**
         * The global detune for all sources in this audio group.
         * @type {number}
         */
        this.detune = detune ?? 0;
        /**
         * The global pan for all sources in this audio group.
         * Range from -1 to 1. -1 = left ear, 1 = right ear
         * @type {number}
         */
        this.pan = pan ?? 0;
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
        // i dont like deleting things while looping through them
        const audioSourceIds = Object.keys(this.sources);
        for (const audioSourceId of audioSourceIds) {
            const audioSource = this.sources[audioSourceId];
            audioSource.dispose();
            delete this.sources[audioSourceId];
        }
    }
    /**
     * Removes an audio source from the sources list if it exists.
     */
    disposeIfExists (sourceId) {
        const existingSource = this.sources[sourceId];
        if (existingSource) {
            existingSource.dispose();
            delete this.sources[sourceId];
        }
    }
};

module.exports = AudioGroup;