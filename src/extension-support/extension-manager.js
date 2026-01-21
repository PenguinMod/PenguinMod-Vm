const dispatch = require('../dispatch/central-dispatch');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');

const BlockType = require('./block-type');
const SecurityManager = require('./tw-security-manager');
const Cast = require('../util/cast');

const AddonSwitches = require('./extension-addon-switchers');

const urlParams = new URLSearchParams(location.search);

const IsLocal = String(window.location.href).startsWith(`http://localhost:`);
const IsLiveTests = urlParams.has('livetests');

// thhank yoh random stack droverflwo person
async function sha256(source) {
    const sourceBytes = new TextEncoder().encode(source);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join("");
}

// These extensions are currently built into the VM repository but should not be loaded at startup.
// TODO: move these out into a separate repository?
// TODO: change extension spec so that library info, including extension ID, can be collected through static methods

const defaultBuiltinExtensions = {
    // This is an example that isn't loaded with the other core blocks,
    // but serves as a reference for loading core blocks as extensions.
    coreExample: () => require('../blocks/scratch3_core_example'),
    // These are the non-core built-in extensions.
    pen: () => require('../extensions/scratch3_pen'),
    wedo2: () => require('../extensions/scratch3_wedo2'),
    music: () => require('../extensions/scratch3_music'),
    microbit: () => require('../extensions/scratch3_microbit'),
    text2speech: () => require('../extensions/scratch3_text2speech'),
    translate: () => require('../extensions/scratch3_translate'),
    videoSensing: () => require('../extensions/scratch3_video_sensing'),
    ev3: () => require('../extensions/scratch3_ev3'),
    makeymakey: () => require('../extensions/scratch3_makeymakey'),
    boost: () => require('../extensions/scratch3_boost'),
    gdxfor: () => require('../extensions/scratch3_gdx_for'),
    text: () => require('../extensions/scratchLab_animatedText'),

    // garbomuffin: *silence*
    // tw: core extension
    tw: () => require('../extensions/tw'),
    // twFiles: replaces jgFiles as it works better on other devices
    twFiles: () => require('../extensions/tw_files'),

    // pm: category expansions & seperations go here
    // pmMotionExpansion: extra motion blocks that were in the category & new ones that werent
    pmMotionExpansion: () => require("../extensions/pm_motionExpansion"),
    // pmOperatorsExpansion: extra operators that were in the category & new ones that werent
    pmOperatorsExpansion: () => require("../extensions/pm_operatorsExpansion"),
    // pmSensingExpansion: extra sensing blocks that were in the category & new ones that werent
    pmSensingExpansion: () => require("../extensions/pm_sensingExpansion"),
    // pmControlsExpansion: extra control blocks that were in the category & new ones that werent
    pmControlsExpansion: () => require("../extensions/pm_controlsExpansion"),
    // pmEventsExpansion: extra event blocks that were in the category & new ones that werent
    pmEventsExpansion: () => require("../extensions/pm_eventsExpansion"),

    // pmInlineBlocks: seperates the inline function block to prevent confusled
    pmInlineBlocks: () => require("../extensions/pm_inlineblocks"),

    // jg: jeremyes esxsitenisonsnsn
    // jgFiles: support for reading user files
    jgFiles: () => require('../extensions/jg_files'),
    // jgWebsiteRequests: fetch GET and POST requests to apis & websites
    jgWebsiteRequests: () => require("../extensions/jg_websiteRequests"),
    // jgJSON: handle JSON objects
    jgJSON: () => require("../extensions/jg_json"),
    // jgJSONParsed: handle JSON objects BETTER
    // jgJSONParsed: () => require("../extensions/jg_jsonParsed"),
    // jgRuntime: edit stage and other stuff
    jgRuntime: () => require("../extensions/jg_runtime"),
    // jgPrism: blocks for specific use cases or major convenience
    jgPrism: () => require("../extensions/jg_prism"),
    // jgIframe: my last call for help (for legal reasons this is a joke)
    jgIframe: () => require("../extensions/jg_iframe"),
    // jgExtendedAudio: ok this is my real last call for help (for legal reasons this is a joj)
    jgExtendedAudio: () => require("../extensions/jg_audio"),
    // jgScratchAuthenticate: easy to add its one block lol!
    jgScratchAuthenticate: () => require("../extensions/jg_scratchAuth"),
    // JgPermissionBlocks: someones gonna get mad at me for this one i bet
    JgPermissionBlocks: () => require("../extensions/jg_permissions"),
    // jgClones: funny clone manager
    jgClones: () => require("../extensions/jg_clones"),
    // jgTween: epic animation
    jgTween: () => require("../extensions/jg_tween"),
    // jgDebugging: epic animation
    jgDebugging: () => require("../extensions/jg_debugging"),
    // jgEasySave: easy save stuff
    jgEasySave: () => require("../extensions/jg_easySave"),
    // jgPackagerApplications: uuhhhhhhh packager
    jgPackagerApplications: () => require("../extensions/jg_packagerApplications"),
    // jgTailgating: follow sprites like in an RPG
    jgTailgating: () => require("../extensions/jg_tailgating"),
    // jgScripts: what you know about rollin down in the
    jgScripts: () => require("../extensions/jg_scripts"),
    // jg3d: damn daniel
    jg3d: () => require("../extensions/jg_3d"),
    // jg3dVr: epic
    jg3dVr: () => require("../extensions/jg_3dVr"),
    // jgVr: excuse to use vr headset lol!
    jgVr: () => require("../extensions/jg_vr"),
    // jgInterfaces: easier UI
    jgInterfaces: () => require("../extensions/jg_interfaces"),
    // jgCostumeDrawing: draw on costumes
    // hiding so fir doesnt touch
    // jgCostumeDrawing: () => require("../extensions/jg_costumeDrawing"),
    // jgJavascript: this is like the 3rd time we have implemented JS blocks man
    jgJavascript: () => require("../extensions/jg_javascript"),
    // jgPathfinding: EZ pathfinding for beginners :D hopefully
    jgPathfinding: () => require("../extensions/jg_pathfinding"),
    // jgAnimation: animate idk
    jgAnimation: () => require("../extensions/jg_animation"),

    // jgStorage: event extension requested by Fir & silvxrcat
    jgStorage: () => require("../extensions/jg_storage"),
    // jgTimers: event extension requested by Arrow
    jgTimers: () => require("../extensions/jg_timers"),
    // jgAdvancedText: event extension requested by silvxrcat
    // hiding so fir doesnt touch
    // jgAdvancedText: () => require("../extensions/jg_advancedText"),

    // jgDev: test extension used for making core blocks
    jgDev: () => require("../extensions/jg_dev"),
    // jgDooDoo: test extension used for making test extensions
    jgDooDoo: () => require("../extensions/jg_doodoo"),
    // jgBestExtension: great extension used for making great extensions
    jgBestExtension: () => require("../extensions/jg_bestextensioin"),
    // jgChristmas: Christmas extension used for making Christmas extensions
    jgChristmas: () => require("../extensions/jg_christmas"),

    // jw: hello it is i jwklong
    // jwUnite: literal features that should of been added in the first place
    jwUnite: () => require("../extensions/jw_unite"),
    // jwProto: placeholders, labels, defenitons, we got em
    jwProto: () => require("../extensions/jw_proto"),
    // jwPostLit: postlit real????
    jwPostLit: () => require("../extensions/jw_postlit"),
    // jwReflex: vector positioning (UNRELEASED, DO NOT ADD TO GUI)
    jwReflex: () => require("../extensions/jw_reflex"),
    // Blockly 2: a faithful recreation of the original blockly blocks
    blockly2math: () => require("../extensions/blockly-2/math.js"),
    // jwXml: hi im back haha have funny xml
    jwXml: () => require("../extensions/jw_xml"),
    // vector type blah blah blah
    jwVector: () => require("../extensions/jwVector"),
    // my own array system yipee
    jwArray: () => require("../extensions/jwArray"),
    // mid extension but i need it
    jwTargets: () => require("../extensions/jwTargets"),
    // cool new physics extension
    jwPsychic: () => require("../extensions/jwPsychic"),
    // test ext for lambda functions or something
    jwLambda: () => require("../extensions/jwLambda"),
    // omega num port for penguinmod
    jwNum: () => require("../extensions/jwNum"),
    // good color utilties
    jwColor: () => require("../extensions/jwColor"),
    // access to extraFiles
    jwStorage: () => require("../extensions/jwStorage"),
    // date type
    jwDate: () => require("../extensions/jwDate"),
    // scoped variables
    jwScope: () => require("../extensions/jwScope"),
    // NEW xml extension
    jwXML: () => require("../extensions/jwXML"),
    // pointers
    jwPointer: () => require("../extensions/jwPointer"),
    // integers
    jwInt: () => require("../extensions/jwInt"),

    // jw: They'll think its made by jwklong >:)
    // (but it's not (yet (maybe (probably not (but its made by ianyourgod)))))
    // this is the real jwklong speaking, one word shall be said about this: A N G E R Y
    // Structs: hehe structs for oop (look at c)
    jwStructs: () => require("../extensions/jw_structs"),
    // mikedev: ghytfhygfvbl
    // cl: () => require("../extensions/cl"),
    Gamepad: () => require("../extensions/GamepadExtension"),

    // theshovel: ...
    // theshovelcanvaseffects: ...
    theshovelcanvaseffects: () => require("../extensions/theshovel_canvasEffects"),
    // shovellzcompresss: ...
    shovellzcompresss: () => require("../extensions/theshovel_lzString"),
    // shovelColorPicker: ...
    shovelColorPicker: () => require("../extensions/theshovel_colorPicker"),
    // shovelcss: ...
    shovelcss: () => require("../extensions/theshovel_customStyles"),
    // profanityAPI: ...
    profanityAPI: () => require("../extensions/theshovel_profanity"),

    // gsa: fill out your introduction stupet!!!
    // no >:(
    // canvas: kinda obvius if you know anything about html canvases
    canvas: () => require('../extensions/gsa_canvas_old'),
    // the replacment for the above extension
    newCanvas: () => require('../extensions/gsa_canvas'),
    // tempVars: fill out your introduction stupet!!!
    tempVars: () => require('../extensions/gsa_tempVars'),
    // colors: fill out your introduction stupet!!!
    colors: () => require('../extensions/gsa_colorUtilBlocks'),
    // Camera: camera
    pmCamera: () => require('../extensions/pm_camera'),

    // sharkpool: insert sharkpools epic introduction here
    // sharkpoolPrinting: ...
    sharkpoolPrinting: () => require("../extensions/sharkpool_printing"),
    SPjavascriptV2: () => require("../extensions/sp_javascriptV2"),

    // silvxrcat: ...
    // oddMessage: ...
    oddMessage: () => require("../extensions/silvxrcat_oddmessages"),

    // TW extensions

    // lms: ...
    // lmsutilsblocks: ...
    lmsutilsblocks: () => require('../extensions/lmsutilsblocks'),
    lmsTempVars2: () => require('../extensions/lily_tempVars2'),

    // xeltalliv: ...
    // xeltallivclipblend: ...
    xeltallivclipblend: () => require('../extensions/xeltalliv_clippingblending'),

    // DT: ...
    // DTcameracontrols: ...
    DTcameracontrols: () => require('../extensions/dt_cameracontrols'),

    // griffpatch: ...
    // griffpatch: () => require('../extensions/griffpatch_box2d')

    // iyg: erm a crep, erm a werdohhhh
    // iygPerlin:
    iygPerlin: () => require('../extensions/iyg_perlin_noise'),
    // fr: waw 3d physics!!
    // fr3d:
    fr3d: () => require('../extensions/fr_3d')
};
const CORE_EXTENSIONS = [
    'argument',
    'colour',
    'control',
    'data',
    'event',
    'looks',
    'math',
    'motion',
    'operator',
    'procedures',
    'sensing',
    'sound'
];

