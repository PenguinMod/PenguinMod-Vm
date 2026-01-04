const ArgumentType = require('../extension-support/argument-type');
const BlockType = require('../extension-support/block-type');
const TargetType = require('../extension-support/target-type');
const Cast = require('./cast');
const Clone = require('./clone');
const Color = require('./color');

/**
 * Parse a URL object or return null.
 * @param {string} url The url to parse
 * @returns {URL|null} The parsed url
 */
const parseURL = url => {
    try {
        return new URL(url, location.href);
    } catch (e) {
        return null;
    }
};

class CustomExtensionApi {
    constructor (followLimitations) {
        this.limited = followLimitations === true;
    }

    get ArgumentType () {
        return ArgumentType;
    }
    get BlockType () {
        return BlockType;
    }
    get TargetType () {
        return TargetType;
    }
    get Cast () {
        return Cast;
    }
    get Clone () {
        return Clone;
    }
    get Color () {
        return Color;
    }
    
    get vm () {
        return vm;
    }
    get renderer () {
        return CustomExtensionApi.vm.runtime.renderer;
    }
    
    async canFetch (url) {
        if (this.limited) {
            const parsed = parseURL(url);
            if (!parsed) {
                return false;
            }
            // Always allow protocols that don't involve a remote request.
            if (parsed.protocol === 'blob:' || parsed.protocol === 'data:') {
                return true;
            }
            return true;
        }
        return true;
    }
    async canOpenWindow (url) {
        if (this.limited) {
            const parsed = parseURL(url);
            if (!parsed) {
                return false;
            }
            // Always reject protocols that would allow code execution.
            // eslint-disable-next-line no-script-url
            if (parsed.protocol === 'javascript:') {
                return false;
            }
            return true;
        }
        return true;
    }
    async canRedirect (url) {
        if (this.limited) {
            const parsed = parseURL(url);
            if (!parsed) {
                return false;
            }
            // Always reject protocols that would allow code execution.
            // eslint-disable-next-line no-script-url
            if (parsed.protocol === 'javascript:') {
                return false;
            }
            return true;
        }
        return true;
    }

    async fetch (url, options) {
        if (this.limited) {
            const actualURL = url instanceof Request ? url.url : url;
            if (!await global.Scratch.canFetch(actualURL)) {
                throw new Error(`Permission to fetch ${actualURL} rejected.`);
            }
            return fetch(url, {
                ...options,
                redirect: 'error'
            });
        }
        return fetch(url, {
            ...options,
            redirect: 'error'
        });
    }
    async openWindow (url, features) {
        if (this.limited) {
            if (!await global.Scratch.canOpenWindow(url)) {
                throw new Error(`Permission to open tab ${url} rejected.`);
            }
            return window.open(url, '_blank', features);
        }
        return window.open(url, '_blank', features);
    }
    async redirect (url) {
        if (this.limited) {
            if (!await global.Scratch.canRedirect(url)) {
                throw new Error(`Permission to redirect to ${url} rejected.`);
            }
            location.href = url;
            return;
        }
        location.href = url;
    }

    get extensions () {
        return {
            unsandboxed: true,
            register: () => {
                throw new Error("Register cannot be replicated in custom-ext-api-to-core");
            }
        };
    }
};

module.exports = CustomExtensionApi;
