const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');

class Scratch3MotionBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            motion_movesteps: this.moveSteps,
            motion_gotoxy: this.goToXY,
            motion_goto: this.goTo,
            motion_turnright: this.turnRight,
            motion_turnleft: this.turnLeft,
            motion_pointindirection: this.pointInDirection,
            motion_pointtowards: this.pointTowards,
            motion_glidesecstoxy: this.glide,
            motion_glideto: this.glideTo,
            motion_ifonedgebounce: this.ifOnEdgeBounce,
            motion_setrotationstyle: this.setRotationStyle,
            motion_changexby: this.changeX,
            motion_setx: this.setX,
            motion_changeyby: this.changeY,
            motion_sety: this.setY,
            motion_xposition: this.getX,
            motion_yposition: this.getY,
            motion_direction: this.getDirection,

            // Legacy no-op blocks:
            motion_scroll_right: () => {},
            motion_scroll_up: () => {},
            motion_align_scene: () => {},
            motion_xscroll: () => {},
            motion_yscroll: () => {},

            // old pm blocks or something
            motion_ifonxybounce: this.ifOnXYBounce,
            motion_ifonspritebounce: this.ifOnSpriteBounce,
        };
    }

    getMonitored () {
        return {
            motion_xposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_xposition`
            },
            motion_yposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_yposition`
            },
            motion_direction: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_direction`
            }
        };
    }

    moveSteps (args, util) {
        const steps = Cast.toNumber(args.STEPS);
        this._moveSteps(steps, util.target);
    }
    _moveSteps (steps, target, angleOffset = 0) { // used by compiler
        const radians = MathUtil.degToRad(90 - target.direction - angleOffset);
        const dx = steps * Math.cos(radians);
        const dy = steps * Math.sin(radians);
        target.setXY(target.x + dx, target.y + dy);
    }

    goToXY (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        util.target.setXY(x, y);
    }

    getTargetXY (targetName, util) {
        let targetX = 0;
        let targetY = 0;
        if (targetName === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else if (targetName === '_random_') {
            const stageWidth = this.runtime.stageWidth;
            const stageHeight = this.runtime.stageHeight;
            targetX = Math.round(stageWidth * (Math.random() - 0.5));
            targetY = Math.round(stageHeight * (Math.random() - 0.5));
        } else {
            targetName = Cast.toString(targetName);
            const goToTarget = this.runtime.getSpriteTargetByName(targetName);
            if (!goToTarget) return;
            targetX = goToTarget.x;
            targetY = goToTarget.y;
        }
        return [targetX, targetY];
    }

    goTo (args, util) {
        const targetXY = this.getTargetXY(args.TO, util);
        if (targetXY) {
            util.target.setXY(targetXY[0], targetXY[1]);
        }
    }

    turnRight (args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction + degrees);
    }

    turnLeft (args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction - degrees);
    }

    pointInDirection (args, util) {
        const direction = Cast.toNumber(args.DIRECTION);
        util.target.setDirection(direction);
    }

    pointTowards (args, util) {
        let targetX = 0;
        let targetY = 0;
        if (args.TOWARDS === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else if (args.TOWARDS === '_random_') {
            util.target.setDirection(Math.round(Math.random() * 360) - 180);
            return;
        } else {
            args.TOWARDS = Cast.toString(args.TOWARDS);
            const pointTarget = this.runtime.getSpriteTargetByName(args.TOWARDS);
            if (!pointTarget) return;
            targetX = pointTarget.x;
            targetY = pointTarget.y;
        }

        const dx = targetX - util.target.x;
        const dy = targetY - util.target.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        util.target.setDirection(direction);
    }

    _pointTowards(target, x, y) {
        const dx = x - target.x;
        const dy = y - target.y;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        target.setDirection(direction);
    }

    glide (args, util) {
        if (util.stackFrame.timer) {
            const timeElapsed = util.stackFrame.timer.timeElapsed();
            if (timeElapsed < util.stackFrame.duration * 1000) {
                // In progress: move to intermediate position.
                const frac = timeElapsed / (util.stackFrame.duration * 1000);
                const dx = frac * (util.stackFrame.endX - util.stackFrame.startX);
                const dy = frac * (util.stackFrame.endY - util.stackFrame.startY);
                util.target.setXY(
                    util.stackFrame.startX + dx,
                    util.stackFrame.startY + dy
                );
                util.yield();
            } else {
                // Finished: move to final position.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
            }
        } else {
            // First time: save data for future use.
            util.stackFrame.timer = new Timer();
            util.stackFrame.timer.start();
            util.stackFrame.duration = Cast.toNumber(args.SECS);
            util.stackFrame.startX = util.target.x;
            util.stackFrame.startY = util.target.y;
            util.stackFrame.endX = Cast.toNumber(args.X);
            util.stackFrame.endY = Cast.toNumber(args.Y);
            if (util.stackFrame.duration <= 0) {
                // Duration too short to glide.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
                return;
            }
            util.yield();
        }
    }

    glideTo (args, util) {
        const targetXY = this.getTargetXY(args.TO, util);
        if (targetXY) {
            this.glide({SECS: args.SECS, X: targetXY[0], Y: targetXY[1]}, util);
        }
    }

    ifOnEdgeBounce (args, util) {
        this._ifOnEdgeBounce(util.target);
    }
    _ifOnEdgeBounce (target) { // used by compiler
        const bounds = target.getBounds();
        if (!bounds) {
            return;
        }
        // Measure distance to edges.
        // Values are positive when the sprite is far away,
        // and clamped to zero when the sprite is beyond.
        const stageWidth = this.runtime.stageWidth;
        const stageHeight = this.runtime.stageHeight;
        const distLeft = Math.max(0, (stageWidth / 2) + bounds.left);
        const distTop = Math.max(0, (stageHeight / 2) - bounds.top);
        const distRight = Math.max(0, (stageWidth / 2) - bounds.right);
        const distBottom = Math.max(0, (stageHeight / 2) + bounds.bottom);
        // Find the nearest edge.
        let nearestEdge = '';
        let minDist = Infinity;
        if (distLeft < minDist) {
            minDist = distLeft;
            nearestEdge = 'left';
        }
        if (distTop < minDist) {
            minDist = distTop;
            nearestEdge = 'top';
        }
        if (distRight < minDist) {
            minDist = distRight;
            nearestEdge = 'right';
        }
        if (distBottom < minDist) {
            minDist = distBottom;
            nearestEdge = 'bottom';
        }
        if (minDist > 0) {
            return; // Not touching any edge.
        }
        // Point away from the nearest edge.
        const radians = MathUtil.degToRad(90 - target.direction);
        let dx = Math.cos(radians);
        let dy = -Math.sin(radians);
        if (nearestEdge === 'left') {
            dx = Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'top') {
            dy = Math.max(0.2, Math.abs(dy));
        } else if (nearestEdge === 'right') {
            dx = 0 - Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'bottom') {
            dy = 0 - Math.max(0.2, Math.abs(dy));
        }
        const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
        target.setDirection(newDirection);
        // Keep within the stage.
        const fencedPosition = target.keepInFence(target.x, target.y);
        target.setXY(fencedPosition[0], fencedPosition[1]);
    }

    setRotationStyle (args, util) {
        util.target.setRotationStyle(args.STYLE);
    }

    changeX (args, util) {
        const dx = Cast.toNumber(args.DX);
        util.target.setXY(util.target.x + dx, util.target.y);
    }

    setX (args, util) {
        const x = Cast.toNumber(args.X);
        util.target.setXY(x, util.target.y);
    }

    changeY (args, util) {
        const dy = Cast.toNumber(args.DY);
        util.target.setXY(util.target.x, util.target.y + dy);
    }

    setY (args, util) {
        const y = Cast.toNumber(args.Y);
        util.target.setXY(util.target.x, y);
    }

    getX (args, util) {
        return this.limitPrecision(util.target.x);
    }

    getY (args, util) {
        return this.limitPrecision(util.target.y);
    }

    getDirection (args, util) {
        return util.target.direction;
    }

    // This corresponds to snapToInteger in Scratch 2
    limitPrecision (coordinate) {
        const rounded = Math.round(coordinate);
        const delta = coordinate - rounded;
        const limitedCoord = (Math.abs(delta) < 1e-9) ? rounded : coordinate;

        return limitedCoord;
    }

    _moveToStageSide (side, target) {
        let x = 0;
        let y = 0;
        if (side.includes("top")) {
            y = 1;
        }
        if (side.includes("bottom")) {
            y = -1;
        }
        if (side.includes("left")) {
            x = -1;
        }
        if (side.includes("right")) {
            x = 1;
        }
        const bounds = this.runtime.renderer._allDrawables[target.drawableID].getAABB();
        const width = this.runtime.stageWidth - bounds.width;
        const height = this.runtime.stageHeight - bounds.height;
        target.setXY(x * width / 2, y * height / 2);
    }

    _turnAroundPivot (degrees, x, y, target) {
        const radians = (Math.PI * degrees) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = target.x - x;
        const dy = target.y - y;
        target.setXY((cos * dx) - (sin * dy) + x, (cos * dy) + (sin * dx) + y);
    }
    
    ifOnXYBounce(args, util, _, __, ___, touchingCondition) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const target = util.target;
        const bounds = target.getBounds();
        if (!bounds) {
            return;
        }
        // Check to see if the point is inside the bounding box.
        const xInBounds = (x >= bounds.left) && (x <= bounds.right);
        const yInBounds = (y >= bounds.bottom) && (y <= bounds.top);
        if (touchingCondition !== true) {
            if (!(xInBounds && yInBounds)) {
                return; // Not inside the bounding box.
            }
        }
        // Find the distance to the point for all sides.
        // We use this to figure out which side to bounce on.
        let nearestEdge = '';
        let minDist = Infinity;
        for (let i = 0; i < 4; i++) {
            const sides = ['left', 'top', 'right', 'bottom'];
            let distx;
            let disty;
            switch (sides[i]) {
            case 'left':
            case 'right':
                distx = x - bounds[sides[i]];
                disty = y - target.y;
                break;
            case 'top':
            case 'bottom':
                distx = x - target.x;
                disty = y - bounds[sides[i]];
                break;
            }
            const distance = Math.sqrt((distx * distx) + (disty * disty));
            if (distance < minDist) {
                minDist = distance;
                nearestEdge = sides[i];
            }
        }
        // Point away from the nearest edge.
        const radians = MathUtil.degToRad(90 - target.direction);
        let dx = Math.cos(radians);
        let dy = -Math.sin(radians);
        if (nearestEdge === 'left') {
            dx = Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'top') {
            dy = Math.max(0.2, Math.abs(dy));
        } else if (nearestEdge === 'right') {
            dx = 0 - Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'bottom') {
            dy = 0 - Math.max(0.2, Math.abs(dy));
        }
        const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
        target.setDirection(newDirection);
        // Keep within the stage.
        const fencedPosition = target.keepInFence(target.x, target.y);
        target.setXY(fencedPosition[0], fencedPosition[1]);
    }
    
    ifOnSpriteBounce (args, util) {
        if (args.SPRITE === '_mouse_') {
            const x = util.ioQuery('mouse', 'getScratchX');
            const y = util.ioQuery('mouse', 'getScratchY');
            return this.ifOnXYBounce({ X: x, Y: y }, util);
        } else if (args.SPRITE === '_random_') {
            const stageWidth = this.runtime.stageWidth;
            const stageHeight = this.runtime.stageHeight;
            const x = Math.round(stageWidth * (Math.random() - 0.5));
            const y = Math.round(stageHeight * (Math.random() - 0.5));
            return this.ifOnXYBounce({ X: x, Y: y }, util);
        } 
        const spriteName = Cast.toString(args.SPRITE);
        const bounceTarget = this.runtime.getSpriteTargetByName(spriteName);
        if (!bounceTarget) return;
        const point = util.target.spriteTouchingPoint(spriteName);
        if (!point[0]) return;
        return this.ifOnXYBounce({ X: point[0], Y: point[1] }, util);
        
    }
}

module.exports = Scratch3MotionBlocks;
