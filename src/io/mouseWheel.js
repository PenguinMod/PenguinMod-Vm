class MouseWheel {
    constructor (runtime) {
        /**
         * Reference to the owning Runtime.
         * @type{!Runtime}
         */
        this.runtime = runtime;
        
        // pm: track scroll deltaY
        this.scrollDelta = 0;
        this.runtime.on("RUNTIME_STEP_END", () => {
            this.scrollDelta = 0;
        });
    }

    /**
     * Mouse wheel DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        // pm: store scroll delta
        this.scrollDelta = data.deltaY;

        if ('ext_pmSensingExpansion' in this.runtime) {
            this.runtime.ext_pmSensingExpansion.scrollDistance -= data.deltaY;
        }

        const matchFields = {};
        const scrollFields = {};
        if (data.deltaY < 0) {
            matchFields.KEY_OPTION = 'up arrow';
            scrollFields.KEY_OPTION = 'up';
        } else if (data.deltaY > 0) {
            matchFields.KEY_OPTION = 'down arrow';
            scrollFields.KEY_OPTION = 'down';
        } else {
            return;
        }

        this.runtime.startHats('event_whenkeypressed', matchFields);
        this.runtime.startHats('event_whenmousescrolled', scrollFields);
    }

    // pm: expose scroll delta for sensing block
    getScrollDelta () {
        return this.scrollDelta;
    }
}

module.exports = MouseWheel;
