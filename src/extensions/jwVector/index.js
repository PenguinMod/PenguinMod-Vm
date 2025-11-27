const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

/**
 * @param {number} x
 * @returns {string}
 */
function formatNumber(x) {
    if (x >= 1e6) {
        return x.toExponential(4)
    } else {
        x = Math.floor(x * 1000) / 1000
        return x.toFixed(Math.min(3, (String(x).split('.')[1] || '').length))
    }
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

class VectorType {
    customId = "jwVector"

    constructor(x = 0, y = 0) {
        this.x = isNaN(x) ? 0 : x
        this.y = isNaN(y) ? 0 : y
    }

    static toVector(x) {
        if (x instanceof VectorType) return x
        if (x instanceof Array && x.length == 2) return new VectorType(x[0], x[1])
        if (String(x).split(',')) return new VectorType(Cast.toNumber(String(x).split(',')[0]), Cast.toNumber(String(x).split(',')[1]))
        return new VectorType(0, 0)
    }

    jwArrayHandler() {
        return 'Vector'
    }

    toString() {
        return `${this.x},${this.y}`
    }
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.width = "200px"
        root.style.overflow = "hidden"
        let details = document.createElement('div')
        details.style.display = 'flex'
        details.style.flexDirection = 'column'
        details.style.justifyContent = 'center'
        details.style.width = "100px"
        details.appendChild(span(`<b>X:</b> ${formatNumber(this.x)}`))
        details.appendChild(span(`<b>Y:</b> ${formatNumber(this.y)}`))
        root.appendChild(details)
        let angle = document.createElement('div')
        angle.style.width = "100px"
        let circle = document.createElement('div')
        circle.style.width = "84px"
        circle.style.height = "84px"
        circle.style.margin = "8px"
        circle.style.border = "4px solid black"
        circle.style.borderRadius = "100%"
        circle.style.boxSizing = "border-box"
        circle.style.transform = `rotate(${this.angle}deg)`
        let line = document.createElement('div')
        line.style.width = "8px"
        line.style.height = "50%"
        line.style.background = "black"
        line.style.position = "absolute"
        line.style.left = "calc(50% - 4px)"
        circle.appendChild(line)
        angle.appendChild(circle)
        root.appendChild(angle)
        return root
    }

    /** @returns {number} */
    get magnitude() { return Math.hypot(this.x, this.y) }

    /** @returns {number} */
    get angle() {return Math.atan2(this.x, this.y) * (180 / Math.PI)}

    toJSON() {
        return {
            x: this.x,
            y: this.y
        }
    }
}

const Vector = {
    Type: VectorType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.LEAF,
        forceOutputType: "Vector",
        disableMonitor: true
    },
    Argument: {
        shape: BlockShape.LEAF,
        check: ["Vector"]
    }
}

class Extension {
    constructor() {
        vm.jwVector = Vector
        vm.runtime.registerSerializer(
            "jwVector", 
            v => [v.x, v.y], 
            v => new Vector.Type(v[0], v[1])
        );
    }

