class Tab {
    constructor(extID, tabID, name, uri, runtime) {
        this.extID = extID;
        this.id = tabID;
        this.name = name;
        this.uri = uri;
        this.element = null;
        this.runtime = runtime;
        this.enabled = true;
        this.visible = true;
    }

    update() {
        this.runtime.emit('EDITOR_TABS_UPDATE');
    }

    setName(name) {
        this.name = name;
        this.update();
    }

    setURI(uri) {
        this.uri = uri;
        this.update();
    }

    setDOM(element) {
        this.element = element;
        this.update();
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.update();
    }

    setVisible(visible) {
        this.visible = visible;
        if (visible == false) {
            this.enabled = false;
        }

        this.update();
    }
}

class TabManager {
    static get DEFAULT_TAB_IMG () {
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48ZyBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIGZpbGw9IiMwMGMzZmYiPjxwYXRoIGQ9Ik02Ljc1IDcuMDcyYzEuMDg3LS4wMiAxLjEzNy0xLjAwNiAxLjEzNy0xLjA0OSAwLS44NzQgMS40MDgtMS4xNDQgMi4wNy0xLjE0NC42NjMgMCAxLjk5Ni42MzUgMS45OTYgMS42OTdzLTEuMzY0IDIuMDUtMS45OTYgMi4wNWMtLjAyMyAwLTEuNTk0LjMyOS0xLjU1OCAxLjAyMy4wMy41NzguMjg1Ljg5Ny4yODUgMS43NSAwIC44NTIuNDYyIDEuNTQzIDEuMjc2IDEuNTQzczEuMjc3LS42OTEgMS4yNzctMS41NDRjMC0uMTguMjczLS43MjMuMjc4LTEuMTYxIDEuNDA0LS42MSAyLjY2My0xLjk2OCAyLjY2My0zLjY2IDAtMi4zMTgtMi4wNDktMy43OC00LjIyLTMuOTIzLTIuMTczLS4xNDQtNC4xMzYgMS41MDgtNC4xMzYgMy4zNyAwIC4xMTktLjA3NCAxLjA2Ny45MjggMS4wNDh6IiBzdHJva2U9IiMwMGMzZmYiIHN0cm9rZS13aWR0aD0iLjc1Ii8+PHBhdGggZD0iTTguMzkzIDE1Ljc5YTEuNTY1IDEuNTY1IDAgMSAxIDMuMTI5IDAgMS41NjUgMS41NjUgMCAwIDEtMy4xMjkgMCIvPjwvZz48L3N2Zz4=';
    }

    constructor(runtime) {
        this.runtime = runtime;
        this.tabs = {};
    }

    register(extID, id, name, uri) {
        if (!extID || !extID.length) {
            console.warn("No Extension ID provided!");
            return;
        }
        if (!id || !id.length) {
            console.warn("No Tab ID provided!");
            return;
        }
        id = extID + '-' + id;
        if (!name) {
            name = id;
        }
        if (!uri) {
            uri = TabManager.DEFAULT_TAB_IMG;
        }

        if (this.tabs[id] !== undefined) {
            console.warn("Tab: " + id + " already exists!");
            return this.tabs[id];
        }

        const tab = new Tab(extID, id, name, uri, this.runtime);
        this.tabs[id] = tab;

        this.runtime.emit('EDITOR_TABS_UPDATE');
        return tab;
    }
}

module.exports = TabManager;
