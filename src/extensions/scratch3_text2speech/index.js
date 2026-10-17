const formatMessage = require('format-message');
const languageNames = require('scratch-translate-extension-languages');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const MathUtil = require('../../util/math-util');
const Clone = require('../../util/clone');
const log = require('../../util/log');
const {fetchWithTimeout} = require('../../util/fetch-with-timeout');

/**
 * Icon svg to be displayed in the blocks category menu, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9UZXh0LXRvLVNwZWVjaC1NZW51PC90aXRsZT48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iPjxwYXRoIGZpbGw9IiM0ZDRkNGQiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9Ii4xNSIgc3Ryb2tlLXdpZHRoPSIuNSIgZD0iTTcuNzUgMTAuODM1YzAtLjUwOC0uNzQ3LS43OTMtMS4xOTQtLjM5bC0xLjM1IDEuMDhjLS41MS40MDgtMS4xNjkuNjQtMS44NTYuNjRoLS4yYy0uNTE3IDAtLjkuMzQ2LS45Ljc4N3YyLjExN2MwIC40NDIuMzgzLjc4Ny45Ljc4N2guMmMuNzI5IDAgMS4zNzcuMjEgMS45MS42NDNsMS4zIDEuMDhjLjQ1My4zNzYgMS4xOS4wOTUgMS4xOS0uNDM3eiIvPjxwYXRoIGZpbGw9IiMwZWJkOGMiIGQ9Ik0xMi43MDUgMTBjLS45MTQgMS4xMzEtMi4zOTggMS43MTQtMi44NzIgMS43MTQgMCAwLS4zMzMgMC0uMzMzLS4zMzMgMC0uMjk2LjU2Mi0uNDguNjktMS44MTNBNCA0IDAgMCAxIDEyIDJoMmE0IDQgMCAxIDEgMCA4eiIvPjwvZz48L3N2Zz4=';

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48dGl0bGU+RXh0ZW5zaW9ucy9Tb2Z0d2FyZS9UZXh0LXRvLVNwZWVjaC1CbG9jazwvdGl0bGU+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJub256ZXJvIiBzdHJva2U9IiMwMDAiIHN0cm9rZS1vcGFjaXR5PSIuMTUiPjxwYXRoIGZpbGw9IiM0ZDRkNGQiIGQ9Ik0xNS41IDIxLjY3YzAtMS4wMTYtMS40OTQtMS41ODYtMi4zODctLjc4MmwtMi43IDIuMTYzQTUuOTYgNS45NiAwIDAgMSA2LjcgMjQuMzNoLS40Yy0xLjAzNSAwLTEuOC42OS0xLjggMS41NzN2NC4yMzVjMCAuODgzLjc2NSAxLjU3MiAxLjggMS41NzJoLjRjMS40NTggMCAyLjc1NC40MjMgMy44MiAxLjI4N2wyLjU5OCAyLjE2MWMuOTA4Ljc1IDIuMzgyLjE4OCAyLjM4Mi0uODc2eiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0yNS42NDQgMjAuNWMtMS42NjcgMS45MzctNC41MzkgMy40MjktNS45NzcgMy40MjlhMS4yNSAxLjI1IDAgMCAxLS41NTctLjEzN2MtLjM3Mi0uMTg2LS42MS0uNTQyLS42MS0xLjAzcTAtLjE1Ny4wNS0uMzA4Yy4wNzYtLjIzNi42MjQtLjk4Ni43MjctMS4xNzMuMjctLjQ4NC40NjItMS4wNzUuNTY2LTEuODY1QTguNSA4LjUgMCAwIDEgMjQgMy41aDRhOC41IDguNSAwIDEgMSAwIDE3eiIvPjwvZz48L3N2Zz4=';

/**
 * The url of the synthesis server.
 * @type {string}
 */
const SERVER_HOST = 'https://synthesis-service.scratch.mit.edu';

