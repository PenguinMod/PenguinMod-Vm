const xmlEscape = require('../../util/xml-escape');
const uid = require('../../util/uid');
const StageLayering = require('../../engine/stage-layering');

class CanvasVar {
    static customId = 'canvasData'

    /**
     * initiats the variable
     * @param {Runtime} runtime the runtime this canvas exists inside
     * @param {string} id this canvas's id
     * @param {string} name the name of this canvas
     * @param {Array<number>|string|Image} [img=[1, 1]] optionally the image to be loaded into this canvas
     */
    constructor (runtime, id, name, img = [1, 1]) {
        this.id = id ?? uid();
        this.name = name;
        this.type = 'canvas';
        this.customId = CanvasVar.customId;
        this.runtime = runtime;
        this.renderer = runtime.renderer;
        this.canvas = document.createElement('canvas');
        this._costumeDrawer = this.renderer.createDrawable(StageLayering.SPRITE_LAYER);
        this._skinId = this.renderer.createBitmapSkin(this.canvas, 1);
        this._monitorUpToDate = false;
        this._cachedMonContent = [null, 0];
        this._cameraStuff = {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
        };
        // img is just a size to be given to the canvas
        if (Array.isArray(img)) {
            this.size = img;
            return;
        }
        if (img) this.loadImage(img);
    }

    serialize(canvas) {
        const instance = canvas ?? this;
        return [instance.id, instance.name, instance.canvas.toDataURL()];
    }
    getSnapshot() {
        const snap = new Image();
        snap.src = this.canvas.toDataURL();
        return snap;
    }
    toReporterContent() {
        return this.canvas;
    }
    toMonitorContent() {
        if (!this._monitorUpToDate) {
            this._cachedMonContent = this.getSnapshot();
            this._monitorUpToDate = true;
        }
        
        return this._cachedMonContent;
    }
    toListEditor() {
        return this.toString();
    }
    fromListEditor(edit) {
        if (this.toString() !== edit) {
            this.loadImage(edit);
        }
        return this;
    }
    toString() {
        return this.canvas.toDataURL();
    }
    toXML(isLocal) {
        return `<variable type="canvas" id="${this.id}" islocal="${isLocal
        }" iscloud="false">${xmlEscape(this.name)}</variable>`;
    }
    toToolboxDefault(fieldName) {
        return `<field name="${fieldName}" id="${this.id}" variabletype="canvas">${xmlEscape(this.name)}</field>`;
    }

    get size() {
        return [this.canvas.width, this.canvas.height];
    }
    set size(size) {
        this.canvas.width = size[0];
        this.canvas.height = size[1];
    }

    /**
     * load an image onto the 2d canvas
     * @param {Image} img the image to load onto the 2d canvas
     */
    async loadImage(img) {
        // we where not given something we can use imediatly :(
        if (img instanceof Image && !img.complete) {
            await new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve;
            });
        }
        if (typeof img === 'string') {
            await new Promise(resolve => {
                const src = img;
                img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            });
        }

        this.canvas.width = img.width;
        this.canvas.height = img.height;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // do this cause we just added new content
        this.updateCanvasContentRenders();
    }

    stampDrawable(id, x, y) {
        // drawable doesnt exist, we will get an error if we try to access this drawable
        if (!this.renderer._allDrawables[id]) return;
        const drawable = this.renderer.extractDrawableScreenSpace(id);
        // never got any data, ignore request
        if (!drawable) return;
        const ctx = this.canvas.getContext('2d');
        ctx.putImageData(drawable.imageData, x, y);
    }

    stampCostume(target, costumeName, x, y) {
        const skin = costumeName !== '__current__'
            ? (() => {
                const costumeIdx = target.getCostumeIndexByName(costumeName);
                const costumeList = target.getCostumes();
                const costume = costumeList[costumeIdx];

                return this.renderer._allSkins[costume.skinId];
            })()
            : this.renderer._allDrawables[target.drawableID].skin;
        const ctx = this.canvas.getContext('2d');

        // draw svg skins loaded image element
        if (skin._svgImage) {
            ctx.drawImage(skin._svgImage, x, y);
            return;
        }
        // draw the generated content of TextCostumeSkin or TextBubbleSkin directly
        if (skin._canvas) {
            ctx.drawImage(skin._canvas, x, y);
            return;
        }
        // shit, alright we cant just goofy ahh our way through this
        // we need to somehow request some form of image that we can just draw to the canvas 
        // from either the webgl texture that the skin gives us or the sprite 
        /**
         * TODO: please if someone could make this not shitty ass and make it just draw a
         * fucking webgl texture directly that would be amazing 
         */
        this.renderer.updateDrawableSkinId(this._costumeDrawer, skin.id);
        this.stampDrawable(this._costumeDrawer);
    }

    updateCanvasContentRenders() {
        this._monitorUpToDate = false;
        // if width or height are smaller then one, replace them with one
        const width = Math.max(this.canvas.width, 1);
        const height = Math.max(this.canvas.height, 1);
        const ctx = this.canvas.getContext('2d');

        const printSkin = this.renderer._allSkins[this._skinId];
        ctx.save();
        ctx.resetTransform();
        const imageData = ctx.getImageData(0, 0, width, height);
        ctx.restore();
        printSkin._setTexture(imageData);
        printSkin.emitWasAltered();
        
        this.runtime.requestRedraw();
    }

    applyCanvasToTarget(target) {
        this.renderer.updateDrawableSkinId(target.drawableID, this._skinId);
    }
}

module.exports = CanvasVar;