    getInfo() {
        return {
            id: "jwVector",
            name: "Vector",
            color1: "#6babff",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIj4KICA8ZWxsaXBzZSBzdHlsZT0ic3Ryb2tlLXdpZHRoOiAycHg7IHBhaW50LW9yZGVyOiBzdHJva2U7IGZpbGw6IHJnYigxMDcsIDE3MSwgMjU1KTsgc3Ryb2tlOiByZ2IoNjksIDEyNiwgMjA0KTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOSIgcnk9IjkiPjwvZWxsaXBzZT4KICA8cGF0aCBkPSJNIDQuMzUyIDEzLjc2NiBDIDQuMzUyIDE0LjgwNSA1LjE5NCAxNS42NDggNi4yMzUgMTUuNjQ4IEwgMTAgMTUuNjQ4IEMgMTEuMDM5IDE1LjY0OCAxMS44ODIgMTQuODA1IDExLjg4MiAxMy43NjYgTCAxMS44ODIgMTAgQyAxMS44ODIgOC45NTkgMTEuMDM5IDguMTE4IDEwIDguMTE4IEwgNi4yMzUgOC4xMTggQyA1LjE5NCA4LjExOCA0LjM1MiA4Ljk1OSA0LjM1MiAxMCBMIDQuMzUyIDEzLjc2NiBNIDguMTE3IDEzLjc2NiBDIDYuNjY4IDEzLjc2NiA1Ljc2MiAxMi4xOTUgNi40ODcgMTAuOTQyIEMgNi44MjIgMTAuMzU4IDcuNDQzIDEwIDguMTE3IDEwIEMgOS41NjcgMTAgMTAuNDcyIDExLjU2OSA5Ljc0NyAxMi44MjQgQyA5LjQxMSAxMy40MDYgOC43ODkgMTMuNzY2IDguMTE3IDEzLjc2NiBNIDcuMTc2IDkuMDU5IEwgOS4wNTggOS4wNTkgTCA5LjA1OCA1LjI5NCBDIDkuMDU4IDQuNTY5IDguMjczIDQuMTE2IDcuNjQ3IDQuNDc5IEMgNy4zNTUgNC42NDYgNy4xNzYgNC45NTcgNy4xNzYgNS4yOTQgTCA3LjE3NiA5LjA1OSBaIE0gMTAuOTQxIDEwLjk0MiBMIDEwLjk0MSAxMi44MjQgTCAxNC43MDYgMTIuODI0IEMgMTUuNDMxIDEyLjgyNCAxNS44ODMgMTIuMDM5IDE1LjUyMSAxMS40MTIgQyAxNS4zNTIgMTEuMTIxIDE1LjA0MSAxMC45NDIgMTQuNzA2IDEwLjk0MiBMIDEwLjk0MSAxMC45NDIgWiIgc3R5bGU9ImZpbGw6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: 'newVector',
                    text: 'new vector x: [X] y: [Y]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'newVectorFromMagnitude',
                    text: 'new vector magnitude: [X] angle: [Y]',
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        Y: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 0
                        }
                    },
                    ...Vector.Block
                },
                "---",
                {
                    opcode: 'vectorX',
                    text: '[VECTOR] x',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VECTOR: Vector.Argument
                    }
                },
                {
                    opcode: 'vectorY',
                    text: '[VECTOR] y',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VECTOR: Vector.Argument
                    }
                },
                "---",
                {
                    opcode: 'add',
                    text: '[X] + [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: Vector.Argument
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'subtract',
                    text: '[X] - [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: Vector.Argument
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'multiplyA',
                    text: '[X] * [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'multiplyB',
                    text: '[X] * [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: Vector.Argument
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'divideA',
                    text: '[X] / [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'divideB',
                    text: '[X] / [Y]',
                    arguments: {
                        X: Vector.Argument,
                        Y: Vector.Argument
                    },
                    ...Vector.Block
                },
                "---",
                {
                    opcode: 'magnitude',
                    text: 'magnitude of [VECTOR]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VECTOR: Vector.Argument
                    }
                },
                {
                    opcode: 'angle',
                    text: 'angle of [VECTOR]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        VECTOR: Vector.Argument
                    }
                },
                {
                    opcode: 'normalize',
                    text: 'normalize [VECTOR]',
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'absolute',
                    text: 'absolute [VECTOR]',
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'rotate',
                    text: 'rotate [VECTOR] by [ANGLE]',
                    arguments: {
                        VECTOR: Vector.Argument,
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    },
                    ...Vector.Block
                },
                {
                    opcode: 'round',
                    text: '[ROUNDING] of [VECTOR]',
                    arguments: {
                        ROUNDING: {
                            menu: 'roundingFunctions',
                        },
                        VECTOR: Vector.Argument
                    },
                    ...Vector.Block
                },
                "---",
                {
                    opcode: 'getPos',
                    text: 'position',
                    extensions: ["colours_motion"],
                    filter: [TargetType.SPRITE],
                    ...Vector.Block
                },
                {
                    opcode: 'setPos',
                    text: 'set position to [VECTOR]',
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    extensions: ["colours_motion"],
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'getStretch',
                    text: 'stretch',
                    extensions: ["colours_looks"],
                    filter: [TargetType.SPRITE],
                    ...Vector.Block
                },
                {
                    opcode: 'setStretch',
                    text: 'set stretch to [VECTOR]',
                    arguments: {
                        VECTOR: Vector.Argument
                    },
                    extensions: ["colours_looks"],
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'getMouse',
                    text: 'mouse position',
                    extensions: ["colours_sensing"],
                    ...Vector.Block
                },
            ],
            menus: {
                roundingFunctions: {
                    acceptReporters: false,
                    items: [
                        {
                            text: 'round',
                            value: 'round'
                        },
                        {
                            text: 'ceil', // might as well go full in on the inconsistencies since we are already doing "round of"
                            value: 'ceil'
                        },
                        {
                            text: 'floor',
                            value: 'floor'
                        }
                    ]
                },
            }
        };
    }

    newVector(args) {
        const X = Cast.toNumber(args.X)
        const Y = Cast.toNumber(args.Y)

        return new VectorType(X, Y)
    }

    newVectorFromMagnitude(args) {
        return this.rotate({VECTOR: new VectorType(0, Cast.toNumber(args.X)), ANGLE: args.Y})
    }

    vectorX(args) {
        return VectorType.toVector(args.VECTOR).x
    }

    vectorY(args) {
        return VectorType.toVector(args.VECTOR).y
    }

    add(args) {
        const X = VectorType.toVector(args.X)
        const Y = VectorType.toVector(args.Y)

        return new VectorType(X.x + Y.x, X.y + Y.y)
    }

    subtract(args) {
        const X = VectorType.toVector(args.X)
        const Y = VectorType.toVector(args.Y)

        return new VectorType(X.x - Y.x, X.y - Y.y)
    }

    multiplyA(args) {
        const X = VectorType.toVector(args.X)
        const Y = Cast.toNumber(args.Y)

        return new VectorType(X.x * Y, X.y * Y)
    }

    multiplyB(args) {
        const X = VectorType.toVector(args.X)
        const Y = VectorType.toVector(args.Y)

        return new VectorType(X.x * Y.x, X.y * Y.y)
    }

    divideA(args) {
        const X = VectorType.toVector(args.X)
        const Y = Cast.toNumber(args.Y)

        return new VectorType(X.x / Y, X.y / Y)
    }

    divideB(args) {
        const X = VectorType.toVector(args.X)
        const Y = VectorType.toVector(args.Y)

        return new VectorType(X.x / Y.x, X.y / Y.y)
    }

    magnitude(args) {
        return VectorType.toVector(args.VECTOR).magnitude
    }

    angle(args) {
        return VectorType.toVector(args.VECTOR).angle
    }

    normalize(args) {
        const v = VectorType.toVector(args.VECTOR)

        return new VectorType(v.x / v.magnitude, v.y / v.magnitude)
    }

    absolute(args) {
        const v = VectorType.toVector(args.VECTOR)

        return new VectorType(Math.abs(v.x), Math.abs(v.y))
    }

    rotate(args) {
        const v = VectorType.toVector(args.VECTOR)
        const ANGLE = Cast.toNumber(args.ANGLE) / 180 * -Math.PI
        const cos = Math.cos(ANGLE)
        const sin = Math.sin(ANGLE)

        return new VectorType(
            v.x * cos - v.y * sin,
            v.x * sin + v.y * cos
        )
    }

    round(args) {
        const v = VectorType.toVector(args.VECTOR)
        const r = Cast.toString(args.ROUNDING)

        switch (r) {
            case 'floor':
                return new VectorType(Math.floor(v.x), Math.floor(v.y))
            case 'ceil':
                return new VectorType(Math.ceil(v.x), Math.ceil(v.y))
        }

        return new VectorType(Math.round(v.x), Math.round(v.y))
    }
    
    getPos({}, util) {
        return new Vector.Type(
            util.target.x,
            util.target.y
        )
    }

    setPos({VECTOR}, util) {
        VECTOR = Vector.Type.toVector(VECTOR)

        util.target.setXY(VECTOR.x, VECTOR.y)
    }

    getStretch({}, util) {
        return new Vector.Type(...util.target.stretch)
    }

    setStretch({VECTOR}, util) {
        VECTOR = Vector.Type.toVector(VECTOR)

        util.target.setStretch(VECTOR.x, VECTOR.y)
    }

    getMouse({}, util) {
        return new Vector.Type(vm.runtime.ioDevices.mouse.getScratchX(), vm.runtime.ioDevices.mouse.getScratchY())
    }
}

module.exports = Extension
