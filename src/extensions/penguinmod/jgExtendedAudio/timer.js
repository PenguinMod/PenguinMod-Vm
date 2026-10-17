class Timer {
    /**
     * @param {Runtime} runtime 
     * @param {AudioContext} audioContext 
     */
    constructor(runtime, audioContext) {
        this.runtime = runtime;
        this.audioContext = audioContext;
        this._disposed = false;

        this.paused = false;
        this.stopped = true;

        this._value = 0;
        this.speed = 1;

        this._lastUpdateReal = Date.now();
        this._lastUpdateProcessed = Date.now();

        this._boundFunc = this.update.bind(this);
        this.runtime.on("RUNTIME_STEP_START", this._boundFunc);
    }

    start() {
        this.paused = false;
        this.stopped = false;
    }

    pause() {
        this.paused = true;
    }

    stop() {
        this.paused = false;
        this.stopped = true;
    }

    reset() {
        this._value = 0;
        this.paused = false;
        this.stopped = true;
    }

    update() {
        if (this.stopped || this.paused || this._disposed || this.audioContext.state !== "running") {
            this._lastUpdateReal = Date.now();
            return;
        }

        this._value += (Date.now() - this._lastUpdateReal) * this.speed;

        this._lastUpdateReal = Date.now();
        this._lastUpdateProcessed = Date.now();
    }
    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        this.runtime.off("RUNTIME_STEP_START", this._boundFunc);
    }

    getTime(inSeconds) {
        const divisor = inSeconds ? 1000 : 1;
        return this._value / divisor;
    }
    setTime(ms) {
        this._lastUpdateReal = Date.now();
        this._lastUpdateProcessed = Date.now();
        this._value = ms;
    }
}

module.exports = Timer;
