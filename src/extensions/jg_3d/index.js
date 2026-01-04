const Cast = require('../../util/cast');
const Clone = require('../../util/clone');
const ExtensionInfo = require("./info");
const Three = require("three");
const BufferGeometryUtils = require('three/examples/jsm/utils/BufferGeometryUtils');
const { ConvexGeometry } = require('three/examples/jsm/geometries/ConvexGeometry');
const { OBJLoader } = require('three/examples/jsm/loaders/OBJLoader.js');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { FBXLoader } = require('three/examples/jsm/loaders/FBXLoader.js');
const Color = require('../../util/color');

const MeshLoaders = {
    OBJ: new OBJLoader(),
    GLTF: new GLTFLoader(),
    FBX: new FBXLoader(),
}
function toRad(deg) {
    return deg * (Math.PI / 180);
}
function toDeg(rad) {
    return rad * (180 / Math.PI);
}
function normalize(vec) {
    const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
    return new Three.Vector3(vec.x / length, vec.y / length, vec.z / length);
}
function toDegRounding(rad) {
    const result = toDeg(rad);
    if (!String(result).includes('.')) return result;
    const split = String(result).split('.');
    const endingDecimals = split[1].substring(0, 3);
    if ((endingDecimals === '999') && (split[1].charAt(3) === '9')) return Number(split[0]) + 1;
    return Number(split[0] + '.' + endingDecimals);
}

/**
 * Class for 3D blocks
 * @constructor
 */
