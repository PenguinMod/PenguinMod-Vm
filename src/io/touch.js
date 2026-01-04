const MathUtil = require('../util/math-util');

const roundToThreeDecimals = number => Math.round(number * 1000) / 1000;

class Touch {
    constructor (runtime) {
        this.fingers = Array.from(Array(5).keys()).map(() => {
            return {
                _clientX: 0,
                _clientY: 0,
                _scratchX: 0,
                _scratchY: 0,
                _isDown: false,

                // pm: keep track of taps
                _isTapped: false,
                _tapOnStep: -1
            }
        });

        /**
         * Reference to the owning Runtime.
         * Can be used, for example, to activate hats.
         * @type{!Runtime}
         */
        this.runtime = runtime;
        
        // after processing all blocks, we can check if this step is after the one we tapped on
        this.runtime.on("RUNTIME_STEP_END", () => {
            for (const finger of this.fingers) {
                if (this.runtime.frameLoop._stepCounter > finger._tapOnStep) {
                    finger._isTapped = false;
                }
            }
        });
    }

    /**
     * Touch DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        data.changedTouches.forEach(touch => {
            const finger = this.fingers[touch.identifier];
            if (!finger) return;
            if (typeof touch.x === 'number') {
                finger._clientX = touch.x;
                finger._scratchX = MathUtil.clamp(
                    this.runtime.stageWidth * ((touch.x / data.canvasWidth) - 0.5),
                    -(this.runtime.stageWidth / 2),
                    (this.runtime.stageWidth / 2)
                );
            }
            if (typeof touch.y === 'number') {
                finger._clientY = touch.y;
                finger._scratchY = MathUtil.clamp(
                    -this.runtime.stageHeight * ((touch.y / data.canvasHeight) - 0.5),
                    -(this.runtime.stageHeight / 2),
                    (this.runtime.stageHeight / 2)
                );
            }
            if (typeof data.isDown !== "undefined") {
                finger._isDown = data.isDown;
            }
            if (data.isDown === true) {
                finger._isTapped = true;
                finger._tapOnStep = this.runtime.frameLoop._stepCounter;
            }
        })
    }

    /**
     * Get the X position of the finger in client coordinates.
     * @param {number} finger The finger index that we are getting
     * @return {number} Non-clamped X position of the finger cursor.
     */
    getClientX (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        return f._clientX;
    }

    /**
     * Get the Y position of the finger in client coordinates.
     * @param {number} finger The finger index that we are getting
     * @return {number} Non-clamped Y position of the finger cursor.
     */
    getClientY (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        return f._clientY;
    }

    /**
     * Get the X position of the finger in scratch coordinates.
     * @param {number} finger The finger index that we are getting
     * @return {number} Clamped and integer rounded X position of the finger cursor.
     */
    getScratchX (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(f._scratchX);
        }
        return roundToThreeDecimals(f._scratchX);
    }

    /**
     * Get the Y position of the finger in scratch coordinates.
     * @param {number} finger The finger index that we are getting
     * @return {number} Clamped and integer rounded Y position of the finger cursor.
     */
    getScratchY (finger) {
        const f = this.fingers[finger];
        if (!f) return 0;
        if (this.runtime.runtimeOptions.miscLimits) {
            return Math.round(f._scratchY);
        }
        return roundToThreeDecimals(f._scratchY);
    }

    /**
     * Get the down state of the finger.
     * @param {number} finger The finger index that we are getting
     * @return {boolean} Is the finger down?
     */
    getIsDown (finger) {
        const f = this.fingers[finger];
        if (!f) return false;
        return f._isDown;
    }

    /**
     * pm: Get if the finger was pressed down on this tick.
     * @param {number} finger The finger index that we are getting
     * @return {boolean} Is the finger tapping?
     */
    getIsTapped (finger) {
        const f = this.fingers[finger];
        if (!f) return false;
        return f._isTapped;
    }
}

module.exports = Touch;