const coreExtensionList = Object.getOwnPropertyNames(defaultBuiltinExtensions);

const preload = [];

if (IsLocal || IsLiveTests) {
    preload.push("jgDev");
}

/**
 * @typedef {object} ArgumentInfo - Information about an extension block argument
 * @property {ArgumentType} type - the type of value this argument can take
 * @property {*|undefined} default - the default value of this argument (default: blank)
 */

/**
 * @typedef {object} ConvertedBlockInfo - Raw extension block data paired with processed data ready for scratch-blocks
 * @property {ExtensionBlockMetadata} info - the raw block info
 * @property {object} json - the scratch-blocks JSON definition for this block
 * @property {string} xml - the scratch-blocks XML definition for this block
 */

/**
 * @typedef {object} CategoryInfo - Information about a block category
 * @property {string} id - the unique ID of this category
 * @property {string} name - the human-readable name of this category
 * @property {string|undefined} blockIconURI - optional URI for the block icon image
 * @property {string} color1 - the primary color for this category, in '#rrggbb' format
 * @property {string} color2 - the secondary color for this category, in '#rrggbb' format
 * @property {string} color3 - the tertiary color for this category, in '#rrggbb' format
 * @property {Array.<ConvertedBlockInfo>} blocks - the blocks, separators, etc. in this category
 * @property {Array.<object>} menus - the menus provided by this category
 */

