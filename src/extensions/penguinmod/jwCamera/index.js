const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

function span(text) {
    let el = document.createElement('span');
    el.innerHTML = text;
    el.style.display = 'hidden';
    el.style.whiteSpace = 'nowrap';
    el.style.width = '100%';
    el.style.textAlign = 'center';
    return el
}

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
};

class CameraType {
    static default = new CameraType(vm.renderer.camera.defaultName);
    static unbinded = new CameraType(vm.renderer.camera.unbindedName);

    constructor(name) {
        this.name = name;

        if (!vm.renderer.camera.getState(name)) {
            vm.renderer.camera.createState(name);
        }
    }

    static toCamera(v) {
        if (v instanceof CameraType) return v;
        if (vm.renderer.camera.getState(v)) return new CameraType(v);
        return CameraType.unbinded;
    }

    toString() {
        switch (this.name) {
            case vm.renderer.camera.defaultName: return "__default__";
            case vm.renderer.camera.unbindedName: return "__unbinded__";
        }
        return this.name;
    }

    toReporterContent() {
        const root = document.createElement('div');
        root.style.display = "flex";
        root.style.flexDirection = "column";

        if (typeof this.name === "symbol") root.appendChild(span(`Camera&lt;<u>${this.name.description}</u>&gt;`));
        else root.appendChild(span(`Camera&lt;${escapeHTML(this.name)}&gt;`));

        const image = document.createElement('img');
        root.appendChild(image);
        image.style.width = "240px";
        image.style.height = "180px";
        image.style.border = "1px solid #77777777";
        image.style.borderRadius = "4px";

        vm.renderer.requestCameraSnapshot(this.name, uri => {
            if (uri === 'data:,') return;
            image.src = uri;
            image.style.width = null;
            image.style.height = null;
            image.style.maxWidth = "240px";
            image.style.maxHeight = "180px";
        });

        return root;
    }

    jwArrayHandler() {
        return this.toReporterContent().innerHTML;
    }

    setPosition(x, y) {
        vm.renderer.camera.setPosition(x, y, this.name);
        vm.runtime.requestRedraw();
    }

    getPosition() {
        return vm.renderer.camera.getPosition(this.name);
    }

    setSize(x, y) {
        vm.renderer.camera.setSize(x, y, this.name);
        vm.runtime.requestRedraw();
    }

    getSize() {
        return vm.renderer.camera.getSize(this.name);
    }

    setDirection(angle) {
        vm.renderer.camera.setDirection(angle, this.name);
        vm.runtime.requestRedraw();
    }

    getDirection() {
        return vm.renderer.camera.getDirection(this.name);
    }

    setVisible(visible) {
        vm.renderer.camera.setVisible(visible, this.name);
        vm.runtime.requestRedraw();
    }

    getVisible() {
        return vm.renderer.camera.getVisible(this.name);
    }

    bindTarget(target) {
        target.setCameraState(this.name);
    }

    static bindedCamera(target) {
        return new CameraType(target.getCameraState());
    }
}

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
};

let jwVector = {
    Type: class {},
    Block: {},
    Argument: {}
};

let jwTargets = {
    Type: class {},
    Block: {},
    Argument: {}
};

const jwCamera = {
    Type: CameraType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "jwCamera",
        disableMonitor: true
    },
    Argument: {
        check: ["jwCamera"],
        fillIn: "default"
    }
}

class Extension {
    constructor() {
        vm.runtime.setRuntimeOptions({
            fencing: false
        });

        vm.jwCamera = jwCamera;
        vm.runtime.registerSerializer(
            'jwCamera',
            v => typeof v.name === "symbol" ? [v.description] : v.name.toString(),
            v => {
                if (v instanceof Array) {
                    switch (v[0]) {
                        case "default": return CameraType.default;
                        case "unbinded": return CameraType.unbinded;
                    }
                }
                return new CameraType(v);
            }
        );

        vm.extensionManager.addExtensionDependency("jwCamera", "jwArray", () => jwArray = vm.jwArray);
        vm.extensionManager.addExtensionDependency("jwCamera", "jwVector", () => jwVector = vm.jwVector);
        vm.extensionManager.addExtensionDependency("jwCamera", "jwTargets", () => jwTargets = vm.jwTargets);
    }

