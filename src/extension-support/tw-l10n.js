const formatMessage = require('format-message');

/**
 * @param {VM|null} vm A virtual machine, used only to determin the locale
 * @returns {object} A translation handle
 */
const createTranslate = vm => {
    const namespace = formatMessage.namespace();

    const translate = (message, args) => {
        if (message && typeof message === 'object') {
            // already in the expected format
        } else if (typeof message === 'string') {
            message = {
                default: message
            };
        } else {
            throw new Error('unsupported data type in translate()');
        }
        return namespace(message, args);
    };

    const generateId = defaultMessage => `_${defaultMessage}`;

    const getLocale = () => {
        if (vm) return vm.getLocale();
        if (typeof navigator !== 'undefined') return navigator.language;
        return 'en';
    };

    let storedTranslations = {};
    translate.setup = newTranslations => {
        if (newTranslations) {
            storedTranslations = newTranslations;
        }
        namespace.setup({
            locale: getLocale(),
            missingTranslation: 'ignore',
            generateId,
            translations: storedTranslations
        });
    };

    Object.defineProperty(translate, 'language', {
        configurable: true,
        enumerable: true,
        get: () => getLocale()
    });

    translate.setup({});

    if (vm) {
        vm.on('LOCALE_CHANGED', () => {
            translate.setup(null);
        });
    }

    return translate;
};

module.exports = createTranslate;