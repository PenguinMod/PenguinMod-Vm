// Most of the blocks here are from More Motion by NexusKitten:
// https://scratch.mit.edu/users/NamelessCat/
// https://github.com/NexusKitten

const BlockType = require('../../../extension-support/block-type');
const ArgumentType = require('../../../extension-support/argument-type');
const TargetType = require('../../../extension-support/target-type');
const Clone = require('../../../util/clone');
const Cast = require('../../../util/cast');

const template = {
    extensions: ["colours_motion"],
    filter: [TargetType.SPRITE]
};

/**
 * Class of idk
 * @constructor
 */
class pmMotionExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;

        this.spriteHomes = {};
        this.cloneHomes = {};
    }

    /**
     * @returns {object} metadata for extension
     */
    getInfo() {
        return {
            id: 'pmMotionExpansion',
            name: 'Motion Expansion',
            color: '#4C97FF',
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: "Stage selected: no motion blocks",
                    filter: [TargetType.STAGE]
                },
                {
                    opcode: "setHome",
                    blockType: BlockType.COMMAND,
                    text: "set my home",
                    ...template
                },
                {
                    opcode: "gotoHome",
                    blockType: BlockType.COMMAND,
                    text: "go to home",
                    ...template
                },
                "---",
                {
                    opcode: "steptowards",
                    blockType: BlockType.COMMAND,
                    text: "move [STEPS] steps towards x: [X] y: [Y]",
                    arguments: {
                        STEPS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "10",
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                    },
                    ...template
                },
                {
                    opcode: "tweentowards",
                    blockType: BlockType.COMMAND,
                    text: "move [PERCENT]% of the way to x: [X] y: [Y]",
                    arguments: {
                        PERCENT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "10",
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                    },
                    ...template
                },
                "---",
                {
                    opcode: "fence",
                    blockType: BlockType.COMMAND,
                    text: "manually fence",
                    ...template
                },
                "---",
                {
                    opcode: "rotationStyle",
                    blockType: BlockType.REPORTER,
                    text: "rotation style",
                    disableMonitor: true,
                    ...template
                },
                {
                    opcode: "touchingxy",
                    blockType: BlockType.BOOLEAN,
                    text: "touching x: [X] y: [Y]?",
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "0",
                        },
                    },
                    ...template
                },
                {
                    opcode: "touchingrect",
                    blockType: BlockType.BOOLEAN,
                    text: "touching rectangle x1: [X1] y1: [Y1] x2: [X2] y2: [Y2]?",
                    arguments: {
                        X1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "-100",
                        },
                        Y1: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "-100",
                        },
                        X2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "100",
                        },
                        Y2: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "100",
                        },
                    },
                    ...template
                },
            ]
        };
    }

    rotationStyle(_, util) {
        return util.target.rotationStyle;
    }

    fence(_, util) {
        const newpos = this.runtime.renderer.getFencedPositionOfDrawable(
            util.target.drawableID,
            [util.target.x, util.target.y]
        );
        util.target.setXY(newpos[0], newpos[1]);
    }

    steptowards(args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const steps = Cast.toNumber(args.STEPS);
        const val =
            steps / Math.sqrt((x - util.target.x) ** 2 + (y - util.target.y) ** 2);
        if (val >= 1) {
            util.target.setXY(x, y);
        } else {
            util.target.setXY(
                (x - util.target.x) * val + util.target.x,
                (y - util.target.y) * val + util.target.y
            );
        }
    }

    tweentowards(args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const val = Cast.toNumber(args.PERCENT);
        // Essentially a smooth glide script.
        util.target.setXY(
            (x - util.target.x) * (val / 100) + util.target.x,
            (y - util.target.y) * (val / 100) + util.target.y
        );
    }

    touchingrect(args, util) {
        let left = Cast.toNumber(args.X1);
        let right = Cast.toNumber(args.X2);
        let bottom = Cast.toNumber(args.Y1);
        let top = Cast.toNumber(args.Y2);

        // Fix argument order if they got it backwards
        if (left > right) {
            let temp = left;
            left = right;
            right = temp;
        }
        if (bottom > top) {
            let temp = bottom;
            bottom = top;
            bottom = temp;
        }

        const drawable = this.runtime.renderer._allDrawables[util.target.drawableID];
        if (!drawable) {
            return false;
        }

        // See renderer.isTouchingDrawables

        const drawableBounds = drawable.getFastBounds();
        drawableBounds.snapToInt();

        const Rectangle = this.runtime.renderer.exports.Rectangle;
        const containsBounds = new Rectangle();
        containsBounds.initFromBounds(left, right, bottom, top);
        containsBounds.snapToInt();

        if (!containsBounds.intersects(drawableBounds)) {
            return false;
        }

        drawable.updateCPURenderAttributes();

        const intersectingBounds = Rectangle.intersect(
            drawableBounds,
            containsBounds
        );
        for (let x = intersectingBounds.left; x < intersectingBounds.right; x++) {
            for (
                let y = intersectingBounds.bottom;
                y < intersectingBounds.top;
                y++
            ) {
                // technically should be a twgl vec3, but does not actually need to be
                if (drawable.isTouching([x, y])) {
                    return true;
                }
            }
        }
        return false;
    }

    touchingxy(args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const drawable = this.runtime.renderer._allDrawables[util.target.drawableID];
        if (!drawable) {
            return false;
        }
        // Position should technically be a twgl vec3, but it doesn't actually need to be
        drawable.updateCPURenderAttributes();
        return drawable.isTouching([x, y]);
    }

    setHome(_, util) {
        const target = util.target;
        if (target.isStage) return;
        // this is all of the sprite specific data we will save
        // variables are a bit too far, and most other data is stage only or shouldnt be overwritten
        const savedState = {
            x: target.x,
            y: target.y,
            size: target.size,
            stretch: Clone.simple(target.stretch), // array
            direction: target.direction,
            rotationStyle: target.rotationStyle,
            visible: target.visible,
            effects: Clone.simple(target.effects), // object
            blendMode: target.blendMode,
            draggable: target.draggable,
            currentCostume: target.currentCostume,
            tintColor: target.tintColor,
            volume: target.volume
        };
        if (target.isOriginal) {
            const name = target.getName();
            this.spriteHomes[name] = savedState;
            return;
        }
        this.cloneHomes[target.id] = savedState;
    }
    gotoHome(_, util) {
        const target = util.target;
        if (target.isStage) return;
        const identifier = target.isOriginal ? target.getName() : target.id;
        const homeTable = target.isOriginal ? this.spriteHomes : this.cloneHomes;
        // dont do anything if theres no name in here
        if (!(identifier in homeTable)) {
            return;
        }
        const homeState = homeTable[identifier];
        if (!homeState) {
            return;
        }
        // set state
        target.setXY(homeState.x, homeState.y);
        target.setSize(homeState.size);
        target.setStretch(...homeState.stretch);
        target.setDirection(homeState.direction);
        target.setRotationStyle(homeState.rotationStyle);
        target.setVisible(homeState.visible);
        if (homeState.effects) {
            for (const effectName in homeState.effects) {
                const value = homeState.effects[effectName];
                target.setEffect(effectName, value);
            }
        }
        target.setBlendMode(homeState.blendMode);
        target.setDraggable(homeState.draggable);
        target.setCostume(homeState.currentCostume);
        target.volume = homeState.volume;
        this.runtime.requestRedraw();
    }
}

module.exports = pmMotionExpansion;