/**
 * @typedef {object} PendingExtensionWorker - Information about an extension worker still initializing
 * @property {string} extensionURL - the URL of the extension to be loaded by this worker
 * @property {Function} resolve - function to call on successful worker startup
 * @property {Function} reject - function to call on failed worker startup
 */

const createExtensionService = extensionManager => {
    const service = {};
    service.registerExtensionServiceSync = extensionManager.registerExtensionServiceSync.bind(extensionManager);
    service.allocateWorker = extensionManager.allocateWorker.bind(extensionManager);
    service.onWorkerInit = extensionManager.onWorkerInit.bind(extensionManager);
    service.registerExtensionService = extensionManager.registerExtensionService.bind(extensionManager);
    return service;
};

class ExtensionManager {
    constructor(vm) {
        /**
         * The ID number to provide to the next extension worker.
         * @type {int}
         */
        this.nextExtensionWorker = 0;

        /**
         * FIFO queue of extensions which have been requested but not yet loaded in a worker,
         * along with promise resolution functions to call once the worker is ready or failed.
         *
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingExtensions = [];

        /**
         * Map of worker ID to workers which have been allocated but have not yet finished initialization.
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingWorkers = [];

        /**
         * Map of worker ID to the URL where it was loaded from.
         * @type {Array<string>}
         */
        this.workerURLs = [];

        /**
         * Map of loaded extension URLs/IDs to service names.
         * @type {Map.<string, string>}
         * @private
         */
        this._loadedExtensions = new Map();

        /**
         * Responsible for determining security policies related to custom extensions.
         */
        this.securityManager = new SecurityManager();

        /**
         * @type {VirtualMachine}
         */
        this.vm = vm;

        /**
         * Keep a reference to the runtime so we can construct internal extension objects.
         * TODO: remove this in favor of extensions accessing the runtime as a service.
         * @type {Runtime}
         */
        this.runtime = vm.runtime;

        this.loadingAsyncExtensions = 0;
        this.asyncExtensionsLoadedCallbacks = [];

        this.builtinExtensions = Object.assign({}, defaultBuiltinExtensions);

        dispatch.setService('extensions', createExtensionService(this)).catch(e => {
            log.error(`ExtensionManager was unable to register extension service: ${JSON.stringify(e)}`);
        });

        preload.forEach(value => {
            this.loadExtensionURL(value);
        });

        this.extUrlCodes = {};
        // extensions that the user has stated (when they where loaded) that they do not wnat updated
        this.keepOlder = [];
        // map of all new shas so we know when a new code update has happened and so ask the user about it
        this.extensionHashes = {};
    }

