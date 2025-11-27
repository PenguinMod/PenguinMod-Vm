// If a project uses an extension but does not specify a URL, it will default to
// the URLs given here, if it exists. This is useful for compatibility with other mods.

let defaults = {
    // Box2D (`griffpatch`) is not listed here because our extension is not actually
    // compatible with the original version due to fields vs inputs.

    // Scratch Lab Animated Text - https://lab.scratch.mit.edu/text/
    // text: 'https://extensions.turbowarp.org/lab/text.js',

    // Turboloader's AudioStream
    audiostr: 'https://extensions.turbowarp.org/turboloader/audiostream.js',

    // https://scratch.mit.edu/discuss/topic/842592/
    faceSensing: 'https://extensions.turbowarp.org/lab/face-sensing.js'
};

module.exports = defaults;