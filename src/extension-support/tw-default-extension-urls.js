// If a project uses an extension but does not specify a URL, it will default to
// the URLs given here, if it exists. This is useful for compatibility with other mods.

const defaults = {
    // Box2D (`griffpatch`) is not listed here because our extension is not actually
    // compatible with the original version due to fields vs inputs.

    // Scratch Lab Animated Text - https://lab.scratch.mit.edu/text/
    text: 'https://extensions.turbowarp.org/lab/text.js',

    // Turboloader's AudioStream
    audiostr: 'https://extensions.turbowarp.org/turboloader/audiostream.js',

    // Face Sensing - https://lab.scratch.mit.edu/face/ - https://scratch.mit.edu/discuss/topic/842592/
    faceSensing: 'https://extensions.turbowarp.org/lab/face-sensing.js',

    // Video Sprites - https://lab.scratch.mit.edu/videosprites/
    videoSprites: 'https://extensions.turbowarp.org/lab/video-sprites.js',

    // pm pre-port unmodified extensions
    xeltallivclipblend: 'https://extensions.turbowarp.org/Xeltalliv/clippingblending.js'
};

module.exports = defaults;
