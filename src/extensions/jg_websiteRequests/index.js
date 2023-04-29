const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const AHHHHHHHHHHHHHH = require('../../util/array buffer');
const BufferStuff = new AHHHHHHHHHHHHHH();
// const Cast = require('../../util/cast');

/**
 * Class for Website Request blocks
 * @constructor
 */
class JgWebsiteRequestBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'jgWebsiteRequests',
            name: 'Website Requests',
            color1: '#004299',
            color2: '#003478',
            blocks: [
                {
                    opcode: 'encodeTextForURL',
                    text: formatMessage({
                        id: 'jgWebsiteRequests.blocks.encodeTextForURL',
                        default: 'encode [TEXT] for URL',
                        description: 'Encodes text to be usable in a URL.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.text_encode_for_url',
                                default: 'Text here',
                                description: 'The text to encode.'
                            })
                        }
                    }
                },
                {
                    opcode: 'decodeUrlForText',
                    text: formatMessage({
                        id: 'jgWebsiteRequests.blocks.decodeUrlForText',
                        default: 'decode [TEXT] for text',
                        description: 'Decodes text used in query parameters and other areas.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.text_decode_for_url',
                                default: 'Text%20here',
                                description: 'The text to decode.'
                            })
                        }
                    }
                },
                {
                    opcode: 'getWebsiteContent',
                    text: formatMessage({
                        id: 'jgWebsiteRequests.blocks.getWebsiteContent',
                        default: 'get [WEBSITE]\'s content',
                        description: 'Gets the contents of the specified website. Includes HTML if it\'s a normal website.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        WEBSITE: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.website_fetch_content',
                                default: 'https://www.google.com',
                                description: 'The website to get the content of.'
                            })
                        }
                    }
                },
                {
                    opcode: 'getWebsiteBinaryData',
                    text: formatMessage({
                        id: 'jgWebsiteRequests.blocks.getWebsiteBinaryData',
                        default: 'get binary data from [WEBSITE]',
                        description: 'Gets the data of the specified website.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        WEBSITE: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.website_fetch_content',
                                default: 'https://www.google.com',
                                description: 'The website to get the content of.'
                            })
                        }
                    }
                },
                {
                    opcode: 'postWithContentToWebsite',
                    text: formatMessage({
                        id: 'jgWebsiteRequests.blocks.postWithContentToWebsite',
                        default: 'post [CONTENT] as [KEY] to [WEBSITE]',
                        description: 'Posts to a website using a JSON body with the key text set to the content.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        CONTENT: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.website_post_content',
                                default: 'value',
                                description: 'The content of the key to post.'
                            })
                        },
                        KEY: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.website_post_key',
                                default: 'key',
                                description: 'The key in the request body to post.'
                            })
                        },
                        WEBSITE: {
                            type: ArgumentType.STRING,
                            defaultValue: formatMessage({
                                id: 'jgWebsiteRequests.website_post_website',
                                default: 'https://httpbin.org/post',
                                description: 'The website to post the key and content to.'
                            })
                        }
                    }
                }
            ]
        };
    }
    encodeTextForURL (args) {
        return encodeURIComponent(String(args.TEXT));
    }
    decodeUrlForText (args) {
        return decodeURI(String(args.TEXT));
    }

    getWebsiteContent (args) {
        return new Promise(resolve => {
            if (window && !window.fetch) return resolve("");
            const fetchingUrl = args.WEBSITE.replace("rawRequest()", "");
            fetch(fetchingUrl, {cache: "no-cache"}).then(r => {
                r.text().then(text => {
                    resolve(text.toString());
                })
                    .catch(() => {
                        resolve("");
                    });
            })
                .catch(() => {
                    resolve("");
                });
        });
    }
    
    getWebsiteBinaryData (args) {
        return new Promise(resolve => {
            if (window && !window.fetch) return resolve("[]");
            const fetchingUrl = args.WEBSITE.replace("rawRequest()", "");
            fetch(fetchingUrl, {cache: "no-cache"}).then(r => {
                r.arrayBuffer().then(buffer => {
                    resolve(String(JSON.stringify(BufferStuff.bufferToArray(buffer))));
                })
                    .catch(() => {
                        resolve("[]");
                    });
            })
                .catch(() => {
                    resolve("[]");
                });
        });
    }

    postWithContentToWebsite (args) {
        return new Promise(resolve => {
            if (window && !window.fetch) return resolve("");
            const body = {};
            const checking = String(args.CONTENT);
            let canJSONParse = true;
            try {
                JSON.parse(checking);
            } catch {
                canJSONParse = false;
            }
            body[String(args.KEY)] = checking === "true" ? true :
                checking === "false" ? false :
                    Number(checking) ? Number(checking) :
                        checking === "null" ? null :
                            canJSONParse ? JSON.parse(checking) :
                                checking;
            fetch(args.WEBSITE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-cache",
                body: JSON.stringify(body)
            }).then(r => {
                r.text().then(text => {
                    resolve(String(text));
                })
                    .catch(() => {
                        resolve("");
                    });
            })
                .catch(() => {
                    resolve("");
                });
        });
    }
}

module.exports = JgWebsiteRequestBlocks;
