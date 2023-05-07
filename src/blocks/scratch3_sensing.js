const Cast = require('../util/cast');
const Timer = require('../util/timer');
const MathUtil = require('../util/math-util');
const getMonitorIdForBlockWithArgs = require('../util/get-monitor-id');
const { validateRegex } = require('../util/json-block-utilities');

class Scratch3SensingBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The "answer" block value.
         * @type {string}
         */
        this._answer = ''; // used by compiler

        /**
         * The timer utility.
         * @type {Timer}
         */
        this._timer = new Timer();

        /**
         * The stored microphone loudness measurement.
         * @type {number}
         */
        this._cachedLoudness = -1;

        /**
         * The time of the most recent microphone loudness measurement.
         * @type {number}
         */
        this._cachedLoudnessTimestamp = 0;

        /**
         * The list of queued questions and respective `resolve` callbacks.
         * @type {!Array}
         */
        this._questionList = [];

        this.runtime.on('ANSWER', this._onAnswer.bind(this));
        this.runtime.on('PROJECT_START', this._resetAnswer.bind(this));
        this.runtime.on('PROJECT_STOP_ALL', this._clearAllQuestions.bind(this));
        this.runtime.on('STOP_FOR_TARGET', this._clearTargetQuestions.bind(this));
        this.runtime.on('RUNTIME_DISPOSED', this._resetAnswer.bind(this));
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            sensing_objecttouchingobject: this.objectTouchingObject,
            sensing_touchingobject: this.touchingObject,
            sensing_touchingcolor: this.touchingColor,
            sensing_coloristouchingcolor: this.colorTouchingColor,
            sensing_distanceto: this.distanceTo,
            sensing_timer: this.getTimer,
            sensing_resettimer: this.resetTimer,
            sensing_of: this.getAttributeOf,
            sensing_mousex: this.getMouseX,
            sensing_mousey: this.getMouseY,
            sensing_setdragmode: this.setDragMode,
            sensing_mousedown: this.getMouseDown,
            sensing_keypressed: this.getKeyPressed,
            sensing_current: this.current,
            sensing_dayssince2000: this.daysSince2000,
            sensing_loudness: this.getLoudness,
            sensing_loud: this.isLoud,
            sensing_askandwait: this.askAndWait,
            sensing_answer: this.getAnswer,
            sensing_username: this.getUsername,
            sensing_userid: () => {}, // legacy no-op block
            sensing_regextest: this.regextest,
            sensing_thing_is_number: this.thing_is_number,
            sensing_thing_has_number: this.thing_has_number,
            sensing_mobile: this.mobile,
            sensing_thing_is_text: this.thing_is_text,
            sensing_getspritewithattrib: this.getspritewithattrib,
            sensing_directionTo: this.getDirectionToFrom,
            sensing_distanceTo: this.getDistanceToFrom,
            sensing_isUpperCase: this.isCharecterUppercase,
            sensing_mouseclicked: this.mouseClicked,
            sensing_keyhit: this.keyHit,
            sensing_mousescrolling: this.mouseScrolling,
            sensing_fingerdown: this.fingerDown,
            sensing_fingertapped: this.fingerTapped,
            sensing_fingerx: this.getFingerX,
            sensing_fingery: this.getFingerY,
            sensing_setclipboard: this.setClipboard,
            sensing_getclipboard: this.getClipboard,
            sensing_getdragmode: this.getDragMode,
            sensing_getoperatingsystem: this.getOS,
            sensing_getbrowser: this.getBrowser,
            sensing_geturl: this.getUrl,
            sensing_getxyoftouchingsprite: this.getXYOfTouchingSprite
        };
    }

    getOS () {
        if (!('userAgent' in navigator)) return 'Unknown';
        const agent = navigator.userAgent;
        if (agent.includes('Mac OS')) {
            return 'MacOS';
        }
        if (agent.includes('CrOS')) {
            return 'ChromeOS';
        }
        if (agent.includes('Linux')) {
            return 'Linux';
        }
        if (agent.includes('Windows')) {
            return 'Windows';
        }
        if (agent.includes('iPad') || agent.includes('iPod') || agent.includes('iPhone')) {
            return 'iOS';
        }
        if (agent.includes('Android')) {
            return 'Android';
        }
        return 'Unknown';
    }
    getBrowser () {
        if (!('userAgent' in navigator)) return 'Unknown';
        const agent = navigator.userAgent;
        if(navigator.userAgentData.brands[1].brand=="Microsoft Edge"){
            return 'Microsoft Edge';
        }
        if (agent.includes('Chrome')) {
            return 'Chrome';
        }
        if (agent.includes('MSIE') || agent.includes('rv:')) {
            return 'Internet Explorer';
        }
        if (agent.includes('Firefox')) {
            return 'Firefox';
        }
        if (agent.includes('Safari')) {
            return 'Safari';
        }
        return 'Unknown';
    }
    getUrl () {
        if (!('href' in location)) return '';
        return location.href;
    }

    setClipboard (args) {
        const text = Cast.toString(args.ITEM);
        if (!navigator) return;
        if (('clipboard' in navigator) && ('writeText' in navigator.clipboard)) {
            navigator.clipboard.writeText(text);
        }
    }
    getClipboard () {
        if (!navigator) return '';
        if (('clipboard' in navigator) && ('readText' in navigator.clipboard)) {
            return navigator.clipboard.readText();
        } else {
            return '';
        }
    }

    getDragMode (_, util) {
        return util.target.draggable;
    }

    mouseClicked (_, util) {
        return util.ioQuery('mouse', 'getIsClicked');
    }
    keyHit (args, util) {
        return util.ioQuery('keyboard', 'getKeyIsHit', [args.KEY_OPTION]);
    }
    mouseScrolling (args, util) {
        const delta = util.ioQuery('mouseWheel', 'getScrollDelta');
        const option = args.SCROLL_OPTION;
        switch (option) {
            case "up":
                return delta < 0;
            case "down":
                return delta > 0;
            default:
                return false;
        }
    }

    isCharecterUppercase (args) {
        return (/[A-Z]/g).test(args.text);
    }

    getDirectionToFrom (args) {
        const dx = args.x2 - args.x1;
        const dy = args.y2 - args.y1;
        const direction = 90 - MathUtil.radToDeg(Math.atan2(dy, dx));
        return direction;
    }

    getDistanceToFrom (args) {
        const dx = args.x2 - args.x1;
        const dy = args.y2 - args.y1;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    getspritewithattrib (args, util) {
        // strip out usless data
        const sprites = util.runtime.targets.map(x => ({
            id: x.id, 
            name: x.sprite ? x.sprite.name : "Unkown",
            variables: Object.values(x.variables).reduce((obj, value) => {
                if (!value.name) return obj;
                obj[value.name] = String(value.value);
                return obj;
            }, {})
        }));
        // get the target with variable x set to y
        let res = "No sprites found";
        for (
            // define the index and the sprite
            let idx = 1, sprite = sprites[0]; 
            // standard for loop thing
            idx < sprites.length;
            // set sprite to a new item  
            sprite = sprites[idx++]
        ) {
            if (sprite.variables[args.var] === args.val) {
                res = `{"id": "${sprite.id}", "name": "${sprite.name}"}`;
                break;
            }
        }
        
        return res;
    }
    thing_is_number (args) {
        // i hate js
        // i also hate regex
        // so im gonna do this the lazy way
        // no. String(Number(value)) === value does infact do the job X)
        // also what was originaly here was inificiant as hell

        // jg: why dont you literally just do what "is text" did but the opposite
        // except also account for numbers that end with . (that aint a number)
        if (Cast.toString(args.TEXT1).trim().endsWith(".")) {
            return false;
        }
        return !this.thing_is_text(args);
    }
    thing_is_text (args) {
        // WHY IS NAN NOT EQUAL TO ITSELF
        // HOW IS NAN A NUMBER
        // because nan is how numbers say the value put into me is not a number
        return isNaN(Number(args.TEXT1));
    }

    thing_has_number(args) {
        return /\d/.test(Cast.toString(args.TEXT1));
    }

    mobile () {
        return typeof window !== 'undefined' && 'ontouchstart' in window;
    }

    regextest (args) {
        if (!validateRegex(args.reg, args.regrule)) return false;
        const regex = new RegExp(args.reg, args.regrule);
        return regex.test(args.text);
    }

    getMonitored () {
        return {
            sensing_answer: {
                getId: () => 'answer'
            },
            sensing_mousedown: {
                getId: () => 'mousedown'
            },
            sensing_mousex: {
                getId: () => 'mousex'
            },
            sensing_mousey: {
                getId: () => 'mousey'
            },
            sensing_loudness: {
                getId: () => 'loudness'
            },
            sensing_timer: {
                getId: () => 'timer'
            },
            sensing_dayssince2000: {
                getId: () => 'dayssince2000'
            },
            sensing_current: {
                // This is different from the default toolbox xml id in order to support
                // importing multiple monitors from the same opcode from sb2 files,
                // something that is not currently supported in scratch 3.
                getId: (_, fields) => getMonitorIdForBlockWithArgs('current', fields) // _${param}`
            }
        };
    }

    _onAnswer (answer) {
        this._answer = answer;
        const questionObj = this._questionList.shift();
        if (questionObj) {
            const [_question, resolve, target, wasVisible, wasStage] = questionObj;
            // If the target was visible when asked, hide the say bubble unless the target was the stage.
            if (wasVisible && !wasStage) {
                this.runtime.emit('SAY', target, 'say', '');
            }
            resolve();
            this._askNextQuestion();
        }
    }

    _resetAnswer () {
        this._answer = '';
    }

    _enqueueAsk (question, resolve, target, wasVisible, wasStage) {
        this._questionList.push([question, resolve, target, wasVisible, wasStage]);
    }

    _askNextQuestion () {
        if (this._questionList.length > 0) {
            const [question, _resolve, target, wasVisible, wasStage] = this._questionList[0];
            // If the target is visible, emit a blank question and use the
            // say event to trigger a bubble unless the target was the stage.
            if (wasVisible && !wasStage) {
                this.runtime.emit('SAY', target, 'say', question);
                this.runtime.emit('QUESTION', '');
            } else {
                this.runtime.emit('QUESTION', question);
            }
        }
    }

    _clearAllQuestions () {
        this._questionList = [];
        this.runtime.emit('QUESTION', null);
    }

    _clearTargetQuestions (stopTarget) {
        const currentlyAsking = this._questionList.length > 0 && this._questionList[0][2] === stopTarget;
        this._questionList = this._questionList.filter(question => (
            question[2] !== stopTarget
        ));

        if (currentlyAsking) {
            this.runtime.emit('SAY', stopTarget, 'say', '');
            if (this._questionList.length > 0) {
                this._askNextQuestion();
            } else {
                this.runtime.emit('QUESTION', null);
            }
        }
    }

    askAndWait (args, util) {
        const _target = util.target;
        return new Promise(resolve => {
            const isQuestionAsked = this._questionList.length > 0;
            this._enqueueAsk(String(args.QUESTION), resolve, _target, _target.visible, _target.isStage);
            if (!isQuestionAsked) {
                this._askNextQuestion();
            }
        });
    }

    getAnswer () {
        return this._answer;
    }
    
    objectTouchingObject (args, util) {
        const object1 = (args.FULLTOUCHINGOBJECTMENU  ) === "_myself_" ? util.target.getName() : args.FULLTOUCHINGOBJECTMENU;
        const object2 = args.SPRITETOUCHINGOBJECTMENU;
        if (object2 === "_myself_") {
            return util.target.isTouchingObject(object1);
        }
        const target = this.runtime.getSpriteTargetByName(object2);
        if (!target) return false;
        return target.isTouchingObject(object1);
    }

    touchingObject (args, util) {
        return util.target.isTouchingObject(args.TOUCHINGOBJECTMENU);
    }

    getXYOfTouchingSprite (args, util) {
        const object = args.SPRITE;
        if (object === '_mouse_') {
            // we can just return mouse pos
            // if mouse is touching us, the mouse size is practically 1x1 anyways
            const x = util.ioQuery('mouse', 'getScratchX');
            const y = util.ioQuery('mouse', 'getScratchY');
            if (args.XY === 'y') return y;
            return x;
        }
        const point = util.target.spriteTouchingPoint(object);
        if (!point) return '';
        if (args.XY === 'y') return point[1];
        return point[0];
    }

    touchingColor (args, util) {
        const color = Cast.toRgbColorList(args.COLOR);
        return util.target.isTouchingColor(color);
    }

    colorTouchingColor (args, util) {
        const maskColor = Cast.toRgbColorList(args.COLOR);
        const targetColor = Cast.toRgbColorList(args.COLOR2);
        return util.target.colorIsTouchingColor(targetColor, maskColor);
    }

    distanceTo (args, util) {
        if (util.target.isStage) return 10000;

        let targetX = 0;
        let targetY = 0;
        if (args.DISTANCETOMENU === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else {
            args.DISTANCETOMENU = Cast.toString(args.DISTANCETOMENU);
            const distTarget = this.runtime.getSpriteTargetByName(
                args.DISTANCETOMENU
            );
            if (!distTarget) return 10000;
            targetX = distTarget.x;
            targetY = distTarget.y;
        }

        const dx = util.target.x - targetX;
        const dy = util.target.y - targetY;
        return Math.sqrt((dx * dx) + (dy * dy));
    }

    setDragMode (args, util) {
        util.target.setDraggable(args.DRAG_MODE === 'draggable');
    }

    getTimer (args, util) {
        return util.ioQuery('clock', 'projectTimer');
    }

    resetTimer (args, util) {
        util.ioQuery('clock', 'resetProjectTimer');
    }

    getMouseX (args, util) {
        return util.ioQuery('mouse', 'getScratchX');
    }

    getMouseY (args, util) {
        return util.ioQuery('mouse', 'getScratchY');
    }

    getMouseDown (args, util) {
        return util.ioQuery('mouse', 'getIsDown');
    }

    getFingerX (args, util) {
        return util.ioQuery('touch', 'getScratchX', [Cast.toNumber(args.FINGER_OPTION) - 1]);
    }

    getFingerY (args, util) {
        return util.ioQuery('touch', 'getScratchY', [Cast.toNumber(args.FINGER_OPTION) - 1]);
    }

    fingerDown (args, util) {
        return util.ioQuery('touch', 'getIsDown', [Cast.toNumber(args.FINGER_OPTION) - 1]);
    }

    fingerTapped (args, util) {
        return util.ioQuery('touch', 'getIsTapped', [Cast.toNumber(args.FINGER_OPTION) - 1]);
    }

    current (args) {
        const menuOption = Cast.toString(args.CURRENTMENU).toLowerCase();
        const date = new Date();
        switch (menuOption) {
        case 'year': return date.getFullYear();
        case 'month': return date.getMonth() + 1; // getMonth is zero-based
        case 'date': return date.getDate();
        case 'dayofweek': return date.getDay() + 1; // getDay is zero-based, Sun=0
        case 'hour': return date.getHours();
        case 'minute': return date.getMinutes();
        case 'second': return date.getSeconds();
        }
        return 0;
    }

    getKeyPressed (args, util) {
        return util.ioQuery('keyboard', 'getKeyIsDown', [args.KEY_OPTION]);
    }

    daysSince2000 () {
        const msPerDay = 24 * 60 * 60 * 1000;
        const start = new Date(2000, 0, 1); // Months are 0-indexed.
        const today = new Date();
        const dstAdjust = today.getTimezoneOffset() - start.getTimezoneOffset();
        let mSecsSinceStart = today.valueOf() - start.valueOf();
        mSecsSinceStart += ((today.getTimezoneOffset() - dstAdjust) * 60 * 1000);
        return mSecsSinceStart / msPerDay;
    }

    getLoudness () {
        if (typeof this.runtime.audioEngine === 'undefined') return -1;
        if (this.runtime.currentStepTime === null) return -1;

        // Only measure loudness once per step
        const timeSinceLoudness = this._timer.time() - this._cachedLoudnessTimestamp;
        if (timeSinceLoudness < this.runtime.currentStepTime) {
            return this._cachedLoudness;
        }

        this._cachedLoudnessTimestamp = this._timer.time();
        this._cachedLoudness = this.runtime.audioEngine.getLoudness();
        return this._cachedLoudness;
    }

    isLoud () {
        return this.getLoudness() > 10;
    }

    getAttributeOf (args) {
        let attrTarget;

        if (args.OBJECT === '_stage_') {
            attrTarget = this.runtime.getTargetForStage();
        } else {
            args.OBJECT = Cast.toString(args.OBJECT);
            attrTarget = this.runtime.getSpriteTargetByName(args.OBJECT);
        }

        // attrTarget can be undefined if the target does not exist
        // (e.g. single sprite uploaded from larger project referencing
        // another sprite that wasn't uploaded)
        if (!attrTarget) return 0;

        // Generic attributes
        if (attrTarget.isStage) {
            switch (args.PROPERTY) {
            // Scratch 1.4 support
            case 'background #': return attrTarget.currentCostume + 1;

            case 'backdrop #': return attrTarget.currentCostume + 1;
            case 'backdrop name':
                return attrTarget.getCostumes()[attrTarget.currentCostume].name;
            case 'volume': return attrTarget.volume;
            }
        } else {
            switch (args.PROPERTY) {
            case 'x position': return attrTarget.x;
            case 'y position': return attrTarget.y;
            case 'direction': return attrTarget.direction;
            case 'costume #': return attrTarget.currentCostume + 1;
            case 'costume name':
                return attrTarget.getCostumes()[attrTarget.currentCostume].name;
            case 'size': return attrTarget.size;
            case 'volume': return attrTarget.volume;
            }
        }

        // Target variables.
        const varName = args.PROPERTY;
        const variable = attrTarget.lookupVariableByNameAndType(varName, '', true);
        if (variable) {
            return variable.value;
        }

        // Otherwise, 0
        return 0;
    }

    getUsername (args, util) {
        return util.ioQuery('userData', 'getUsername');
    }
}

module.exports = Scratch3SensingBlocks;
