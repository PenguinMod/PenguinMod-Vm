class EditorTab {
    constructor (runtime, extensionId, tabId, name, uri) {
        this.runtime = runtime;
        this.extensionId_ = extensionId;
        this.tabId_ = tabId;
        this.element_ = null;

        this.name = name;
        this.icon = uri;
    }

    setName (name) {
        this.name = name;
        this.update();
    }
    setIcon (iconUri) {
        this.icon = iconUri;
        this.update();
    }

    setDOM (element) {
        this.element_ = element;
        this.update();
    }
    update () {
        this.runtime.emit('EDITOR_TABS_UPDATE');
    }
}

/**
 * Class responsible for managing tabs created by extensions.
 * These tabs are editor tabs near the Code, Costumes and Sounds tabs.
 */
class TabManager {
    constructor (runtime) {
        this.runtime = runtime;
        this.tabs_ = {};
    }

    /**
     * Register a new editor tab.
     * @param {string} extensionId ID of this extension.
     * @param {string} tabId ID for this tab.
     * @param {string} name Name of the editor tab.
     * @param {string} uri The icon URI
     * @returns {EditorTab} The tab interface
     */
    register (extensionId, tabId, name, uri) {
        const fullTabId = `${extensionId}_${tabId}`;
        // check if this tab exists
        if (fullTabId in this.tabs_) {
            console.warn('Tab', tabId, 'for', extensionId, 'already exists.');
            return this.tabs_[fullTabId];
        }
        // create tab
        const tab = new EditorTab(this.runtime, extensionId, tabId, name, uri);
        this.tabs_[fullTabId] = tab;
        this.runtime.emit('EDITOR_TABS_NEW', tab);
        return tab;
    }
}

module.exports = TabManager;