    getCoreExtensionList() {
        return coreExtensionList;
    }
    getBuiltInExtensionsList() {
        return this.builtinExtensions;
    }

    getAddonBlockSwitches() {
        return AddonSwitches(this.vm);
    }

    /**
     * Check whether an extension is registered or is in the process of loading. This is intended to control loading or
     * adding extensions so it may return `true` before the extension is ready to be used. Use the promise returned by
     * `loadExtensionURL` if you need to wait until the extension is truly ready.
     * @param {string} extensionID - the ID of the extension.
     * @returns {boolean} - true if loaded, false otherwise.
     */
    isExtensionLoaded(extensionID) {
        return this._loadedExtensions.has(extensionID);
    }

    /**
     * Determine whether an extension with a given ID is built in to the VM, such as pen.
     * Note that "core extensions" like motion will return false here.
     * @param {string} extensionId The extension id to check
     * @returns {boolean} If the extension id is internal
     */
    isBuiltinExtension(extensionId) {
        return Object.prototype.hasOwnProperty.call(this.builtinExtensions, extensionId);
    }

    /**
     * Synchronously load an internal extension (core or non-core) by ID. This call will
     * fail if the provided id is not does not match an internal extension.
     * @param {string} extensionId - the ID of an internal extension
     */
    loadExtensionIdSync(extensionId) {
        if (!this.isBuiltinExtension(extensionId)) {
            log.warn(`Could not find extension ${extensionId} in the built in extensions.`);
            return;
        }

        /** @TODO dupe handling for non-builtin extensions. See commit 670e51d33580e8a2e852b3b038bb3afc282f81b9 */
        if (this.isExtensionLoaded(extensionId)) {
            const message = `Rejecting attempt to load a second extension with ID ${extensionId}`;
            log.warn(message);
            return;
        }

        const extension = this.builtinExtensions[extensionId]();
        const extensionInstance = new extension(this.runtime);
        const serviceName = this._registerInternalExtension(extensionInstance);
        // devs are stupid so uh
        // get the ACTUAL id of the ext so that saving/loading doesnt error
        const realId = extensionInstance.getInfo().id;
        this._loadedExtensions.set(extensionId, serviceName);
        this.runtime.compilerRegisterExtension(realId, extensionInstance);
    }

    addBuiltinExtension (extensionId, extensionClass) {
        this.builtinExtensions[extensionId] = () => extensionClass;
    }