class Jg3DBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        this.three = Three;
        // expose addons and that for the funnis
        this.BufferGeometryUtils = BufferGeometryUtils;
        this.ConvexGeometry = ConvexGeometry;
        this.OBJLoader = OBJLoader;
        this.GLTFLoader = GLTFLoader;
        this.FBXLoader = FBXLoader;
        
        // prism has screenshots, lets tell it to use OUR canvas for them
        this.runtime.prism_screenshot_checkForExternalCanvas = true;
        this.runtime.prism_screenshot_externalCanvas = null;

        // Three.js requirements
        /**
         * @type {Three.Scene}
         */
        this.scene = null;
        /**
         * @type {Three.Camera}
         */
        this.camera = null;
        /**
         * @type {Three.WebGLRenderer}
         */
        this.renderer = null;

        this.existingSceneObjects = [];
        this.existingSceneLights = [];

        // extras
        this.lastStageSizeWhenRendering = {
            width: 0,
            height: 0
        }

        this.savedMeshes = {};
        this.sceneLayer = "front";
        this.lastStageColor = [255, 255, 255, 0];

        // event recievers
        // stop button clicked or project restarted, dispose of all objects
        this.runtime.on('PROJECT_STOP_ALL', () => {
            this.dispose();
            this.sceneLayer = "front";
            this.updateScratchCanvasRelayering();
        });
    }

    /**
     * Dispose of the scene, camera & renderer (and any objects)
     */
    dispose() {
        this.existingSceneObjects = [];
        this.existingSceneLights = [];
        if (this.scene) {
            this.scene.remove();
            this.scene = null;
        }
        if (this.camera) {
            this.camera.remove();
            this.camera = null;
        }
        if (this.renderer) {
            if (this.renderer.domElement) {
                this.renderer.domElement.remove();
            }
            this.renderer.dispose();
            this.renderer = null;
            this.runtime.prism_screenshot_externalCanvas = null;
        }
    }
    /**
     * Displays a message for stack blocks.
     * @param {BlockUtility} util The util from the calling block
     * @param {string} message The warning message to display
     */
    stackWarning(util, message) {
        if (!util) return;
        if (!util.thread) return;
        if (!util.thread.stackClick) return;
        const block = util.thread.blockGlowInFrame;
        this.runtime.visualReport(block, message);
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return ExtensionInfo;
    }

    // utilities
    getScratchCanvas() {
        return this.runtime.renderer.canvas;
    }
    restyleExternalCanvas(canvas) {
        canvas.style.position = "absolute"; // position above canvas without pushing it down
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        // we have no reason to register clicks on the three.js canvas,
        // so make it click on the scratch canvas instead
        canvas.style.pointerEvents = "none";
    }
    appendElementAboveScratchCanvas(element) {
        element.style.zIndex = 450;
        if (this.sceneLayer === 'back') {
            element.style.zIndex = 0;
        }
        this.getScratchCanvas().parentElement.prepend(element);
    }
    updateScratchCanvasRelayering() {
        const canvas = this.getScratchCanvas();
        canvas.style.backgroundColor = "transparent";
        canvas.style.position = "relative"; // allows zIndex changes
        if (Cast.toNumber(canvas.style.zIndex) < 1) {
            canvas.style.zIndex = 1;
        }

        // _backgroundColor4f[3] controls opacity
        let lastOpacity = this.runtime.renderer._backgroundColor4f[3];
        if (this.sceneLayer === 'front') {
            this.runtime.renderer.setBackgroundColor(
                this.lastStageColor[0],
                this.lastStageColor[1],
                this.lastStageColor[2],
                1
            );
        }
        if (this.sceneLayer === 'back') {
            if (
                this.runtime.renderer._backgroundColor4f[0] !== this.lastStageColor[0]
                || this.runtime.renderer._backgroundColor4f[1] !== this.lastStageColor[1]
                || this.runtime.renderer._backgroundColor4f[2] !== this.lastStageColor[2]
            ) {
                // color likely changed to sum else
                console.log("updated stage color");
                this.lastStageColor = this.runtime.renderer._backgroundColor4f;
            }
            this.runtime.renderer.setBackgroundColor(0, 0, 0, 0);
        }
        // update if changed
        if (lastOpacity !== this.runtime.renderer._backgroundColor4f[3]) {
            this.runtime.renderer.dirty = true;
        }
    }
    needsToResizeCanvas() {
        const stage = {
            width: this.runtime.stageWidth,
            height: this.runtime.stageHeight
        }
        return stage !== this.lastStageSizeWhenRendering;
    }
    mergeVertices(geometry) {
        const vertices = geometry.attributes.position.array;
        const vertexMap = {};
        const mergedVertices = [];
        const newIndices = [];
        let newIndex = 0;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = vertices[i + 2];
            const key = `${x},${y},${z}`;

            if (vertexMap[key] === undefined) {
                vertexMap[key] = newIndex;
                mergedVertices.push(x, y, z);
                newIndices.push(newIndex);
                newIndex++;
            } else {
                newIndices.push(vertexMap[key]);
            }
        }

        geometry.setAttribute('position', new Three.Float32BufferAttribute(mergedVertices, 3));
        geometry.setIndex(new Three.Uint32BufferAttribute(newIndices, 1));

        return geometry;
    }

    performRaycast(raycaster, object) {
        const geometry = object.geometry;

        const mergedGeometry = this.mergeVertices(geometry);

        const boundingGeometry = new Three.BufferGeometry().copy(mergedGeometry);
        boundingGeometry.computeBoundingBox();
        boundingGeometry.boundingBox.applyMatrix4(object.matrixWorld);

        const intersection = raycaster.intersectObject(object, true);

        return intersection.length > 0;
    }

    initialize() {
        // dispose of the previous scene
        this.dispose();
        this.scene = new Three.Scene();
        this.renderer = new Three.WebGLRenderer({ preserveDrawingBuffer: true, alpha: true });
        this.renderer.penguinMod = {
            backgroundColor: 0x000000,
            backgroundOpacity: 1
        }
        this.renderer.setClearColor(0x000000, 1);
        // add renderer canvas ontop of scratch canvas
        const canvas = this.renderer.domElement;
        this.runtime.prism_screenshot_externalCanvas = canvas;

        this.restyleExternalCanvas(canvas);
        this.appendElementAboveScratchCanvas(canvas);
        this.updateScratchCanvasRelayering();
        /* dev: test rendering by drawing a cube and see if it appears
        // const geometry = new Three.BoxGeometry(1, 1, 1);
        // const material = new Three.MeshBasicMaterial({ color: 0x00ff00 });
        // const cube = new Three.Mesh(geometry, material);
        // this.scene.add(cube)
        
        dev update: it worked W
        */
    }
    render() {
        if (!this.renderer) return;
        if (!this.scene) return;
        if (!this.camera) return;
        if (this.needsToResizeCanvas()) {
            this.lastStageSizeWhenRendering = {
                width: this.runtime.stageWidth,
                height: this.runtime.stageHeight
            }
            /*
                multiply sizes because the stage looks like doo doo xd
                we dont need to worry about multiplying 1920 * 2 since projects
                shouldnt be using that large of a stage but instead a smaller size
                with the same aspect ratio, penguinmod even says that
            */
            this.renderer.setSize(this.lastStageSizeWhenRendering.width * 2, this.lastStageSizeWhenRendering.height * 2);
            this.restyleExternalCanvas(this.renderer.domElement);
        }
        // when switching between project page & editor, we need to move the canvas again since it gets lost
        /* todo: create layers so that iframe appears above 3d every time this is done */
        this.appendElementAboveScratchCanvas(this.renderer.domElement);
        this.updateScratchCanvasRelayering();
        return new Promise((resolve) => {
            // we do this to avoid HUGE lag when not waiting 1 tick
            // and because it waits if the tab isnt focused
            requestAnimationFrame(() => {
                // renderer might not exist anymore
                if (!this.renderer) return;
                resolve(this.renderer.render(this.scene, this.camera));
            })
        })
    }

    setCameraPerspective2(args) {
        if (this.camera) {
            // remove existing camera
            this.camera.remove();
            this.camera = null;
        }

        const fov = Cast.toNumber(args.FOV);
        const aspect = Cast.toNumber(args.AR);
        const near = Cast.toNumber(args.NEAR);
        const far = Cast.toNumber(args.FAR);

        this.camera = new Three.PerspectiveCamera(fov, aspect, near, far);
    }
    setCameraPerspective1(args) {
        /* todo: make near and far be the same as the existing camera if there is one */
        const near = 0.1;
        const far = 1000;
        return this.setCameraPerspective2({
            FOV: args.FOV,
            AR: args.AR,
            NEAR: near,
            FAR: far
        })
    }
    setCameraPerspective0(args) {
        /* todo: make ar, near and far be the same as the existing camera if there is one */
        const ar = this.runtime.stageWidth / this.runtime.stageHeight;
        const near = 0.1;
        const far = 1000;
        return this.setCameraPerspective2({
            FOV: args.FOV,
            AR: ar,
            NEAR: near,
            FAR: far
        })
    }

    setCameraPosition(args) {
        if (!this.camera) return;
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        }
        this.camera.position.set(position.x, position.y, position.z);
    }
    setCameraRotation(args) {
        if (!this.camera) return;
        const rotation = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        }
        // const euler = new Three.Euler(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
        // this.camera.setRotationFromEuler(euler);
        const euler = new Three.Euler(0, 0, 0);
        this.camera.setRotationFromEuler(euler);
        this.camera.rotateY(toRad(rotation.y));
        this.camera.rotateX(toRad(rotation.x));
        this.camera.rotateZ(toRad(rotation.z));
    }
    getCameraPosition(args) {
        if (!this.camera) return "";
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(this.camera.position[v]);
    }
    getCameraRotation(args) {
        if (!this.camera) return "";
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        const rotation = Cast.toNumber(this.camera.rotation[v]);
        // rotation is in radians, convert to degrees but round it
        // a bit so that we get 46 instead of 45.999999999999996
        return toDegRounding(rotation);
    }

    setSceneLayer(args) {
        if (!this.renderer) return;
        let lastSceneLayer = this.sceneLayer;
        this.sceneLayer = "front";
        if (Cast.toString(args.SIDE) === 'back') {
            this.sceneLayer = "back";
        }
        if (this.sceneLayer !== lastSceneLayer) {
            this.lastStageColor = this.runtime.renderer._backgroundColor4f;
        }
        this.appendElementAboveScratchCanvas(this.renderer.domElement);
        this.updateScratchCanvasRelayering();
    }
    setSceneBackgroundColor(args) {
        if (!this.renderer) return;
        const rgb = Cast.toRgbColorObject(args.COLOR);
        const color = Color.rgbToDecimal(rgb);
        this.renderer.penguinMod.backgroundColor = color;
        this.renderer.setClearColor(color, this.renderer.penguinMod.backgroundOpacity);
    }
    setSceneBackgroundOpacity(args) {
        if (!this.renderer) return;
        let opacity = Cast.toNumber(args.OPACITY);
        if (opacity > 100) opacity = 100;
        if (opacity < 0) opacity = 0;
        const backgroundOpac = 1 - (opacity / 100);
        this.renderer.penguinMod.backgroundOpacity = backgroundOpac;
        this.renderer.setClearColor(this.renderer.penguinMod.backgroundColor, backgroundOpac);
    }
    show3d() {
        this.renderer.domElement.style.display = ""
    }
    hide3d() {
        this.renderer.domElement.style.display = "none"
    }
    is3dVisible() {
        return this.renderer.domElement.style.display === "" || this.renderer.domElement.style.display === "absolute"
    }

    getCameraZoom() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.zoom) * 100;
    }
    setCameraZoom(args) {
        if (!this.camera) return;
        this.camera.zoom = Cast.toNumber(args.ZOOM) / 100;
        this.camera.updateProjectionMatrix();
    }

    getCameraClipPlane(args) {
        if (!this.camera) return "";
        const plane = args.CLIPPLANE;
        if (!["near", "far"].includes(plane)) return "";
        return this.camera[plane];
    }

    getCameraAspectRatio() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.aspect);
    }
    getCameraFov() {
        if (!this.camera) return "";
        return Cast.toNumber(this.camera.fov);
    }

    isCameraPerspective() {
        if (!this.camera) return false;
        return Cast.toBoolean(this.camera.isPerspectiveCamera);
    }
    isCameraOrthographic() {
        if (!this.camera) return false;
        return Cast.toBoolean(!this.camera.isPerspectiveCamera);
    }

    doesObjectExist(args) {
        if (!this.scene) return false;
        const name = Cast.toString(args.NAME);
        // !! is easier to type than if (...) { return true; } return false;
        return !!this.scene.getObjectByName(name);
    }

    createGameObject(args, util, type) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        if (this.scene.getObjectByName(name)) return this.stackWarning(util, 'An object with this name already exists!');
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        let object;
        switch (type) {
            case 'sphere': {
                const geometry = new Three.SphereGeometry(1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const sphere = new Three.Mesh(geometry, material);
                object = sphere;
                break;
            }
            case 'plane': {
                const geometry = new Three.PlaneGeometry(1, 1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const plane = new Three.Mesh(geometry, material);
                object = plane;
                break;
            }
            case 'mesh': {
                const url = Cast.toString(args.URL);
                // switch loaders based on file type
                let fileType = 'obj';
                switch (Cast.toString(args.FILETYPE)) {
                    case '.glb / .gltf':
                        fileType = 'glb';
                        break;
                    case '.fbx':
                        fileType = 'fbx';
                        break;
                }
                // we need to do a promise here so that stack continues on load
                return new Promise((resolve) => {
                    let loader = MeshLoaders.OBJ;
                    switch (fileType) {
                        case 'glb':
                            loader = MeshLoaders.GLTF;
                            break;
                        case 'fbx':
                            loader = MeshLoaders.FBX;
                            break;
                    }
                    if (url in this.savedMeshes) {
                        const mesh = this.savedMeshes[url];
                        object = mesh.clone();
                        object.name = name;
                        this.existingSceneObjects.push(name);
                        object.isPenguinMod = true;
                        object.isMeshObj = true;
                        object.position.set(position.x, position.y, position.z);
                        this.scene.add(object);
                        resolve();
                        return;
                    }
                    else {
                        loader.load(url, (object) => {
                            // success
                            if (loader === MeshLoaders.GLTF) {
                                object = object.scene;
                            }
                            if (loader === MeshLoaders.OBJ) {
                                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                                material.wireframe = false;
                                this.updateMaterialOfObjObject(object, material);
                                this.savedMeshes[url] = object;
                            }
                            object.name = name;
                            console.log(object);
                            this.existingSceneObjects.push(name);
                            object.isPenguinMod = true;
                            object.isMeshObj = true;
                            object.position.set(position.x, position.y, position.z);
                            this.scene.add(object);
                            resolve();
                        }, () => { }, (error) => {
                            console.warn('Failed to load 3D mesh obj;', error);
                            this.stackWarning(util, 'Failed to get the 3D mesh!');
                            resolve();
                        })
                    }
                });
            }
            case 'light': {
                const type = Cast.toString(args.LIGHTTYPE);
                // switch type because there are different types of lights
                let light;
                switch (type) {
                    default: {
                        light = new Three.PointLight(0xffffff, 1, 100);
                        break;
                    }
                }
                object = light;
                this.existingSceneLights.push(name);
                break;
            }
            default: {
                const geometry = new Three.BoxGeometry(1, 1, 1);
                const material = new Three.MeshStandardMaterial({ color: 0xffffff });
                const cube = new Three.Mesh(geometry, material);
                object = cube;
                break;
            }
        }
        object.name = name;
        this.existingSceneObjects.push(name);
        object.isPenguinMod = true;
        object.position.set(position.x, position.y, position.z);
        this.scene.add(object);
    }
    createCubeObject(args, util) {
        this.createGameObject(args, util, 'cube');
    }
    createSphereObject(args, util) {
        this.createGameObject(args, util, 'sphere');
    }
    createPlaneObject(args, util) {
        this.createGameObject(args, util, 'plane');
    }
    createMeshObject(args, util) {
        this.createGameObject(args, util, 'mesh');
    }
    createMeshObjectFileTyped(args, util) {
        this.createGameObject(args, util, 'mesh');
    }
    createLightObject(args, util) {
        this.createGameObject(args, util, 'light');
    }

    getMaterialOfObjObject(object) {
        let material;
        object.traverse((child) => {
            if (child instanceof Three.Mesh) {
                material = child.material;
            }
        });
        return material;
    }
    updateMaterialOfObjObject(object, material) {
        object.traverse((child) => {
            if (child instanceof Three.Mesh) {
                child.material = material;
            }
        });
    }

    setObjectPosition(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        object.position.set(position.x, position.y, position.z);
    }
    setObjectRotation(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const rotation = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        // const euler = new Three.Euler(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
        // object.setRotationFromEuler(euler);
        const euler = new Three.Euler(0, 0, 0);
        object.setRotationFromEuler(euler);
        object.rotateY(toRad(rotation.y));
        object.rotateX(toRad(rotation.x));
        object.rotateZ(toRad(rotation.z));
    }
    setObjectSize(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const size = {
            x: Cast.toNumber(args.X) / 100,
            y: Cast.toNumber(args.Y) / 100,
            z: Cast.toNumber(args.Z) / 100,
        };
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        object.scale.set(size.x, size.y, size.z);
    }
    moveObjectUnits(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return;

        const amount = Cast.toNumber(args.AMOUNT);
        const direction = new Three.Vector3();
        object.getWorldDirection(direction);
        object.position.add(direction.multiplyScalar(amount));
    }

    getObjectPosition(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(object.position[v]);
    }
    getObjectRotation(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        const rotation = Cast.toNumber(object.rotation[v]);
        // rotation is in radians, convert to degrees but round it
        // a bit so that we get 46 instead of 45.999999999999996
        return toDegRounding(rotation);
    }
    getObjectSize(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        const v = args.VECTOR3;
        if (!v) return "";
        if (!["x", "y", "z"].includes(v)) return "";
        return Cast.toNumber(object.scale[v]) * 100;
    }
    getObjectColor(args) {
        if (!this.scene) return "";
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        return "#" + object.material.color.getHexString()
    }
    deleteObject(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        const isLight = object.isLight;
        object.clear();
        this.scene.remove(object);
        const idx = this.existingSceneObjects.indexOf(name);
        this.existingSceneObjects.splice(idx, 1);
        if (isLight) {
            const lidx = this.existingSceneLights.indexOf(name);
            this.existingSceneLights.splice(lidx, 1);
        }
    }
    setObjectColor(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const rgb = Cast.toRgbColorObject(args.COLOR);
        const color = Color.rgbToDecimal(rgb);
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) {
            object.color.set(color);
            return
        }
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            material.color.set(color);
            this.updateMaterialOfObjObject(object, material);
            return;
        }
        object.material.color.set(color);
    }
    setObjectShading(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const on = Cast.toString(args.ONOFF) === 'on';
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) return;
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            const color = '#' + material.color.getHexString();
            let newMat;
            if (on) {
                newMat = new Three.MeshStandardMaterial({ color: color });
            } else {
                newMat = new Three.MeshBasicMaterial({ color: color });
            }
            newMat.color.set(color);
            this.updateMaterialOfObjObject(object, newMat);
            return;
        }
        const color = '#' + object.material.color.getHexString();
        if (on) {
            object.material = new Three.MeshStandardMaterial({ color: color });
        } else {
            object.material = new Three.MeshBasicMaterial({ color: color });
        }
    }
    setObjectWireframe(args) {
        if (!this.scene) return;
        const name = Cast.toString(args.NAME);
        const on = Cast.toString(args.ONOFF) === 'on';
        const object = this.scene.getObjectByName(name);
        if (!object) return;
        if (object.isLight) return;
        if (object.isMeshObj) {
            const material = this.getMaterialOfObjObject(object);
            if (!material) return;
            material.wireframe = on;
            this.updateMaterialOfObjObject(object, material);
            return;
        }
        object.material.wireframe = on;
    }

    existingObjectsArray(args) {
        const listType = Cast.toString(args.OBJECTLIST);
        const validOptions = ["objects", "physical objects", "lights"];
        if (!validOptions.includes(listType)) return '[]';
        switch (listType) {
            case 'objects':
                return JSON.stringify(this.existingSceneObjects);
            case 'lights':
                return JSON.stringify(this.existingSceneLights);
            case 'physical objects': {
                const physical = this.existingSceneObjects.filter(objectName => {
                    return !this.existingSceneLights.includes(objectName);
                });
                return JSON.stringify(physical);
            }
            default:
                return '[]';
        }
    }

    objectTouchingObject(args) {
        if (!this.scene) return false;
        const name1 = Cast.toString(args.NAME1);
        const name2 = Cast.toString(args.NAME2);
        const object1 = this.scene.getObjectByName(name1);
        const object2 = this.scene.getObjectByName(name2);
        if (!object1) return false;
        if (!object2) return false;
        if (object1.isLight) return false; // currently lights are not supported for collisions
        if (object2.isLight) return false; // currently lights are not supported for collisions
        const box1 = new Three.Box3().setFromObject(object1);
        const box2 = new Three.Box3().setFromObject(object2);
        const collision = box1.intersectsBox(box2);
        return collision;
    }

    pointTowardsObject(args) {
        if (!this.scene) return false;
        const name1 = Cast.toString(args.NAME1);
        const name2 = Cast.toString(args.NAME2);
        const object1 = this.scene.getObjectByName(name1);
        const object2 = this.scene.getObjectByName(name2);
        if (!object1) return false;
        if (!object2) return false;
        object1.lookAt(object2.position);
    }
    pointTowardsXYZ(args) {
        if (!this.scene) return false;
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return false;
        const position = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z)
        };
        object.lookAt(position.x, position.y, position.z);
    }

    MoveCameraBy(args) {
        if (!this.camera) return;
        const amount = Cast.toNumber(args.AMOUNT);
        // comment so it updates bc github was having problems
        const direction = new Three.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.add(direction.multiplyScalar(amount));
    }

    changeCameraPosition(args) {
        if (!this.camera) return;
        this.camera.position.x += Cast.toNumber(args.X);
        this.camera.position.y += Cast.toNumber(args.Y);
        this.camera.position.z += Cast.toNumber(args.Z);
    }

    changeCameraRotation(args) {
        if (!this.camera) return;
        this.camera.rotation.x += Cast.toNumber(args.X);
        this.camera.rotation.y += Cast.toNumber(args.Y);
        this.camera.rotation.z += Cast.toNumber(args.Z);
    }

    raycastResultToReadable(result) {
        const newResult = Clone.simple(result).map((intersection) => {
            console.log(intersection.object.object.name);
            return intersection.object.object.name;
        })
        return newResult;
    }

    rayCollision(args) {
        if (!this.scene) return '';
        const ray = new Three.Raycaster();
        const origin = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const direction = normalize({
            x: toRad(Cast.toNumber(args.DX)),
            y: toRad(Cast.toNumber(args.DY)),
            z: toRad(Cast.toNumber(args.DZ)),
        });
        ray.set(new Three.Vector3(origin.x, origin.y, origin.z), new Three.Vector3(direction.x, direction.y, direction.z));
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '';
        const first = intersects[0];
        return first.object.name;
    }
    rayCollisionCamera() {
        if (!this.scene) return '';
        if (!this.camera) return '';
        const ray = new Three.Raycaster();
        ray.setFromCamera(new Three.Vector2(), this.camera);
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '';
        const first = intersects[0];
        return first.object.name;
    }
    rayCollisionArray(args) {
        if (!this.scene) return '[]';
        const ray = new Three.Raycaster();
        const origin = {
            x: Cast.toNumber(args.X),
            y: Cast.toNumber(args.Y),
            z: Cast.toNumber(args.Z),
        };
        const direction = normalize({
            x: toRad(Cast.toNumber(args.DX)),
            y: toRad(Cast.toNumber(args.DY)),
            z: toRad(Cast.toNumber(args.DZ)),
        });
        ray.set(new Three.Vector3(origin.x, origin.y, origin.z), new Three.Vector3(direction.x, direction.y, direction.z));
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '[]';
        //const result = this.raycastResultToReadable(intersects);
        return JSON.stringify(intersects);
    }
    rayCollisionCameraArray() {
        if (!this.scene) return '[]';
        if (!this.camera) return '[]';
        const ray = new Three.Raycaster();
        ray.setFromCamera(new Three.Vector2(), this.camera);
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '[]';
        //const result = this.raycastResultToReadable(intersects);
        return JSON.stringify(intersects);
    }

    rayCollisionDistance(args) {
        if (!this.scene) return '';
        const origin = new Three.Vector3(
            Cast.toNumber(args.X),
            Cast.toNumber(args.Y),
            Cast.toNumber(args.Z),
        );
        const direction = normalize(new Three.Vector3(
            toRad(Cast.toNumber(args.DX)),
            toRad(Cast.toNumber(args.DY)),
            toRad(Cast.toNumber(args.DZ)),
        ));
        const ray = new Three.Raycaster(origin, direction, 0, args.DIS);
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '';
        const first = intersects[0];
        return first.object.name;
    }
    rayCollisionArrayDistance(args) {
        if (!this.scene) return '[]';
        const origin = new Three.Vector3(
            Cast.toNumber(args.X),
            Cast.toNumber(args.Y),
            Cast.toNumber(args.Z),
        );
        const direction = normalize(new Three.Vector3(
            toRad(Cast.toNumber(args.DX)),
            toRad(Cast.toNumber(args.DY)),
            toRad(Cast.toNumber(args.DZ)),
        ));
        const ray = new Three.Raycaster(origin, direction, 0, args.DIS);
        const intersects = ray.intersectObjects(this.scene.children, true);
        if (intersects.length === 0) return '[]';
        const result = this.raycastResultToReadable(intersects);
        return JSON.stringify(result);
    }
    getObjectParent(args) {
        if (!this.scene) return '';
        const name = Cast.toString(args.NAME);
        const object = this.scene.getObjectByName(name);
        if (!object) return '';
        if (!object.parent) return '';
        return object.parent.name;
    }
}

module.exports = Jg3DBlocks;