    getInfo() {
        return {
            id: "jwCamera",
            name: "Camera",
            color: "#0586ff",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDQsIDEwNywgMjA0KTsgZmlsbDogcmdiKDUsIDEzNCwgMjU1KTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOS41IiByeT0iOS41Ij48L2VsbGlwc2U+CiAgPHBhdGggZD0iTSA1Ljc3OSA2LjQ4MyBDIDUuMDAzIDYuNDgzIDQuMzcyIDcuMTEzIDQuMzcyIDcuODkgTCA0LjM3MiAxMi4xMSBDIDQuMzcyIDEyLjg4NyA1LjAwMyAxMy41MTcgNS43NzkgMTMuNTE3IEwgMTEuNDA3IDEzLjUxNyBDIDEyLjE4NCAxMy41MTcgMTIuODE0IDEyLjg4NyAxMi44MTQgMTIuMTEgTCAxNS42MjggMTMuNTE3IEwgMTUuNjI4IDYuNDgzIEwgMTIuODE0IDcuODkgQyAxMi44MTQgNy4xMTMgMTIuMTg0IDYuNDgzIDExLjQwNyA2LjQ4MyBMIDUuNzc5IDYuNDgzIFoiIHN0cm9rZS13aWR0aD0iMC41IiBmaWxsPSIjZmZmIiBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2UtbGluZWNhcDogcm91bmQ7Ij48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: "default",
                    text: "default camera",
                    ...jwCamera.Block
                },
                {
                    opcode: "unbinded",
                    text: "unbinded camera",
                    ...jwCamera.Block
                },
                {
                    opcode: "ofName",
                    text: "[NAME] camera",
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "named"
                        }
                    },
                    ...jwCamera.Block
                },
                "---",
                {
                    opcode: "setPosition",
                    blockType: BlockType.COMMAND,
                    text: "set position of [CAMERA] to [VECTOR]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        VECTOR: jwVector.Argument
                    }
                },
                {
                    opcode: "setSizeN",
                    blockType: BlockType.COMMAND,
                    text: "set size of [CAMERA] to [AMOUNT]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    }
                },
                {
                    opcode: "setSize",
                    blockType: BlockType.COMMAND,
                    text: "set size of [CAMERA] to [VECTOR]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        VECTOR: jwVector.Argument
                    }
                },
                {
                    opcode: "setDirection",
                    blockType: BlockType.COMMAND,
                    text: "set direction of [CAMERA] to [ANGLE]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    }
                },
                {
                    opcode: "setVisible",
                    blockType: BlockType.COMMAND,
                    text: "set visibility of [CAMERA] to [VISIBLE]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        VISIBLE: {
                            type: ArgumentType.BOOLEAN
                        }
                    }
                },
                "---",
                {
                    opcode: "getPosition",
                    text: "position of [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    },
                    ...jwVector.Block
                },
                {
                    opcode: "getSize",
                    text: "size of [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    },
                    ...jwVector.Block
                },
                {
                    opcode: "getDirection",
                    blockType: BlockType.REPORTER,
                    text: "direction of [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    }
                },
                {
                    opcode: "getVisible",
                    blockType: BlockType.BOOLEAN,
                    text: "is [CAMERA] visible?",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    }
                },
                "---",
                {
                    opcode: "bindTarget",
                    blockType: BlockType.COMMAND,
                    text: "bind [TARGET] to [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument,
                        TARGET: jwTargets.Argument
                    }
                },
                {
                    opcode: "unbindTarget",
                    blockType: BlockType.COMMAND,
                    text: "unbind [TARGET]",
                    arguments: {
                        TARGET: jwTargets.Argument
                    }
                },
                {
                    opcode: "bindedCamera",
                    text: "camera binded to [TARGET]",
                    arguments: {
                        TARGET: jwTargets.Argument
                    },
                    ...jwCamera.Block
                },
                {
                    opcode: "bindedTargets",
                    text: "targets binded to [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    },
                    ...jwArray.Block
                },
                "---",
                {
                    opcode: "bindMouse",
                    blockType: BlockType.COMMAND,
                    text: "bind mouse to [CAMERA]",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    }
                },
                {
                    opcode: "unbindMouse",
                    blockType: BlockType.COMMAND,
                    text: "unbind mouse"
                },
                {
                    opcode: "bindedMouse",
                    text: "camera binded to mouse",
                    arguments: {
                        CAMERA: jwCamera.Argument
                    },
                    ...jwCamera.Block
                }
            ]
        }
    }

    default() {
        return jwCamera.Type.default;
    }

    unbinded() {
        return jwCamera.Type.unbinded;
    }

    ofName({NAME}) {
        NAME = Cast.toString(NAME);
        return new jwCamera.Type(NAME);
    }

    setPosition({CAMERA, VECTOR}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        VECTOR = jwVector.Type.toVector(VECTOR);

        CAMERA.setPosition(VECTOR.x, VECTOR.y);
    }

    setSizeN({CAMERA, AMOUNT}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        AMOUNT = Cast.toNumber(AMOUNT);
        CAMERA.setSize(AMOUNT, AMOUNT);
    }

    setSize({CAMERA, VECTOR}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        VECTOR = jwVector.Type.toVector(VECTOR);
        CAMERA.setSize(VECTOR.x, VECTOR.y);
    }

    setDirection({CAMERA, ANGLE}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        ANGLE = Cast.toNumber(ANGLE);
        CAMERA.setDirection(ANGLE);
    }

    setVisible({CAMERA, VISIBLE}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        VISIBLE = Cast.toBoolean(VISIBLE);
        CAMERA.setVisible(VISIBLE);
    }

    getPosition({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        return new jwVector.Type(...CAMERA.getPosition());
    }

    getSize({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        return new jwVector.Type(...CAMERA.getSize());
    }

    getDirection({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        return CAMERA.getDirection();
    }

    getVisible({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        return CAMERA.getVisible();
    }

    bindTarget({CAMERA, TARGET}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        TARGET = jwTargets.Type.toTarget(TARGET);
        if (!TARGET.target) return;
        CAMERA.bindTarget(TARGET.target);
    }

    unbindTarget({TARGET}) {
        TARGET = jwTargets.Type.toTarget(TARGET);
        if (!TARGET.target) return;
        jwCamera.Type.unbinded.bindTarget(TARGET.target);
    }

    bindedCamera({TARGET}) {
        TARGET = jwTargets.Type.toTarget(TARGET);
        if (!TARGET.target) return jwCamera.Type.unbinded;
        return jwCamera.Type.bindedCamera(TARGET.target);
    }

    bindedTargets({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        return new jwArray.Type(vm.runtime.targets.filter(v => vm.renderer._allDrawables[v.drawableID].cameraState === CAMERA.name).map(v => new jwTargets.Type(v.id)));
    }

    bindMouse({CAMERA}) {
        CAMERA = jwCamera.Type.toCamera(CAMERA);
        vm.runtime.ioDevices.mouse.bindToCamera(CAMERA.name);
    }

    unbindMouse() {
        vm.runtime.ioDevices.mouse.removeCameraBinding();
    }

    bindedMouse() {
        return new jwCamera.Type(vm.runtime.ioDevices.mouse.cameraBound);
    }
}

module.exports = Extension;