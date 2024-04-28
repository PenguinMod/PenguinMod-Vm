const MathUtil = require('../util/math-util');
const { translateScreenPos } = require('../util/pos-math');

const roundToThreeDecimals = number => Math.round(number * 1000) / 1000;

class Mouse {
    constructor (runtime) {
        this._clientX = 0;
        this._clientY = 0;
        this._scratchX = 0;
        this._scratchY = 0;
        this._scrollDeltaY = 0;
        this._buttons = new Set();
        this.usesRightClickDown = false;
        this._isDown = false;
        // pm: keep track of clicks
        this._isClicked = false;
        this._clickId = 0;

        this.cameraBound = null;
        /**
         * Reference to the owning Runtime.
         * Can be used, for example, to activate hats.
         * @type{!Runtime}
         */
        this.runtime = runtime;
    }

    bindToCamera(screen) {
        this.cameraBound = screen;
    }

    removeCameraBinding() {
        this.cameraBound = null;
    }

    /**
     * Activate "event_whenthisspriteclicked" hats.
     * @param  {Target} target to trigger hats on.
     * @private
     */
    _activateClickHats (target) {
        // Activate both "this sprite clicked" and "stage clicked"
        // They were separated into two opcodes for labeling,
        // but should act the same way.
        // Intentionally not checking isStage to make it work when sharing blocks.
        this.runtime.startHats('event_whenthisspriteclicked', null, target);
        this.runtime.startHats('event_whenstageclicked', null, target);
        if (target.isStage) {
            this.runtime.startHats('pmEventsExpansion_whenSpriteClicked', { SPRITE: '_stage_' });
            return;
        }
        if (target.sprite) {
            this.runtime.startHats('pmEventsExpansion_whenSpriteClicked', { SPRITE: target.sprite.name });
        }
    }

    /**
     * Find a target by XY location
     * @param  {number} x X position to be sent to the renderer.
     * @param  {number} y Y position to be sent to the renderer.
     * @return {Target} the target at that location
     * @private
     */
    _pickTarget(x, y) {
        if (this.runtime.renderer) {
            const drawableID = this.runtime.renderer.pick(x, y);
            const target = this.runtime.targets.find(target => target.drawableID === drawableID);
            if (target) return target;
        }
        // Return the stage if no target was found
        return this.runtime.getTargetForStage();
    }

    /**
     * Mouse DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        this._scrollDeltaY = data.deltaY;
        if (typeof data.x === 'number') {
            this._clientX = data.x;
            this._scratchX = MathUtil.clamp(
                this.runtime.stageWidth * ((data.x / data.canvasWidth) - 0.5),
                -(this.runtime.stageWidth / 2),
                (this.runtime.stageWidth / 2)
            );
        }
        if (typeof data.y === 'number') {
            this._clientY = data.y;
            this._scratchY = MathUtil.clamp(
                -this.runtime.stageHeight * ((data.y / data.canvasHeight) - 0.5),
                -(this.runtime.stageHeight / 2),
                (this.runtime.stageHeight / 2)
            );
        }
        if (typeof data.isDown !== 'undefined') {
            // If no button specified, default to left button for compatibility
            const button = typeof data.button === 'undefined' ? 0 : data.button;
            if (data.isDown) {
                this._buttons.add(button);
            } else {
                this._buttons.delete(button);
            }

            const previousDownState = this._isDown;
            this._isDown = data.isDown;
            if (data.isDown) {
                this._isClicked = true;
                // increment click id
                this._clickId++;
                if (this._clickId > 16777216) {
                    this._clickId = 0;
                }
            }
            const thisClickId = this._clickId;
            // reset after 2 ticks
            this.runtime.once("RUNTIME_STEP_START", () => {
                this.runtime.once("RUNTIME_STEP_START", () => {
                    // check if click id is equal (otherwise we clicked this frame too)
                    if (thisClickId !== this._clickId) return;
                    this._isClicked = false;
                });
            });

            // Do not trigger if down state has not changed
            if (previousDownState === this._isDown) return;

            // Never trigger click hats at the end of a drag
            if (data.wasDragged) return;

            // Do not activate click hats for clicks outside canvas bounds
            if (!(data.x > 0 && data.x < data.canvasWidth &&
                data.y > 0 && data.y < data.canvasHeight)) return;

            const target = this._pickTarget(data.x, data.y);
            const isNewMouseDown = !previousDownState && this._isDown;
            const isNewMouseUp = previousDownState && !this._isDown;

            // Draggable targets start click hats on mouse up.
            // Non-draggable targets start click hats on mouse down.
            if (target.draggable && isNewMouseUp) {
                this._activateClickHats(target);
            } else if (!target.draggable && isNewMouseDown) {
                this._activateClickHats(target);
            }
        }
    }

    /**
     * Get the X position of the mouse in client coordinates.
     * @return {number} Non-clamped X position of the mouse cursor.
     */
    getClientX () {
        return this._clientX;
    }

    /**
     * Get the Y position of the mouse in client coordinates.
     * @return {number} Non-clamped Y position of the mouse cursor.
     */
    getClientY () {
        return this._clientY;
    }

    /**
     * Get the X position of the mouse in scratch coordinates.
     * @return {number} Clamped and integer rounded X position of the mouse cursor.
     */
    getScratchX () {
        const mouseX = this.cameraBound
            ? translateScreenPos(this.runtime, this.cameraBound, this._scratchX, this._scratchY)[0]
            // ? (this._scratchX * cameraState.scale) - cameraState.pos[0]
            : this._scratchX;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(mouseX);
        }
        return roundToThreeDecimals(mouseX);
    }

    /**
     * Get the Y position of the mouse in scratch coordinates.
     * @return {number} Clamped and integer rounded Y position of the mouse cursor.
     */
    getScratchY () {
        const mouseY = this.cameraBound
            ? translateScreenPos(this.runtime, this.cameraBound, this._scratchX, this._scratchY)[1]
            // ? (this._scratchY * cameraState.scale) - cameraState.pos[1]
            : this._scratchY;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(mouseY);
        }
        return roundToThreeDecimals(mouseY);
    }

    /**
     * Get the down state of the mouse.
     * @return {boolean} Is the mouse down?
     */
    getIsDown () {
        return this._isDown;
    }

    /**
     * pm: Get if the mouse was pressed down on this tick.
     * @return {boolean} Is the mouse clicked?
     */
    getIsClicked () {
        return this._isClicked;
    }

    /**
     * tw: Get the down state of a specific button of the mouse.
     * @param {number} button The ID of the button. 0 = left, 1 = middle, 2 = right
     * @return {boolean} Is the mouse button down?
     */
    getButtonIsDown (button) {
        if (button === 69) {
            return this._scrollDeltaY;
        }
        if (button === 2) {
            this.usesRightClickDown = true;
        }
        return this._buttons.has(button);
    }

    getScrollDeltaY () {
        return this._scrollDeltaY;
    }
}

module.exports = Mouse;
