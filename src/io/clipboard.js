class ClipboardIO {
    constructor (runtime) {
        this.runtime = runtime;
        this._text = ""; // for browsers that dont have clipboard for some reason
    }

    async writeText(text) {
        try { await navigator.clipboard.writeText(text); } catch (e) {}
        this._text = text;
    }

    async readText() {
        try { return await navigator.clipboard.readText(); } catch (e) {}
        return this._text;
    }
}

module.exports = ClipboardIO;
