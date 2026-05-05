/**
 * An audio effect in the jgExtendedAudio extension.
 * Contains the logic for creating Web Audio API nodes for effects
 * @type {AudioEffect}
 */
class AudioEffect {
    constructor() {
        /**
         * The AudioSource this effect is attached to.
         * @type {import("./audio-source")}
         */
        this.source = null;
    }

    // TODO: Implement AudioEffect
    attach(source) {
        
    }
};

module.exports = AudioEffect;