/**
 * pm: The url of the extra synthesis server. Contains new voices.
 * @type {string}
 */
const PM_SERVER_HOST = 'https://gextapi.derpygamer2142.com';

/**
 * How long to wait in ms before timing out requests to synthesis server.
 * @type {int}
 */
const SERVER_TIMEOUT = 10000; // 10 seconds

/**
 * Volume for playback of speech sounds, as a percentage.
 * @type {number}
 */
const SPEECH_VOLUME = 250;

/**
 * An id for one of the voices.
 */
const ALTO_ID = 'ALTO';

/**
 * An id for one of the voices.
 */
const TENOR_ID = 'TENOR';

/**
 * An id for one of the voices.
 */
const SQUEAK_ID = 'SQUEAK';

/**
 * An id for one of the voices.
 */
const GIANT_ID = 'GIANT';

/**
 * An id for one of the voices.
 */
const KITTEN_ID = 'KITTEN';

/**
 * An id for one of the voices.
 */
const GOOGLE_ID = 'GOOGLE';

/**
 * Playback rate for the tenor voice, for cases where we have only a female gender voice.
 */
const FEMALE_TENOR_RATE = 0.89; // -2 semitones

/**
 * Playback rate for the giant voice, for cases where we have only a female gender voice.
 */
const FEMALE_GIANT_RATE = 0.79; // -4 semitones

/**
 * Language ids. The value for each language id is a valid Scratch locale.
 */
const ARABIC_ID = 'ar';
const CHINESE_ID = 'zh-cn';
const DANISH_ID = 'da';
const DUTCH_ID = 'nl';
const ENGLISH_ID = 'en';
const FRENCH_ID = 'fr';
const GERMAN_ID = 'de';
const HINDI_ID = 'hi';
const ICELANDIC_ID = 'is';
const ITALIAN_ID = 'it';
const JAPANESE_ID = 'ja';
const KOREAN_ID = 'ko';
const NORWEGIAN_ID = 'nb';
const POLISH_ID = 'pl';
const PORTUGUESE_BR_ID = 'pt-br';
const PORTUGUESE_ID = 'pt';
const ROMANIAN_ID = 'ro';
const RUSSIAN_ID = 'ru';
const SPANISH_ID = 'es';
const SPANISH_419_ID = 'es-419';
const SWEDISH_ID = 'sv';
const TURKISH_ID = 'tr';
const WELSH_ID = 'cy';

/**
 * Clamps a number to a valid playback rate. These limits are based
 * on the Chromium & Firefox audio element limits.
 * @param {Number} value Number to clamp.
 * @returns {Number} clamped number.
 */
const clampToValidPlaybackRate = (value) => {
    return Math.min(Math.max(value, 0.0625), 16);
};

/**
 * Class for the text2speech blocks.
 * @constructor
 */