    _isValidExtensionURL(extensionURL) {
        try {
            const parsedURL = new URL(extensionURL);
            return (
                parsedURL.protocol === 'https:' ||
                parsedURL.protocol === 'http:' ||
                parsedURL.protocol === 'data:' ||
                parsedURL.protocol === 'file:'
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * Load an extension by URL or internal extension ID
     * @param {string} extensionURL - the URL for the extension to load OR the ID of an internal extension
     * @param {string|null} oldHash - included when loading, contains the known hash that is from the loaded file so it can be compared with the one gotten over the url
     * @returns {Promise} resolved once the extension is loaded and initialized or rejected on failure
     */
    async loadExtensionURL(extensionURL, oldHash = '') {
        if (this.isBuiltinExtension(extensionURL)) {
            this.loadExtensionIdSync(extensionURL);
            return [extensionURL];
        }

        if (this.isExtensionURLLoaded(extensionURL)) {
            // Extension is already loaded.
            return [];
        }

        if (!this._isValidExtensionURL(extensionURL)) {
            throw new Error(`Invalid extension URL: ${extensionURL}`);
        }

        if (extensionURL.includes("penguinmod.site")) {
            alert("Extensions using penguinmod.site are deprecated, please swap them over to use penguinmod.com instead.")
        }
        const normalURL = extensionURL.replace("penguinmod.site", "penguinmod.com");

        this.runtime.setExternalCommunicationMethod('customExtensions', true);

        this.loadingAsyncExtensions++;

        const sandboxMode = await this.securityManager.getSandboxMode(normalURL);
        const rewritten = await this.securityManager.rewriteExtensionURL(normalURL);
        const blob = (await fetch(rewritten).then(req => req.blob()))
        const blobUrl = URL.createObjectURL(blob)
        const newHash = await new Promise(resolve => {
            const reader = new FileReader()
            reader.onload = async ({ target: { result } }) => {
                console.log(result)
                this.extUrlCodes[extensionURL] = result
                resolve(await sha256(result))
            }
            reader.onerror = err => {
                console.error('couldnt read the contents of url', url, err)
            }
            reader.readAsText(blob)
        })
        this.extensionHashes[extensionURL] = newHash
        if (oldHash && oldHash !== newHash && this.securityManager.shouldUseLocal(extensionURL)) return Promise.reject('useLocal')

        if (sandboxMode === 'unsandboxed') {
            const { load } = require('./tw-unsandboxed-extension-runner');
            const extensionObjects = await load(blobUrl, this.vm)
                .catch(error => this._failedLoadingExtensionScript(error));
            const fakeWorkerId = this.nextExtensionWorker++;
            const returnedIDs = [];
            this.workerURLs[fakeWorkerId] = normalURL;

            for (const extensionObject of extensionObjects) {
                const extensionInfo = extensionObject.getInfo();
                const serviceName = `unsandboxed.${fakeWorkerId}.${extensionInfo.id}`;
                dispatch.setServiceSync(serviceName, extensionObject);
                dispatch.callSync('extensions', 'registerExtensionServiceSync', serviceName);
                this._loadedExtensions.set(extensionInfo.id, serviceName);
                returnedIDs.push(extensionInfo.id);
                this.runtime.compilerRegisterExtension(extensionInfo.id, extensionObject);
            }

            this._finishedLoadingExtensionScript();
            return returnedIDs;
        }

        /* eslint-disable max-len */
        let ExtensionWorker;
        if (sandboxMode === 'worker') {
            ExtensionWorker = require('worker-loader?name=js/extension-worker/extension-worker.[hash].js!./extension-worker');
        } else if (sandboxMode === 'iframe') {
            ExtensionWorker = (await import(/* webpackChunkName: "iframe-extension-worker" */ './tw-iframe-extension-worker')).default;
        } else {
            throw new Error(`Invalid sandbox mode: ${sandboxMode}`);
        }
        /* eslint-enable max-len */

        return new Promise((resolve, reject) => {
            this.pendingExtensions.push({ extensionURL: rewritten, resolve, reject });
            dispatch.addWorker(new ExtensionWorker());
        }).catch(error => this._failedLoadingExtensionScript(error));
    }

    /**
     * Wait until all async extensions have loaded
     * @returns {Promise} resolved when all async extensions have loaded
     */
    allAsyncExtensionsLoaded() {
        if (this.loadingAsyncExtensions === 0) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.asyncExtensionsLoadedCallbacks.push({
                resolve,
                reject
            });
        });
    }

    /**
     * Regenerate blockinfo for all (or one) loaded dynamic extensions
     * @param {string} [extension] optional extension id
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshDynamicCategorys(extension) {
        const refresh_service = service =>
            dispatch.call(service, 'getInfo')
                .then(info => {
                    info = this._prepareExtensionInfo(service, info);
                    if (!info.isDynamic) return;
                    dispatch.call('runtime', '_refreshExtensionPrimitives', info);
                })
                .catch(e => {
                    log.error(`Failed to refresh built-in extension primitives: ${e}`);
                })

        if (!this._loadedExtensions) return Promise.reject('_loadedExtensions is not readable yet');
        if (!extension) {
            const all_services = Array.from(this._loadedExtensions.values()).map(refresh_service);
            return Promise.all(all_services);
        }
        if (!this._loadedExtensions.has(extension)) {
            return Promise.reject(new Error(`Unknown extension: ${extension}`));
        }

        return refresh_service(this._loadedExtensions.get(extension));
    }

    /**
     * Regenerate blockinfo for all (or one) loaded extensions
     * @param {string} [extension] optional extension id
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshBlocks(extension) {
        const refresh_service = service =>
            dispatch.call(service, 'getInfo')
                .then(info => {
                    info = this._prepareExtensionInfo(service, info);
                    dispatch.call('runtime', '_refreshExtensionPrimitives', info);
                })
                .catch(e => {
                    log.error(`Failed to refresh built-in extension primitives: ${e}`);
                });

        if (!extension) {
            const all_services = Array.from(this._loadedExtensions.values()).map(refresh_service);
            return Promise.all(all_services);
        }
        if (!this._loadedExtensions.has(extension)) {
            return Promise.reject(new Error(`Unknown extension: ${extension}`));
        }

        return refresh_service(this._loadedExtensions.get(extension));
    }

    prepareSwap(id) {
        const serviceName = this._loadedExtensions.get(id);
        const { provider, isRemote } = dispatch._getServiceProvider(serviceName);
        if (isRemote || typeof provider.dispose === 'function') 
            dispatch.call(serviceName, 'dispose');
        delete dispatch.services[serviceName];
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
        const workerId = +serviceName.split('.')[1];
        delete this.workerURLs[workerId];
    }
    removeExtension(id) {
        const serviceName = this._loadedExtensions.get(id);
        const { provider, isRemote } = dispatch._getServiceProvider(serviceName);
        if (isRemote || typeof provider.dispose === 'function') 
            dispatch.call(serviceName, 'dispose');
        delete dispatch.services[serviceName];
        delete this.runtime[`ext_${id}`];

        this._loadedExtensions.delete(id);
        const workerId = +serviceName.split('.')[1];
        delete this.workerURLs[workerId];
        dispatch.call('runtime', '_removeExtensionPrimitive', id);
        this.refreshBlocks();
    }
    getExtensionIdFromOpcode(opcode) {
        // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
        if (!(typeof opcode === 'string')) {
            console.error('invalid opcode ' + opcode);
            return '';
        }
        const index = opcode.indexOf('_');
        const forbiddenSymbols = /[^\w-]/g;
        const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
        if (CORE_EXTENSIONS.indexOf(prefix) === -1) {
            if (prefix !== '') return prefix;
        }
    }
    findUsedExtensions() {
        const results = [];
        for (const target of this.runtime.targets) {
            for (const blockId in target.blocks._blocks) {
                const block = target.blocks.getBlock(blockId);
                const ext = this.getExtensionIdFromOpcode(block.opcode);
                results.push(ext);
            }
        }
        return results;
    }
    removeUnusedExtensions() {
        const all = [...this._loadedExtensions.keys()];
        const used = this.findUsedExtensions();
        const unused = all.filter(ext => !used.includes(ext));
        for (const toRemove of unused)
            this.removeExtension(toRemove);
    }

    allocateWorker() {
        const id = this.nextExtensionWorker++;
        const workerInfo = this.pendingExtensions.shift();
        this.pendingWorkers[id] = workerInfo;
        this.workerURLs[id] = workerInfo.extensionURL;
        return [id, workerInfo.extensionURL];
    }

    /**
     * Synchronously collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionServiceSync(serviceName) {
        const info = dispatch.callSync(serviceName, 'getInfo');
        this._registerExtensionInfo(serviceName, info);
    }

    /**
     * Collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionService(serviceName) {
        dispatch.call(serviceName, 'getInfo').then(info => {
            this._loadedExtensions.set(info.id, serviceName);
            this._registerExtensionInfo(serviceName, info);
            this._finishedLoadingExtensionScript();
        });
    }

    _finishedLoadingExtensionScript() {
        this.loadingAsyncExtensions--;
        if (this.loadingAsyncExtensions === 0) {
            this.asyncExtensionsLoadedCallbacks.forEach(i => i.resolve());
            this.asyncExtensionsLoadedCallbacks = [];
        }
    }

    _failedLoadingExtensionScript(error) {
        // Don't set the current extension counter to 0, otherwise it will go negative if another
        // extension finishes or fails to load.
        this.loadingAsyncExtensions--;
        this.asyncExtensionsLoadedCallbacks.forEach(i => i.reject(error));
        this.asyncExtensionsLoadedCallbacks = [];
        // Re-throw error so the promise still rejects.
        throw error;
    }

    /**
     * Called by an extension worker to indicate that the worker has finished initialization.
     * @param {int} id - the worker ID.
     * @param {*?} e - the error encountered during initialization, if any.
     */
    onWorkerInit(id, e) {
        const workerInfo = this.pendingWorkers[id];
        delete this.pendingWorkers[id];
        if (e) {
            workerInfo.reject(e);
        } else {
            workerInfo.resolve();
        }
    }

    /**
     * Register an internal (non-Worker) extension object
     * @param {object} extensionObject - the extension object to register
     * @returns {string} The name of the registered extension service
     */
    _registerInternalExtension(extensionObject) {
        const extensionInfo = extensionObject.getInfo();
        const fakeWorkerId = this.nextExtensionWorker++;
        const serviceName = `extension_${fakeWorkerId}_${extensionInfo.id}`;
        dispatch.setServiceSync(serviceName, extensionObject);
        dispatch.callSync('extensions', 'registerExtensionServiceSync', serviceName);
        return serviceName;
    }

    /**
     * Sanitize extension info then register its primitives with the VM.
     * @param {string} serviceName - the name of the service hosting the extension
     * @param {ExtensionInfo} extensionInfo - the extension's metadata
     * @private
     */
    _registerExtensionInfo(serviceName, extensionInfo) {
        extensionInfo = this._prepareExtensionInfo(serviceName, extensionInfo);
        dispatch.call('runtime', '_registerExtensionPrimitives', extensionInfo).catch(e => {
            log.error(`Failed to register primitives for extension on service ${serviceName}:`, e);
        });
    }

    /**
     * Apply minor cleanup and defaults for optional extension fields.
     * TODO: make the ID unique in cases where two copies of the same extension are loaded.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionInfo} extensionInfo - the extension info to be sanitized
     * @returns {ExtensionInfo} - a new extension info object with cleaned-up values
     * @private
     */
    _prepareExtensionInfo(serviceName, extensionInfo) {
        extensionInfo = Object.assign({}, extensionInfo);
        if (!/^[a-z0-9]+$/i.test(extensionInfo.id)) {
            throw new Error('Invalid extension id');
        }
        extensionInfo.name = extensionInfo.name || extensionInfo.id;
        extensionInfo.blocks = extensionInfo.blocks || [];
        extensionInfo.targetTypes = extensionInfo.targetTypes || [];
        extensionInfo.menus = extensionInfo.menus || {};
        extensionInfo.menus = this._prepareMenuInfo(serviceName, extensionInfo.menus);
        extensionInfo.blocks = extensionInfo.blocks.reduce((results, blockInfo) => {
            try {
                let result;
                switch (blockInfo) {
                case '---': // separator
                    result = '---';
                    break;
                default: // an ExtensionBlockMetadata object
                    result = this._prepareBlockInfo(serviceName, blockInfo, extensionInfo.menus);
                    break;
                }
                results.push(result);
            } catch (e) {
                // TODO: more meaningful error reporting
                log.error(`Error processing block: ${e.message}, Block:\n${JSON.stringify(blockInfo)}`, e);
            }
            return results;
        }, []);
        return extensionInfo;
    }

    /**
     * Prepare extension menus. e.g. setup binding for dynamic menu functions.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {Array.<MenuInfo>} menus - the menu defined by the extension.
     * @returns {Array.<MenuInfo>} - a menuInfo object with all preprocessing done.
     * @private
     */
    _prepareMenuInfo(serviceName, menus) {
        const menuNames = Object.getOwnPropertyNames(menus);
        for (let i = 0; i < menuNames.length; i++) {
            const menuName = menuNames[i];
            let menuInfo = menus[menuName];

            // If the menu description is in short form (items only) then normalize it to general form: an object with
            // its items listed in an `items` property.
            if (!menuInfo.items && (typeof menuInfo.variableType !== 'string')) {
                menuInfo = {
                    items: menuInfo
                };
                menus[menuName] = menuInfo;
            }
            // If `items` is a string, it should be the name of a function in the extension object. Calling the
            // function should return an array of items to populate the menu when it is opened.
            if (typeof menuInfo.items === 'string') {
                const menuItemFunctionName = menuInfo.items;
                const serviceObject = dispatch.services[serviceName];
                // Bind the function here so we can pass a simple item generation function to Scratch Blocks later.
                menuInfo.items = this._getExtensionMenuItems.bind(this, serviceObject, menuItemFunctionName);
            }
        }
        return menus;
    }

    /**
     * Fetch the items for a particular extension menu, providing the target ID for context.
     * @param {object} extensionObject - the extension object providing the menu.
     * @param {string} menuItemFunctionName - the name of the menu function to call.
     * @returns {Array} menu items ready for scratch-blocks.
     * @private
     */
    _getExtensionMenuItems(extensionObject, menuItemFunctionName) {
        // Fetch the items appropriate for the target currently being edited. This assumes that menus only
        // collect items when opened by the user while editing a particular target.
        const editingTarget = this.runtime.getEditingTarget() || this.runtime.getTargetForStage();
        const editingTargetID = editingTarget ? editingTarget.id : null;
        const extensionMessageContext = this.runtime.makeMessageContextForTarget(editingTarget);

        // TODO: Fix this to use dispatch.call when extensions are running in workers.
        const menuFunc = extensionObject[menuItemFunctionName];
        const menuItems = menuFunc.call(extensionObject, editingTargetID).map(
            item => {
                item = maybeFormatMessage(item, extensionMessageContext);
                switch (typeof item) {
                case 'object':
                    if (Array.isArray(item)) return item.slice(0, 2);
                    return [
                        maybeFormatMessage(item.text, extensionMessageContext),
                        item.value
                    ];
                case 'string':
                    return [item, item];
                default:
                    return item;
                }
            });

        if (!menuItems || menuItems.length < 1) {
            throw new Error(`Extension menu returned no items: ${menuItemFunctionName}`);
        }
        return menuItems;
    }

    _normalize(thing, to) {
        switch (to) {
        case 'string': return Cast.toString(thing);
        case 'bigint':
        case 'number': return Cast.toNumber(thing);
        case 'boolean': return Cast.toBoolean(thing);
        case 'function': return new Function(thing);
        default: return Cast.toString(thing);
        }
    }

    /**
     * Apply defaults for optional block fields.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionBlockMetadata} blockInfo - the block info from the extension
     * @param {object.<ExtensionMenuMetadata>} menus The menus from the extension
     * @returns {ExtensionBlockMetadata} - a new block info object which has values for all relevant optional fields.
     * @private
     */
    _prepareBlockInfo(serviceName, blockInfo, menus) {
        if (blockInfo.blockType === BlockType.XML) {
            blockInfo = Object.assign({}, blockInfo);
            blockInfo.xml = String(blockInfo.xml) || '';
            return blockInfo;
        }

        blockInfo = Object.assign({}, {
            blockType: BlockType.COMMAND,
            terminal: false,
            blockAllThreads: false,
            arguments: {}
        }, blockInfo);
        blockInfo.text = blockInfo.text || blockInfo.opcode;

        switch (blockInfo.blockType) {
        case BlockType.EVENT:
            if (blockInfo.func) {
                log.warn(`Ignoring function "${blockInfo.func}" for event block ${blockInfo.opcode}`);
            }
            break;
        case BlockType.BUTTON:
            if (!blockInfo.opcode && !blockInfo.func) {
                throw new Error(`Missing opcode or func for button: ${blockInfo.text}`);
            }

            if (blockInfo.func && !blockInfo.opcode) {
                blockInfo.opcode = blockInfo.func;
            }
            const funcName = blockInfo.opcode;
            const callBlockFunc = (...args) => dispatch.call(serviceName, funcName, ...args);

            blockInfo.func = callBlockFunc;
            break;
        case BlockType.LABEL:
            break;
        default: {
            if (!blockInfo.opcode) {
                throw new Error('Missing opcode for block');
            }

            const funcName = blockInfo.func || blockInfo.opcode;

            const getBlockInfo = blockInfo.isDynamic ?
                args => args && args.mutation && args.mutation.blockInfo :
                () => blockInfo;
            const callBlockFunc = (() => {
                if (dispatch._isRemoteService(serviceName)) {
                    return (args, util, realBlockInfo) =>
                        dispatch.call(serviceName, funcName, args, util, realBlockInfo)
                            .then(result => {
                                // Scratch is only designed to handle these types.
                                // If any other value comes in such as undefined, null, an object, etc.
                                // we'll convert it to a string to avoid undefined behavior.
                                if (
                                    typeof result === 'number' ||
                                        typeof result === 'string' ||
                                        typeof result === 'boolean'
                                ) {
                                    return result;
                                }
                                return `${result}`;
                            })
                        // When an error happens, instead of returning undefined, we'll return a stringified
                        // version of the error so that it can be debugged.
                            .catch(err => {
                                // We want the full error including stack to be printed but the log helper
                                // messes with that.
                                // eslint-disable-next-line no-console
                                console.error('Custom extension block error', err);
                                return `${err}`;
                            });
                }

                // avoid promise latency if we can call direct
                const serviceObject = dispatch.services[serviceName];
                if (!serviceObject) {
                    // extension was likely removed
                    return () => {};
                }
                if (!serviceObject[funcName]) {
                    // The function might show up later as a dynamic property of the service object
                    log.warn(`Could not find extension block function called ${funcName}`);
                }
                return (args, util, realBlockInfo) =>
                    serviceObject[funcName](args, util, realBlockInfo);
            })();

            blockInfo.func = (args, util, visualReport) => {
                const normal = {
                    'angle': "number",
                    'Boolean': "boolean",
                    'color': "string",
                    'number': "number",
                    'string': "string",
                    'matrix': "string",
                    'note': "number",
                    'image': "string",
                    'polygon': "object",
                    // normalization exceptions
                    'list': "exception",
                    'broadcast': "exception"
                };
                const realBlockInfo = getBlockInfo(args);
                for (const arg in realBlockInfo.arguments) {
                    const expected = normal[realBlockInfo.arguments[arg].type];
                    if (realBlockInfo.arguments[arg].exemptFromNormalization === true) continue;
                    if (expected === 'exception') continue;
                    if (!expected) continue;
                    // stupidly long check but :Trollhands
                    // if this argument is for a variable dropdown, do not type cast it
                    // as variable dropdowns report an object and not something we can or should cast
                    if (typeof menus[realBlockInfo.arguments[arg].menu]?.variableType === 'string') continue;
                    if (!(typeof args[arg] === expected)) args[arg] = this._normalize(args[arg], expected);
                }
                // TODO: filter args using the keys of realBlockInfo.arguments? maybe only if sandboxed?
                const returnValue = callBlockFunc(args, util, realBlockInfo);
                const isCustomAPI = (returnValue?.value ?? false) && (returnValue?.constructor?.name !== "Object");
                //if (!visualReport && isCustomAPI && realBlockInfo.exemptFromNormalization !== true) return returnValue.value;
                return returnValue;
            };
            break;
        }
        }

        return blockInfo;
    }

    extensionUrlFromId(extId) {
        for (const [extensionId, serviceName] of this._loadedExtensions.entries()) {
            if (extensionId !== extId) continue;
            // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
            const workerId = +serviceName.split('.')[1];
            return this.workerURLs[workerId];
        }
    }
    getExtensionURLs() {
        const extensionURLs = {};
        for (const [extensionId, serviceName] of this._loadedExtensions.entries()) {
            // Service names for extension workers are in the format "extension.WORKER_ID.EXTENSION_ID"
            const workerId = +serviceName.split('.')[1];
            const extensionURL = this.workerURLs[workerId];
            if (typeof extensionURL === 'string') {
                extensionURLs[extensionId] = extensionURL;
            }
        }
        return extensionURLs;
    }

    isExtensionURLLoaded (url) {
        return this.workerURLs.includes(url);
    }
}

module.exports = ExtensionManager;
