/* eslint-disable space-infix-ops */
const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const ImageURI = require('../../../extension-support/image-uri');
const Cast = require('../../../util/cast');
const MathUtil = require('../../../util/math-util');

// eslint-disable-next-line no-undef
const pathToMedia = 'static/blocks-media'; // ScratchBlocks.mainWorkspace.options.pathToMedia
const stateKey = 'CAMERA_INFO';
const defaultState = 'default';

class PenguinModCamera {
    constructor(runtime) {
        this.runtime = runtime;

        runtime.setRuntimeOptions({
            fencing: false
        });
    }
    getCamera(target) {
        return this.runtime.getCamera(this.getActiveCamera(target));
    }
    updateCamera(target, state) {
        this.runtime.updateCamera(this.getActiveCamera(target), state);
    }
    getActiveCamera(target) {
        let cameraState = target._customState[stateKey];
        if (!cameraState) {
            cameraState = target.cameraBound || defaultState;
            target.setCustomState(stateKey, cameraState);
        }
        return cameraState;
    }
    setActiveCamera(target, screen) {
        target.setCustomState(stateKey, screen);
    }
    getInfo() {
        return {
            id: 'pmCamera',
            name: 'Camera (OLD)',
            color: '#0586FF',
            blocks: [
                {
                    opcode: 'moveSteps',
                    blockType: BlockType.COMMAND,
                    text: 'move camera [STEPS] steps',
                    arguments: {
                        STEPS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        }
                    }
                },
                {
                    opcode: 'turnRight',
                    blockType: BlockType.COMMAND,
                    text: 'turn camera [DIRECTION] [DEGREES] degrees',
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ROTATE_RIGHT
                        },
                        DEGREES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '15'
                        }
                    }
                },
                {
                    opcode: 'turnLeft',
                    blockType: BlockType.COMMAND,
                    text: 'turn camera [DIRECTION] [DEGREES] degrees',
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.IMAGE,
                            dataURI: ImageURI.ROTATE_LEFT
                        },
                        DEGREES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '15'
                        }
                    }
                },
                {
                    opcode: 'bindTarget',
                    blockType: BlockType.COMMAND,
                    text: 'bind [TARGET] to camera [SCREEN]',
                    arguments: {
                        TARGET: {
                            type: ArgumentType.STRING,
                            menu: 'BINDABLE_TARGETS'
                        },
                        SCREEN: {
                            type: ArgumentType.STRING,
                            defaultValue: defaultState
                        }
                    }
                },
                {
                    opcode: 'unbindTarget',
                    blockType: BlockType.COMMAND,
                    text: 'unbind [TARGET] from the camera',
                    arguments: {
                        TARGET: {
                            type: ArgumentType.STRING,
                            menu: 'BINDABLE_TARGETS'
                        }
                    }
                },
                {
                    opcode: 'setCurrentCamera',
                    blockType: BlockType.COMMAND,
                    text: 'set current camera to [SCREEN]',
                    arguments: {
                        SCREEN: {
                            type: ArgumentType.STRING,
                            defaultValue: defaultState
                        }
                    }
                },
                {
                    opcode: 'setRenderImediat',
                    blockType: BlockType.COMMAND,
                    text: 'set render mode to [RENDER_MODE]',
                    arguments: {
                        RENDER_MODE: {
                            type: ArgumentType.STRING,
                            menu: 'RENDER_MODES'
                        }
                    }
                },
                {
                    opcode: 'manualRender',
                    blockType: BlockType.COMMAND,
                    text: 'render camera'
                },
                '---',
                {
                    opcode: 'gotoXY',
                    blockType: BlockType.COMMAND,
                    text: 'set camera x: [X] y: [Y]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'setSize',
                    blockType: BlockType.COMMAND,
                    text: 'set camera zoom to [ZOOM]%',
                    arguments: {
                        ZOOM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '100'
                        }
                    }
                },
                {
                    opcode: 'changeSize',
                    blockType: BlockType.COMMAND,
                    text: 'change camera zoom by [ZOOM]%',
                    arguments: {
                        ZOOM: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        }
                    }
                },
                '---',
                {
                    opcode: 'pointTowards',
                    blockType: BlockType.COMMAND,
                    text: 'point camera in direction [DIRECTION]',
                    arguments: {
                        DIRECTION: {
                            type: ArgumentType.ANGLE,
                            defaultValue: '90'
                        }
                    }
                },
                {
                    opcode: 'pointTowardsPoint',
                    blockType: BlockType.COMMAND,
                    text: 'point camera towards x: [X] y: [Y]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                '---',
                {
                    opcode: 'changeXpos',
                    blockType: BlockType.COMMAND,
                    text: 'change camera x by [X]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        }
                    }
                },
                {
                    opcode: 'setXpos',
                    blockType: BlockType.COMMAND,
                    text: 'set camera x to [X]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'changeYpos',
                    blockType: BlockType.COMMAND,
                    text: 'change camera y by [Y]',
                    arguments: {
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '10'
                        }
                    }
                },
                {
                    opcode: 'setYpos',
                    blockType: BlockType.COMMAND,
                    text: 'set camera y to [Y]',
                    arguments: {
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: '0'
                        }
                    }
                },
                '---',
                {
                    opcode: 'xPosition',
                    blockType: BlockType.REPORTER,
                    text: 'camera x'
                },
                {
                    opcode: 'yPosition',
                    blockType: BlockType.REPORTER,
                    text: 'camera y'
                },
                {
                    opcode: 'direction',
                    blockType: BlockType.REPORTER,
                    text: 'camera direction'
                },
                {
                    // theres also a property named "size" so this one is special
                    opcode: 'getSize',
                    blockType: BlockType.REPORTER,
                    text: 'camera zoom'
                },
                {
                    opcode: 'getCurrentCamera',
                    blockType: BlockType.REPORTER,
                    text: 'current camera'
                }
            ],
            menus: {
                BINDABLE_TARGETS: {
                    items: 'getBindableTargets',
                    acceptReports: true
                },
                RENDER_MODES: {
                    items: [
                        'immediate',
                        'manual'
                    ]
                }
            }
        };
    }
    getBindableTargets() {
        const targets = this.runtime.targets
            .filter(target => !target.isStage && target.isOriginal && target.id !== this.runtime.vm.editingTarget)
            .map(target => target.getName());
        return [].concat([
            { text: 'this sprite', value: '__MYSELF__' },
            { text: 'mouse-pointer', value: '__MOUSEPOINTER__' },
            { text: 'backdrop', value: '__STAGE__' },
            { text: 'all sprites', value: '__ALL__' }
        ], targets);
    }
    moveSteps({ STEPS }, util) {
        const { pos: [x, y], dir } = this.getCamera(util.target);
        const radians = MathUtil.degToRad(dir);
        const dx = STEPS * Math.cos(radians);
        const dy = STEPS * Math.sin(radians);
        this.updateCamera(util.target, { pos: [x + dx, y + dy] });
    }
    turnRight({ DEGREES }, util) {
        const { dir } = this.getCamera(util.target);
        this.updateCamera(util.target, { dir: dir - DEGREES });
    }
    turnLeft({ DEGREES }, util) {
        const { dir } = this.getCamera(util.target);
        this.updateCamera(util.target, { dir: dir + DEGREES });
    }
    bindTarget({ TARGET, SCREEN }, util) {
        if (!SCREEN) throw new Error('target screen MUST not be blank');
        switch (TARGET) {
        case '__MYSELF__':
            const myself = util.target;
            myself.bindToCamera(SCREEN);
            this.setActiveCamera(myself, SCREEN);
            break;
        case '__MOUSEPOINTER__':
            switch (SCREEN) {
                case 'default': SCREEN = this.runtime.renderer.camera.defaultName; break;
            }
            util.ioQuery('mouse', 'bindToCamera', [SCREEN]);
            break;
        /*
        case '__PEN__':
            const pen = this.runtime.ext_pen;
            if (!pen) break;
            pen.bindToCamera(SCREEN);
            break;
            */
        case '__STAGE__':
            const stage = this.runtime.getTargetForStage();
            stage.bindToCamera(SCREEN);
            break;
        case '__ALL__':
            for (const target of this.runtime.targets) {
                target.bindToCamera(SCREEN);
            }
            break;
        default:
            const sprite = this.runtime.getSpriteTargetByName(TARGET);
            if (!sprite) throw `unkown target ${TARGET}`;
            sprite.bindToCamera(SCREEN);
            break;
        }
    }
    unbindTarget({ TARGET }, util) {
        switch (TARGET) {
        case '__MYSELF__': {
            const myself = util.target;
            myself.removeCameraBinding();
            break;
        }
        case '__MOUSEPOINTER__':
            util.ioQuery('mouse', 'removeCameraBinding');
            break;
        /*
        case '__PEN__': {
            const pen = this.runtime.ext_pen;
            if (!pen) break;
            pen.removeCameraBinding();
            break;
        }
        */
        case '__STAGE__': {
            const stage = this.runtime.getTargetForStage();
            stage.removeCameraBinding();
            break;
        }
        case '__ALL__':
            for (const target of this.runtime.targets) {
                target.removeCameraBinding();
            }
            break;
        default: {
            const sprite = this.runtime.getSpriteTargetByName(TARGET);
            if (!sprite) throw `unkown target ${TARGET}`;
            sprite.removeCameraBinding();
            break;
        }
        }
    }
    setCurrentCamera({ SCREEN }, util) {
        if (!SCREEN) throw new Error('target screen MUST not be blank');
        this.setActiveCamera(util.target, SCREEN);
    }
    setRenderImediat({ RENDER_MODE }, util) {
        // possibly add more render modes?
        switch (RENDER_MODE) {
        case 'immediate':
            this.updateCamera(util.target, { silent: false });
            break;
        case 'manual':
            this.updateCamera(util.target, { silent: true });
            break;
        }
    }
    manualRender(_, util) {
        this.runtime.emitCameraChanged(this.getActiveCamera(util.target));
    }

    gotoXY({ X, Y }, util) {
        this.updateCamera(util.target, { pos: [X, Y] });
    }
    setSize({ ZOOM }, util) {
        this.updateCamera(util.target, { scale: ZOOM / 100 });
    }
    changeSize({ ZOOM }, util) {
        const { scale } = this.getCamera(util.target);
        this.updateCamera(util.target, { scale: (ZOOM / 100) + scale });
    }

    pointTowards({ DIRECTION }, util) {
        this.updateCamera(util.target, { dir: DIRECTION -90 });
    }
    pointTowardsPoint({ X, Y }, util) {
        const { pos: [x, y] } = this.getCamera(util.target);
        this.updateCamera(util.target, { dir: MathUtil.radToDeg(Math.atan2(X-x, Y-y)) });
    }

    changeXpos({ X }, util) {
        const { pos: [x, y] } = this.getCamera(util.target);
        this.updateCamera(util.target, { pos: [X+x, y] });
    }
    setXpos({ X }, util) {
        const { pos: [_, y] } = this.getCamera(util.target);
        this.updateCamera(util.target, { pos: [X, y] });
    }
    changeYpos({ Y }, util) {
        const { pos: [x, y] } = this.getCamera(util.target);
        this.updateCamera(util.target, { pos: [x, Y+y] });
    }
    setYpos({ Y }, util) {
        const { pos: [x, _] } = this.getCamera(util.target);
        this.updateCamera(util.target, { pos: [x, Y] });
    }

    xPosition(_, util) {
        const state = this.getCamera(util.target);
        return state.pos[0];
    }
    yPosition(_, util) {
        const state = this.getCamera(util.target);
        return state.pos[1];
    }
    direction(_, util) {
        const state = this.getCamera(util.target);
        return state.dir +90;
    }
    getSize(_, util) {
        const state = this.getCamera(util.target);
        return state.scale * 100;
    }
    getCurrentCamera(_, util) {
        return this.getActiveCamera(util.target);
    }
}

module.exports = PenguinModCamera;
