const uid = require('../../util/uid');

class canvasStorage {
    /**
     * initiats the storage
     */
    constructor () {
        this.canvases = {};
    }

    attachRuntime (runtime) {
        this.runtime = runtime;
    }

    /**
     * gets a canvas with a given id
     * @param {string} id the id of the canvas to get
     * @returns {Object} the canvas object with this id
     */
    getCanvas (id) {
        return this.canvases[id];
    }

    /**
     * deletes a canvas with a given id
     * @param {string} id the canvas id to delete
     * @returns {Object} the deleted canvas
     */
    deleteCanvas (id) {
        const orignal = this.canvases[id];
        delete this.canvases[id];
        return orignal;
    }

    /**
     * creates a new canvas
     * @param {string} name the name to give the new canvas
     * @param {number} width the width of the canvas
     * @param {number} height the height of the canvas
     * @param {string} opt_id the id of the canvas
     * @returns {Object} the new canvas object
     */
    newCanvas (name, width, height, opt_id) {
        width = width || this.runtime.stageWidth;
        height = height || this.runtime.stageHeight;
        
        const id = opt_id || uid();
        const element = document.createElement('canvas');
        element.id = id;
        element.width = width;
        element.height = height;

        const skin = !this.runtime.renderer
            ? null
            : this.runtime.renderer.createBitmapSkin(element, 1);

        const data = {
            name: name,
            id: id,
            element: element,
            skinId: skin,
            width: width, 
            height: height,
            context: element.getContext('2d')
        };
        this.canvases[id] = data;
        return data;
    }

    /**
     * gets or creates a canvas with name equal to 
     * @param {string} name the name of the canvas
     * @returns {object} An object variable
     */
    getCanvasByName (name) {
        return Object.values(this.canvases).find(canvas => canvas.name === name);
    }

    /**
     * gets all canvases 
     * @returns {Array} All of the objects stored
     */
    getAllCanvases () {
        return Object.values(this.canvases);
    }
}

module.exports = canvasStorage;
