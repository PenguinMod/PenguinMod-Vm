const MathUtil = require('../util/math-util');
const Cast = require('../util/cast');
const Clone = require('../util/clone');

/**
 * Occluded boolean value to make its use more understandable.
 * @const {boolean}
 */
const STORE_WAITING = true;

class Scratch3SoundBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.waitingSounds = {};

        // Clear sound effects on green flag and stop button events.
        this.stopAllSounds = this.stopAllSounds.bind(this);
        this._stopWaitingSoundsForTarget = this._stopWaitingSoundsForTarget.bind(this);
        this._clearEffectsForAllTargets = this._clearEffectsForAllTargets.bind(this);
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', this.stopAllSounds);
            this.runtime.on('PROJECT_STOP_ALL', this._clearEffectsForAllTargets);
            this.runtime.on('STOP_FOR_TARGET', this._stopWaitingSoundsForTarget);
            this.runtime.on('PROJECT_START', this._clearEffectsForAllTargets);
        }

        this._onTargetCreated = this._onTargetCreated.bind(this);
        if (this.runtime) {
            runtime.on('targetWasCreated', this._onTargetCreated);
        }
    }

    /**
     * The key to load & store a target's sound-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.sound';
    }

    /**
     * The default sound-related state, to be used when a target has no existing sound state.
     * @type {SoundState}
     */
    static get DEFAULT_SOUND_STATE () {
        return {
            effects: {
                pitch: 0,
                pan: 0
            }
        };
    }

    /**
     * The minimum and maximum MIDI note numbers, for clamping the input to play note.
     * @type {{min: number, max: number}}
     */
    static get MIDI_NOTE_RANGE () {
        return {min: 36, max: 96}; // C2 to C7
    }

    /**
     * The minimum and maximum beat values, for clamping the duration of play note, play drum and rest.
     * 100 beats at the default tempo of 60bpm is 100 seconds.
     * @type {{min: number, max: number}}
     */
    static get BEAT_RANGE () {
        return {min: 0, max: 100};
    }

    /** The minimum and maximum tempo values, in bpm.
     * @type {{min: number, max: number}}
     */
    static get TEMPO_RANGE () {
        return {min: 20, max: 500};
    }

    /** The minimum and maximum values for each sound effect.
     * @type {{effect:{min: number, max: number}}}
     */
    static get EFFECT_RANGE () {
        return {
            pitch: {min: -360, max: 360}, // -3 to 3 octaves
            pan: {min: -100, max: 100} // 100% left to 100% right
        };
    }

    /** The minimum and maximum values for sound effects when miscellaneous limits are removed. */
    static get LARGER_EFFECT_RANGE () {
        return {
            // scratch-audio throws if pitch is too big because some math results in Infinity
            pitch: {min: -1000, max: 1000},

            // No reason for these to go beyond 100
            pan: {min: -100, max: 100}
        };
    }

    /**
     * @param {Target} target - collect sound state for this target.
     * @returns {SoundState} the mutable sound state associated with that target. This will be created if necessary.
     * @private
     */
    _getSoundState (target) {
        let soundState = target.getCustomState(Scratch3SoundBlocks.STATE_KEY);
        if (!soundState) {
            soundState = Clone.simple(Scratch3SoundBlocks.DEFAULT_SOUND_STATE);
            target.setCustomState(Scratch3SoundBlocks.STATE_KEY, soundState);
            target.soundEffects = soundState.effects;
        }
        return soundState;
    }

    /**
     * When a Target is cloned, clone the sound state.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @listens Runtime#event:targetWasCreated
     * @private
     */
    _onTargetCreated (newTarget, sourceTarget) {
        if (sourceTarget) {
            const soundState = sourceTarget.getCustomState(Scratch3SoundBlocks.STATE_KEY);
            if (soundState && newTarget) {
                newTarget.setCustomState(Scratch3SoundBlocks.STATE_KEY, Clone.simple(soundState));
                this._syncEffectsForTarget(newTarget);
            }
        }
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            sound_play: this.playSound,
            sound_playallsounds: this.playSoundAllLolOpAOIUHFoiubea87fge87iufwhef87wye87fn,
            sound_playuntildone: this.playSoundAndWait,
            sound_stop: this.stopSpecificSound,
            sound_stopallsounds: this.stopAllSounds,
            sound_seteffectto: this.setEffect,
            sound_changeeffectby: this.changeEffect,
            sound_cleareffects: this.clearEffects,
            sound_sounds_menu: this.soundsMenu,
            sound_beats_menu: this.beatsMenu,
            sound_effects_menu: this.effectsMenu,
            sound_setvolumeto: this.setVolume,
            sound_changevolumeby: this.changeVolume,
            sound_volume: this.getVolume,
            sound_isSoundPlaying: this.isSoundPlaying,
            sound_getEffectValue: this.getEffectValue,
            sound_getLength: this.getLength,
            sound_set_stop_fadeout_to: this.setStopFadeout,
            sound_play_at_seconds: this.playAtSeconds,
            sound_play_at_seconds_until_done: this.playAtSecondsAndWait,
            sound_getSoundVolume: this.currentSoundVolume
        };
    }

    getMonitored () {
        return {
            sound_volume: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_volume`
            }
        };
    }

    currentSoundVolume (args, util) {
        
    }

    playAtSeconds (args, util) {
        const seconds = Cast.toNumber(args.VALUE);
        if (seconds < 0) {
            return;
        }
        
        this._playSoundAtTimePosition({
            sound: Cast.toString(args.SOUND_MENU),
            seconds: seconds
        }, util, STORE_WAITING);
    }
    playAtSecondsAndWait (args, util) {
        // return promise
        const seconds = Cast.toNumber(args.VALUE);
        if (seconds < 0) {
            return;
        }

        return this._playSoundAtTimePosition({
            sound: Cast.toString(args.SOUND_MENU),
            seconds: seconds
        }, util, STORE_WAITING);
    }

    _playSoundAtTimePosition ({ sound, seconds }, util, storeWaiting) {
        const index = this._getSoundIndex(sound, util);
        if (index >= 0) {
            const {target} = util;
            const {sprite} = target;
            const {soundId} = sprite.sounds[index];
            if (sprite.soundBank) {
                if (storeWaiting === STORE_WAITING) {
                    this._addWaitingSound(target.id, soundId);
                } else {
                    this._removeWaitingSound(target.id, soundId);
                }
                return sprite.soundBank.playSound(target, soundId, seconds);
            }
        }
    }

    setStopFadeout (args, util) {
        const id = Cast.toString(args.SOUND_MENU);
        const index = this._getSoundIndex(id, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        if (!sprite.sounds) return;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return;

        const decayTime = Cast.toNumber(args.VALUE);
        if (decayTime <= 0) {
            soundBank.soundPlayers[soundId].stopFadeDecay = 0;
            return;
        }

        soundBank.soundPlayers[soundId].stopFadeDecay = decayTime;
    }

    getEffectValue (args, util) {
        const target = util.target;

        const effects = target.soundEffects;
        if (!effects) return 0;

        const effect = Cast.toString(args.EFFECT).toLowerCase();
        if (!effects.hasOwnProperty(effect)) return 0;
        const value = Cast.toNumber(effects[effect]);

        return value;
    }

    isSoundPlaying (args, util) {
        const index = this._getSoundIndex(args.SOUND_MENU, util);
        if (index < 0) return false;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return false;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return false;
        const players = soundBank.soundPlayers;
        if (!players) return false;
        if (!players.hasOwnProperty(soundId)) return false;

        return players[soundId].isPlaying == true;
    }

    getLength (args, util) {
        const index = this._getSoundIndex(args.SOUND_MENU, util);
        if (index < 0) return 0;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return 0;

        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return 0;
        const players = soundBank.soundPlayers;
        if (!players) return 0;
        if (!players.hasOwnProperty(soundId)) return 0;
        const buffer = players[soundId].buffer;
        if (!buffer) return 0;

        return Cast.toNumber(buffer.duration);
    }

    stopSpecificSound (args, util) {
        const index = this._getSoundIndex(args.SOUND_MENU, util);
        if (index < 0) return;

        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        
        const { soundId } = sprite.sounds[index];

        const soundBank = sprite.soundBank
        if (!soundBank) return;

        soundBank.stop(target, soundId);
    }

    playSound (args, util) {
        // Don't return the promise, it's the only difference for AndWait
        this._playSound(args, util);
    }

    playSoundAndWait (args, util) {
        return this._playSound(args, util, STORE_WAITING);
    }

    _playSound (args, util, storeWaiting) {
        const index = this._getSoundIndex(args.SOUND_MENU, util);
        if (index >= 0) {
            const {target} = util;
            const {sprite} = target;
            const {soundId} = sprite.sounds[index];
            if (sprite.soundBank) {
                if (storeWaiting === STORE_WAITING) {
                    this._addWaitingSound(target.id, soundId);
                } else {
                    this._removeWaitingSound(target.id, soundId);
                }
                return sprite.soundBank.playSound(target, soundId);
            }
        }
    }

    _addWaitingSound (targetId, soundId) {
        if (!this.waitingSounds[targetId]) {
            this.waitingSounds[targetId] = new Set();
        }
        this.waitingSounds[targetId].add(soundId);
    }

    _removeWaitingSound (targetId, soundId) {
        if (!this.waitingSounds[targetId]) {
            return;
        }
        this.waitingSounds[targetId].delete(soundId);
    }

    _getSoundIndex (soundName, util) {
        // if the sprite has no sounds, return -1
        const len = util.target.sprite.sounds.length;
        if (len === 0) {
            return -1;
        }

        // look up by name first
        const index = this.getSoundIndexByName(soundName, util);
        if (index !== -1) {
            return index;
        }

        // then try using the sound name as a 1-indexed index
        const oneIndexedIndex = parseInt(soundName, 10);
        if (!isNaN(oneIndexedIndex)) {
            return MathUtil.wrapClamp(oneIndexedIndex - 1, 0, len - 1);
        }

        // could not be found as a name or converted to index, return -1
        return -1;
    }

    getSoundIndexByName (soundName, util) {
        const sounds = util.target.sprite.sounds;
        // if there is no sound by that name, return -1
        return sounds.findIndex(sound => sound.name === soundName);
    }

    stopAllSounds () {
        if (this.runtime.targets === null) return;
        const allTargets = this.runtime.targets;
        for (let i = 0; i < allTargets.length; i++) {
            this._stopAllSoundsForTarget(allTargets[i]);
        }
    }

    playSoundAllLolOpAOIUHFoiubea87fge87iufwhef87wye87fn (_, util) {
        const target = util.target;
        const sprite = target.sprite;
        if (!sprite) return;
        for (let i = 0; i < sprite.sounds.length; i++) {
            const { soundId } = sprite.sounds[i];
            if (sprite.soundBank) {
                sprite.soundBank.playSound(target, soundId);
            }
        }
    }

    _stopAllSoundsForTarget (target) {
        if (target.sprite.soundBank) {
            target.sprite.soundBank.stopAllSounds(target);
            if (this.waitingSounds[target.id]) {
                this.waitingSounds[target.id].clear();
            }
        }
    }

    _stopWaitingSoundsForTarget (target) {
        if (target.sprite.soundBank) {
            if (this.waitingSounds[target.id]) {
                for (const soundId of this.waitingSounds[target.id].values()) {
                    target.sprite.soundBank.stop(target, soundId);
                }
                this.waitingSounds[target.id].clear();
            }
        }
    }

    setEffect (args, util) {
        return this._updateEffect(args, util, false);
    }

    changeEffect (args, util) {
        return this._updateEffect(args, util, true);
    }

    _updateEffect (args, util, change) {
        const effect = Cast.toString(args.EFFECT).toLowerCase();
        const value = Cast.toNumber(args.VALUE);

        const soundState = this._getSoundState(util.target);
        if (!soundState.effects.hasOwnProperty(effect)) return;

        if (change) {
            soundState.effects[effect] += value;
        } else {
            soundState.effects[effect] = value;
        }

        const miscLimits = this.runtime.runtimeOptions.miscLimits;
        const {min, max} = miscLimits ?
            Scratch3SoundBlocks.EFFECT_RANGE[effect] :
            Scratch3SoundBlocks.LARGER_EFFECT_RANGE[effect];
        soundState.effects[effect] = MathUtil.clamp(soundState.effects[effect], min, max);

        this._syncEffectsForTarget(util.target);
        if (miscLimits) {
            // Yield until the next tick.
            return Promise.resolve();
        }

        // Requesting a redraw makes sure that "forever: change pitch by 1" still work but without
        // yielding unnecessarily in other cases
        this.runtime.requestRedraw();
    }

    _syncEffectsForTarget (target) {
        if (!target || !target.sprite.soundBank) return;
        target.soundEffects = this._getSoundState(target).effects;

        target.sprite.soundBank.setEffects(target);
    }

    clearEffects (args, util) {
        this._clearEffectsForTarget(util.target);
    }

    _clearEffectsForTarget (target) {
        const soundState = this._getSoundState(target);
        Object.keys(soundState.effects).forEach(effect => {
            soundState.effects[effect] = 0;
        });
        this._syncEffectsForTarget(target);
    }

    _clearEffectsForAllTargets () {
        if (this.runtime.targets === null) return;
        const allTargets = this.runtime.targets;
        for (let i = 0; i < allTargets.length; i++) {
            this._clearEffectsForTarget(allTargets[i]);
        }
    }

    setVolume (args, util) {
        const volume = Cast.toNumber(args.VOLUME);
        return this._updateVolume(volume, util.target);
    }

    changeVolume (args, util) {
        const volume = Cast.toNumber(args.VOLUME) + util.target.volume;
        return this._updateVolume(volume, util.target);
    }

    _updateVolume (volume, target) {
        volume = MathUtil.clamp(volume, 0, 100);
        target.volume = volume;
        this._syncEffectsForTarget(target);

        if (this.runtime.runtimeOptions.miscLimits) {
            // Yield until the next tick.
            return Promise.resolve();
        }
        this.runtime.requestRedraw();
    }

    getVolume (args, util) {
        return util.target.volume;
    }

    soundsMenu (args) {
        return args.SOUND_MENU;
    }

    beatsMenu (args) {
        return args.BEATS;
    }

    effectsMenu (args) {
        return args.EFFECT;
    }
}

module.exports = Scratch3SoundBlocks;