class Scratch3Text2SpeechBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * Map of soundPlayers by sound id.
         * @type {Map<string, SoundPlayer>}
         */
        this._soundPlayers = new Map();

        this._stopAllSpeech = this._stopAllSpeech.bind(this);
        if (this.runtime) {
            this.runtime.on('PROJECT_STOP_ALL', this._stopAllSpeech);
        }

        this._onTargetCreated = this._onTargetCreated.bind(this);
        if (this.runtime) {
            runtime.on('targetWasCreated', this._onTargetCreated);
        }

        /**
         * A list of all Scratch locales that are supported by the extension.
         * @type {Array}
         */
        this._supportedLocales = this._getSupportedLocales();
    }

    /**
     * An object with info for each voice.
     */
    get VOICE_INFO () {
        return {
            [ALTO_ID]: {
                name: formatMessage({
                    id: 'text2speech.alto',
                    default: 'alto',
                    description: 'Name for a voice with ambiguous gender.'
                }),
                gender: 'female',
                playbackRate: 1
            },
            [TENOR_ID]: {
                name: formatMessage({
                    id: 'text2speech.tenor',
                    default: 'tenor',
                    description: 'Name for a voice with ambiguous gender.'
                }),
                gender: 'male',
                playbackRate: 1
            },
            [SQUEAK_ID]: {
                name: formatMessage({
                    id: 'text2speech.squeak',
                    default: 'squeak',
                    description: 'Name for a funny voice with a high pitch.'
                }),
                gender: 'female',
                playbackRate: 1.19 // +3 semitones
            },
            [GIANT_ID]: {
                name: formatMessage({
                    id: 'text2speech.giant',
                    default: 'giant',
                    description: 'Name for a funny voice with a low pitch.'
                }),
                gender: 'male',
                playbackRate: 0.84 // -3 semitones
            },
            [KITTEN_ID]: {
                name: formatMessage({
                    id: 'text2speech.kitten',
                    default: 'kitten',
                    description: 'A baby cat.'
                }),
                gender: 'female',
                playbackRate: 1.41 // +6 semitones
            },
            [GOOGLE_ID]: {
                name: formatMessage({
                    id: 'text2speech.google',
                    default: 'google',
                    description: 'Name for a voice with ambiguous gender.'
                }),
                special: 'google',
                gender: 'mixed',
                playbackRate: 1
            },
        };
    }

    /**
     * An object with information for each language.
     *
     * A note on the different sets of locales referred to in this extension:
     *
     * SCRATCH LOCALE
     *      Set by the editor, and used to store the language state in the project.
     *      Listed in l10n: https://github.com/scratchfoundation/scratch-l10n/blob/master/src/supported-locales.js
     * SUPPORTED LOCALE
     *      A Scratch locale that has a corresponding extension locale.
     * EXTENSION LOCALE
     *      A locale corresponding to one of the available spoken languages
     *      in the extension. There can be multiple supported locales for a single
     *      extension locale. For example, for both written versions of chinese,
     *      zh-cn and zh-tw, we use a single spoken language (Mandarin). So there
     *      are two supported locales, with a single extension locale.
     * SPEECH SYNTH LOCALE
     *      A different locale code system, used by our speech synthesis service.
     *      Each extension locale has a speech synth locale.
     * PENGUINMOD SYNTH LOCALE
     *      A different locale code system, used by PenguinMod's speech synthesis service.
     *      Each extension locale has a PenguinMod synth locale, and some may be the same as another locale.
     */
    get LANGUAGE_INFO () {
        return {
            [ARABIC_ID]: {
                name: 'Arabic',
                locales: ['ar'],
                speechSynthLocale: 'arb',
                penguinmodSynthLocale: 'ar',
                singleGender: true
            },
            [CHINESE_ID]: {
                name: 'Chinese (Mandarin)',
                locales: ['zh-cn', 'zh-tw'],
                speechSynthLocale: 'cmn-CN',
                penguinmodSynthLocale: 'zh-cn',
                singleGender: true
            },
            [DANISH_ID]: {
                name: 'Danish',
                locales: ['da'],
                speechSynthLocale: 'da-DK',
                penguinmodSynthLocale: 'da',
            },
            [DUTCH_ID]: {
                name: 'Dutch',
                locales: ['nl'],
                speechSynthLocale: 'nl-NL',
                penguinmodSynthLocale: 'nl',
            },
            [ENGLISH_ID]: {
                name: 'English',
                locales: ['en'],
                speechSynthLocale: 'en-US',
                penguinmodSynthLocale: 'en',
            },
            [FRENCH_ID]: {
                name: 'French',
                locales: ['fr'],
                speechSynthLocale: 'fr-FR',
                penguinmodSynthLocale: 'fr',
            },
            [GERMAN_ID]: {
                name: 'German',
                locales: ['de'],
                speechSynthLocale: 'de-DE',
                penguinmodSynthLocale: 'de',
            },
            [HINDI_ID]: {
                name: 'Hindi',
                locales: ['hi'],
                speechSynthLocale: 'hi-IN',
                penguinmodSynthLocale: 'hi',
                singleGender: true
            },
            [ICELANDIC_ID]: {
                name: 'Icelandic',
                locales: ['is'],
                speechSynthLocale: 'is-IS',
                penguinmodSynthLocale: 'is',
            },
            [ITALIAN_ID]: {
                name: 'Italian',
                locales: ['it'],
                speechSynthLocale: 'it-IT',
                penguinmodSynthLocale: 'it',
            },
            [JAPANESE_ID]: {
                name: 'Japanese',
                locales: ['ja', 'ja-hira'],
                speechSynthLocale: 'ja-JP',
                penguinmodSynthLocale: 'ja',
            },
            [KOREAN_ID]: {
                name: 'Korean',
                locales: ['ko'],
                speechSynthLocale: 'ko-KR',
                penguinmodSynthLocale: 'ko',
                singleGender: true
            },
            [NORWEGIAN_ID]: {
                name: 'Norwegian',
                locales: ['nb', 'nn'],
                speechSynthLocale: 'nb-NO',
                penguinmodSynthLocale: 'no',
                singleGender: true
            },
            [POLISH_ID]: {
                name: 'Polish',
                locales: ['pl'],
                speechSynthLocale: 'pl-PL',
                penguinmodSynthLocale: 'pl',
            },
            [PORTUGUESE_BR_ID]: {
                name: 'Portuguese (Brazilian)',
                locales: ['pt-br'],
                speechSynthLocale: 'pt-BR',
                penguinmodSynthLocale: 'pt-br',
            },
            [PORTUGUESE_ID]: {
                name: 'Portuguese (European)',
                locales: ['pt'],
                speechSynthLocale: 'pt-PT',
                penguinmodSynthLocale: 'pt',
            },
            [ROMANIAN_ID]: {
                name: 'Romanian',
                locales: ['ro'],
                speechSynthLocale: 'ro-RO',
                penguinmodSynthLocale: 'ro',
                singleGender: true
            },
            [RUSSIAN_ID]: {
                name: 'Russian',
                locales: ['ru'],
                speechSynthLocale: 'ru-RU',
                penguinmodSynthLocale: 'ru',
            },
            [SPANISH_ID]: {
                name: 'Spanish (European)',
                locales: ['es'],
                speechSynthLocale: 'es-ES',
                penguinmodSynthLocale: 'es-es',
            },
            [SPANISH_419_ID]: {
                name: 'Spanish (Latin American)',
                locales: ['es-419'],
                speechSynthLocale: 'es-US',
                penguinmodSynthLocale: 'es-us',
            },
            [SWEDISH_ID]: {
                name: 'Swedish',
                locales: ['sv'],
                speechSynthLocale: 'sv-SE',
                penguinmodSynthLocale: 'sv',
                singleGender: true
            },
            [TURKISH_ID]: {
                name: 'Turkish',
                locales: ['tr'],
                speechSynthLocale: 'tr-TR',
                penguinmodSynthLocale: 'tr',
                singleGender: true
            },
            [WELSH_ID]: {
                name: 'Welsh',
                locales: ['cy'],
                speechSynthLocale: 'cy-GB',
                penguinmodSynthLocale: 'cy',
                singleGender: true
            }
        };
    }

    /**
     * An array of IDs containing voices that will only work on PenguinMod's API.
     */
    get PENGUINMOD_VOICES () {
        return [
            GOOGLE_ID
        ];
    }

    /**
     * Key-value pairs for turning a voice ID into the parameter for the PenguinMod API.
     */
    get PENGUINMOD_VOICE_MAP () {
        return {
            [GOOGLE_ID]: 'google'
        };
    }

    /**
     * Key-value pairs for getting a default volume value for PenguinMod voices.
     * The volumes are a percentage number like 100 for 100% volume.
     */
    get PENGUINMOD_VOICE_VOLUMES () {
        return {
            [GOOGLE_ID]: 100
        };
    }

    /**
     * The key to load & store a target's text2speech state.
     * @return {string} The key.
     */
    static get STATE_KEY () {
        return 'Scratch.text2speech';
    }

    /**
     * The default state, to be used when a target has no existing state.
     * @type {Text2SpeechState}
     */
    static get DEFAULT_TEXT2SPEECH_STATE () {
        return {
            voiceId: ALTO_ID
        };
    }

    /**
     * A default language to use for speech synthesis.
     * @type {string}
     */
    get DEFAULT_LANGUAGE () {
        return ENGLISH_ID;
    }

    /**
     * @param {Target} target - collect  state for this target.
     * @returns {Text2SpeechState} the mutable state associated with that target. This will be created if necessary.
     * @private
     */
    _getState (target) {
        let state = target.getCustomState(Scratch3Text2SpeechBlocks.STATE_KEY);
        if (!state) {
            state = Clone.simple(Scratch3Text2SpeechBlocks.DEFAULT_TEXT2SPEECH_STATE);
            target.setCustomState(Scratch3Text2SpeechBlocks.STATE_KEY, state);
        }
        return state;
    }

    /**
     * When a Target is cloned, clone the state.
     * @param {Target} newTarget - the newly created target.
     * @param {Target} [sourceTarget] - the target used as a source for the new clone, if any.
     * @listens Runtime#event:targetWasCreated
     * @private
     */
    _onTargetCreated (newTarget, sourceTarget) {
        if (sourceTarget) {
            const state = sourceTarget.getCustomState(Scratch3Text2SpeechBlocks.STATE_KEY);
            if (state) {
                newTarget.setCustomState(Scratch3Text2SpeechBlocks.STATE_KEY, Clone.simple(state));
            }
        }
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        // Only localize the default input to the "speak" block if we are in a
        // supported language.
        let defaultTextToSpeak = 'hello';
        if (this.isSupportedLanguage(this.getEditorLanguage())) {
            defaultTextToSpeak = formatMessage({
                id: 'text2speech.defaultTextToSpeak',
                default: 'hello',
                description: 'hello: the default text to speak'
            });
        }

        return {
            id: 'text2speech',
            name: formatMessage({
                id: 'text2speech.categoryName',
                default: 'Text to Speech',
                description: 'Name of the Text to Speech extension.'
            }),
            blockIconURI: blockIconURI,
            menuIconURI: menuIconURI,
            blocks: [
                {
                    opcode: 'speakAndWait',
                    text: formatMessage({
                        id: 'text2speech.speakAndWaitBlock',
                        default: 'speak [WORDS]',
                        description: 'Speak some words.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        WORDS: {
                            type: ArgumentType.STRING,
                            defaultValue: defaultTextToSpeak
                        }
                    }
                },
                {
                    opcode: 'setVoice',
                    text: formatMessage({
                        id: 'text2speech.setVoiceBlock',
                        default: 'set voice to [VOICE]',
                        description: 'Set the voice for speech synthesis.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VOICE: {
                            type: ArgumentType.STRING,
                            menu: 'voices',
                            defaultValue: ALTO_ID
                        }
                    }
                },
                {
                    opcode: 'setLanguage',
                    text: formatMessage({
                        id: 'text2speech.setLanguageBlock',
                        default: 'set language to [LANGUAGE]',
                        description: 'Set the language for speech synthesis.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        LANGUAGE: {
                            type: ArgumentType.STRING,
                            menu: 'languages',
                            defaultValue: this.getCurrentLanguage()
                        }
                    }
                },
                {
                    opcode: 'setSpeed',
                    text: formatMessage({
                        id: 'pm.text2speech.setSpeedBlock',
                        default: 'set reading speed to [SPEED]%',
                        description: 'Set the reading speed and pitch for speech synthesis.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        SPEED: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                }
            ],
            menus: {
                voices: {
                    acceptReporters: true,
                    items: this.getVoiceMenu()
                },
                languages: {
                    acceptReporters: true,
                    items: this.getLanguageMenu()
                }
            }
        };
    }

    /**
     * Get the language code currently set in the editor, or fall back to the
     * browser locale.
     * @return {string} a Scratch locale code.
     */
    getEditorLanguage () {
        const locale = formatMessage.setup().locale ||
            navigator.language || navigator.userLanguage || this.DEFAULT_LANGUAGE;
        return locale.toLowerCase();
    }

    /**
     * Get the language code currently set for the extension.
     * @returns {string} a Scratch locale code.
     */
    getCurrentLanguage () {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return this.DEFAULT_LANGUAGE;
        // If no language has been set, set it to the editor locale (or default).
        if (!stage.textToSpeechLanguage) {
            this.setCurrentLanguage(this.getEditorLanguage());
        }
        return stage.textToSpeechLanguage;
    }

    /**
     * Set the language code for the extension.
     * It is stored in the stage so it can be saved and loaded with the project.
     * @param {string} locale a locale code.
     */
    setCurrentLanguage (locale) {
        const stage = this.runtime.getTargetForStage();
        if (!stage) return;

        if (this.isSupportedLanguage(locale)) {
            stage.textToSpeechLanguage = this._getExtensionLocaleForSupportedLocale(locale);
        }

        // Support language names dropped onto the menu via reporter block
        // such as a variable containing a language name (in any language),
        // or the translate extension's language reporter.
        const localeForDroppedName = languageNames.nameMap[locale.toLowerCase()];
        if (localeForDroppedName && this.isSupportedLanguage(localeForDroppedName)) {
            stage.textToSpeechLanguage =
                this._getExtensionLocaleForSupportedLocale(localeForDroppedName);
        }

        // If the language is null, set it to the default language.
        // This can occur e.g. if the extension was loaded with the editor
        // set to a language that is not in the list.
        if (!stage.textToSpeechLanguage) {
            stage.textToSpeechLanguage = this.DEFAULT_LANGUAGE;
        }
    }

    /**
     * Get the extension locale for a supported locale, or null.
     * @param {string} locale a locale code.
     * @returns {?string} a locale supported by the extension.
     */
    _getExtensionLocaleForSupportedLocale (locale) {
        for (const lang in this.LANGUAGE_INFO) {
            if (this.LANGUAGE_INFO[lang].locales.includes(locale)) {
                return lang;
            }
        }
        log.error(`cannot find extension locale for locale ${locale}`);
    }

    /**
     * Get the locale code used by the speech synthesis server corresponding to
     * the current language code set for the extension.
     * @returns {string} a speech synthesis locale.
     */
    _getSpeechSynthLocale () {
        let speechSynthLocale = this.LANGUAGE_INFO[this.DEFAULT_LANGUAGE].speechSynthLocale;
        if (this.LANGUAGE_INFO[this.getCurrentLanguage()]) {
            speechSynthLocale = this.LANGUAGE_INFO[this.getCurrentLanguage()].speechSynthLocale;
        }
        return speechSynthLocale;
    }

    /**
     * Get the locale code used by the PenguinMod TTS server corresponding to
     * the current language code set for the extension.
     * @returns {string} a PenguinMod TTS locale.
     */
    _getPenguinModSynthLocale () {
        let speechSynthLocale = this.LANGUAGE_INFO[this.DEFAULT_LANGUAGE].penguinmodSynthLocale;
        if (this.LANGUAGE_INFO[this.getCurrentLanguage()]) {
            speechSynthLocale = this.LANGUAGE_INFO[this.getCurrentLanguage()].penguinmodSynthLocale;
        }
        return speechSynthLocale;
    }

    /**
     * Get an array of the locales supported by this extension.
     * @returns {Array} An array of locale strings.
     */
    _getSupportedLocales () {
        return Object.keys(this.LANGUAGE_INFO).reduce((acc, lang) =>
            acc.concat(this.LANGUAGE_INFO[lang].locales), []);
    }

    /**
     * Check if a Scratch language code is in the list of supported languages for the
     * speech synthesis service.
     * @param {string} languageCode the language code to check.
     * @returns {boolean} true if the language code is supported.
     */
    isSupportedLanguage (languageCode) {
        return this._supportedLocales.includes(languageCode);
    }

    /**
     * Get the menu of voices for the "set voice" block.
     * @return {array} the text and value for each menu item.
     */
    getVoiceMenu () {
        return Object.keys(this.VOICE_INFO).map(voiceId => ({
            text: this.VOICE_INFO[voiceId].name,
            value: voiceId
        }));
    }

    /**
     * Get the localized menu of languages for the "set language" block.
     * For each language:
     *   if there is a custom translated spoken language name, use that;
     *   otherwise use the translation in the languageNames menuMap;
     *   otherwise fall back to the untranslated name in LANGUAGE_INFO.
     * @return {array} the text and value for each menu item.
     */
    getLanguageMenu () {
        const editorLanguage = this.getEditorLanguage();
        // Get the array of localized language names
        const localizedNameMap = {};
        let nameArray = languageNames.menuMap[editorLanguage];
        if (nameArray) {
            // Also get any localized names of spoken languages
            let spokenNameArray = [];
            if (languageNames.spokenLanguages) {
                spokenNameArray = languageNames.spokenLanguages[editorLanguage];
                nameArray = nameArray.concat(spokenNameArray);
            }
            // Create a map of language code to localized name
            // The localized spoken language names have been concatenated onto
            // the end of the name array, so the result of the forEach below is
            // when there is both a written language name (e.g. 'Chinese
            // (simplified)') and a spoken language name (e.g. 'Chinese
            // (Mandarin)', we always use the spoken version.
            nameArray.forEach(lang => {
                localizedNameMap[lang.code] = lang.name;
            });
        }

        return Object.keys(this.LANGUAGE_INFO).map(key => {
            let name = this.LANGUAGE_INFO[key].name;
            const localizedName = localizedNameMap[key];
            if (localizedName) {
                name = localizedName;
            }
            // Uppercase the first character of the name
            name = name.charAt(0).toUpperCase() + name.slice(1);
            return {
                text: name,
                value: key
            };
        });
    }

    /**
     * Set the voice for speech synthesis for this sprite.
     * @param  {object} args Block arguments
     * @param {object} util Utility object provided by the runtime.
     */
    setVoice (args, util) {
        const state = this._getState(util.target);

        let voice = args.VOICE;

        // If the arg is a dropped number, treat it as a voice index
        let voiceNum = parseInt(voice, 10);
        if (!isNaN(voiceNum)) {
            voiceNum -= 1; // Treat dropped args as one-indexed
            voiceNum = MathUtil.wrapClamp(voiceNum, 0, Object.keys(this.VOICE_INFO).length - 1);
            voice = Object.keys(this.VOICE_INFO)[voiceNum];
        }

        // Only set the voice if the arg is a valid voice id.
        if (Object.keys(this.VOICE_INFO).includes(voice)) {
            state.voiceId = voice;
        }
    }

    /**
     * Set the language for speech synthesis.
     * @param {object} args Block arguments
     */
    setLanguage (args) {
        this.setCurrentLanguage(args.LANGUAGE);
    }

    /**
     * Set the reading speed for speech synthesis.
     * @param {object} args Block arguments
     * @param {object} util Utility object provided by the runtime.
     */  
    setSpeed (args, util) {
        const state = this._getState(util.target);
        state.speed = Cast.toNumber(args.SPEED) / 100;
    }

    /**
     * Stop all currently playing speech sounds.
     */
    _stopAllSpeech () {
        this._soundPlayers.forEach(player => {
            player.stop();
        });
    }

    /**
     * Convert the provided text into a sound file and then play the file.
     * @param  {object} args Block arguments
     * @param {object} util Utility object provided by the runtime.
     * @return {Promise} A promise that resolves after playing the sound
     */
    speakAndWait (args, util) {
        // Cast input to string
        let words = Cast.toString(args.WORDS);
        let locale = this._getSpeechSynthLocale();

        const state = this._getState(util.target);

        let gender = this.VOICE_INFO[state.voiceId].gender;
        let playbackRate = this.VOICE_INFO[state.voiceId].playbackRate;

        // Special case for voices where the synthesis service only provides a
        // single gender voice. In that case, always request the female voice,
        // and set special playback rates for the tenor and giant voices.
        if (this.LANGUAGE_INFO[this.getCurrentLanguage()].singleGender) {
            gender = 'female';
            if (state.voiceId === TENOR_ID) {
                playbackRate = FEMALE_TENOR_RATE;
            }
            if (state.voiceId === GIANT_ID) {
                playbackRate = FEMALE_GIANT_RATE;
            }
        }

        if (state.voiceId === KITTEN_ID) {
            words = words.replace(/\S+/g, 'meow');
            locale = this.LANGUAGE_INFO[this.DEFAULT_LANGUAGE].speechSynthLocale;
        }

        let isPenguinMod = false;
        let penguinModVoice = '';
        let speechVolume = SPEECH_VOLUME;
        if (this.PENGUINMOD_VOICES.includes(state.voiceId)) {
            // This is a PenguinMod voice and has to be handled differently.
            isPenguinMod = true;
            locale = this._getPenguinModSynthLocale();
            penguinModVoice = this.PENGUINMOD_VOICE_MAP[state.voiceId];
            speechVolume = this.PENGUINMOD_VOICE_VOLUMES[state.voiceId];
        }

        // Build up URL
        let path = '';
        if (isPenguinMod) {
            path = `${PM_SERVER_HOST}/tts`;
        } else {
            path = `${SERVER_HOST}/synth`;
        }
        if (isPenguinMod) {
            path += `?lang=${locale}`;
            path += `&voice=${penguinModVoice}`;
        } else {
            path += `?locale=${locale}`;
        }
        path += `&gender=${gender}`;

        // This textLimit is enforced on the API. No we cannot increase it.
        const textLimit = isPenguinMod ? 512 : 128;
        path += `&text=${encodeURIComponent(words.substring(0, textLimit))}`;

        if (typeof state.speed === 'number') {
            playbackRate = clampToValidPlaybackRate(playbackRate * state.speed);
        }

        // Perform HTTP request to get audio file
        return fetchWithTimeout(path, {}, SERVER_TIMEOUT)
            .then(res => {
                if (res.status !== 200) {
                    throw new Error(`HTTP ${res.status} error reaching translation service`);
                }

                return res.arrayBuffer();
            })
            .then(buffer => {
                // Play the sound
                const sound = {
                    data: {
                        buffer
                    }
                };
                return this.runtime.audioEngine.decodeSoundPlayer(sound);
            })
            .then(soundPlayer => {
                this._soundPlayers.set(soundPlayer.id, soundPlayer);

                soundPlayer.setPlaybackRate(playbackRate);

                // Increase the volume
                const engine = this.runtime.audioEngine;
                const chain = engine.createEffectChain();
                chain.set('volume', speechVolume);
                soundPlayer.connect(chain);

                soundPlayer.play();
                return new Promise(resolve => {
                    soundPlayer.on('stop', () => {
                        this._soundPlayers.delete(soundPlayer.id);
                        resolve();
                    });
                });
            })
            .catch(err => {
                log.warn(err);
            });
    }
}
module.exports = Scratch3Text2SpeechBlocks;
