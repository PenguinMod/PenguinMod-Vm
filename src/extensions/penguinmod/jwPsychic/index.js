const BlockType = require('../../../extension-support/block-type')
const BlockShape = require('../../../extension-support/block-shape')
const ArgumentType = require('../../../extension-support/argument-type')
const TargetType = require('../../../extension-support/target-type')
const Cast = require('../../../util/cast')

const Matter = require('matter-js')

let jwVector = {
    Type: class {},
    Block: {},
    Argument: {}
}

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
}

let jwTargets = {
    Type: class {},
    Block: {},
    Argument: {}
}

class Extension {
    constructor() {
        vm.extensionManager.addExtensionDependency("jwPsychic", "jwVector", () => jwVector = vm.jwVector);
        vm.extensionManager.addExtensionDependency("jwPsychic", "jwArray", () => jwArray = vm.jwArray);
        vm.extensionManager.addExtensionDependency("jwPsychic", "jwTargets", () => jwTargets = vm.jwTargets);

        this.engine = Matter.Engine.create()
        /** @type {Object<string, Matter.Body>} */
        this.bodies = {}
        /** @type {Matter.Composite?} */
        this.bounds = null
        
        vm.runtime.on("PROJECT_START", this.reset.bind(this));

        vm.PsychicDebug = this;
    }

    getInfo() {
        return {
            id: "jwPsychic",
            name: "Psychic",
            color: "#b16bed",
            menuIconURI: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIiB3aWR0aD0iMjBweCIgaGVpZ2h0PSIyMHB4Ij48ZGVmcz48Yng6ZXhwb3J0PjxieDpmaWxlIGZvcm1hdD0ic3ZnIi8+PC9ieDpleHBvcnQ+PC9kZWZzPjxlbGxpcHNlIHN0eWxlPSJzdHJva2Utd2lkdGg6IDJweDsgcGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogcmdiKDE3NywgMTA3LCAyMzcpOyBzdHJva2U6IHJnYigxNTksIDk2LCAyMTMpOyIgY3g9IjEwIiBjeT0iMTAiIHJ4PSI5IiByeT0iOSIvPjxyZWN0IHg9IjQuNjM0IiB5PSIxMC4yMjgiIHdpZHRoPSI0Ljc3IiBoZWlnaHQ9IjQuNzciIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ii8+PHJlY3QgeD0iMTAuNTk2IiB5PSIxMC4yMjgiIHdpZHRoPSI0Ljc3IiBoZWlnaHQ9IjQuNzciIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ii8+PHJlY3QgeD0iNy42MTUiIHdpZHRoPSI0Ljc3IiBoZWlnaHQ9IjQuNzciIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7IiB5PSI0LjI2NyIvPjwvc3ZnPg==",
            blocks: [
                {
                    opcode: 'tick',
                    text: 'tick',
                    blockType: BlockType.COMMAND
                },
                "---",
                {
                    opcode: 'boundaries',
                    text: 'set boundaries [OPTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'boundariesOption'
                        }
                    }
                },
                {
                    opcode: 'setGravity',
                    text: 'set gravity to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: jwVector.Argument
                    }
                },
                {
                    opcode: 'getGravity',
                    text: 'gravity',
                    ...jwVector.Block
                },
                "---",
                {
                    opcode: 'enablePhysics',
                    text: 'enable physics as [OPTION]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'enablePhysicsOption'
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'disablePhysics',
                    text: 'disable physics',
                    blockType: BlockType.COMMAND,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'setPos',
                    text: 'set position to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: jwVector.Argument
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getPos',
                    text: 'position',
                    filter: [TargetType.SPRITE],
                    ...jwVector.Block
                },
                {
                    opcode: 'setVel',
                    text: 'set velocity to [VECTOR]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VECTOR: jwVector.Argument
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getVel',
                    text: 'velocity',
                    filter: [TargetType.SPRITE],
                    ...jwVector.Block
                },
                {
                    opcode: 'setRot',
                    text: 'set rotation to [ANGLE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getRot',
                    text: 'rotation',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setAngVel',
                    text: 'set angular velocity to [ANGLE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 0
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getAngVel',
                    text: 'angular velocity',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'getMass',
                    text: 'mass',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setDensity',
                    text: 'set density to [NUMBER]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.001
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getDensity',
                    text: 'density',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'setStatic',
                    text: 'set fixed to [BOOLEAN]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BOOLEAN: {
                            type: ArgumentType.BOOLEAN
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getStatic',
                    text: 'fixed',
                    blockType: BlockType.BOOLEAN,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setRotatable',
                    text: 'set rotatable to [BOOLEAN]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BOOLEAN: {
                            type: ArgumentType.BOOLEAN
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getRotatable',
                    text: 'rotatable',
                    blockType: BlockType.BOOLEAN,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'setFric',
                    text: 'set friction to [NUMBER]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.1
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getFric',
                    text: 'friction',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setAirFric',
                    text: 'set air resistance to [NUMBER]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.01
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getAirFric',
                    text: 'air resistance',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'setRest',
                    text: 'set restitution to [NUMBER]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    },
                    filter: [TargetType.SPRITE]
                },
                {
                    opcode: 'getRest',
                    text: 'restitution',
                    blockType: BlockType.REPORTER,
                    filter: [TargetType.SPRITE]
                },
                "---",
                {
                    opcode: 'getCollides',
                    text: 'targets colliding with [OPTION]',
                    arguments: {
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu: 'touchingOption'
                        }
                    },
                    filter: [TargetType.SPRITE],
                    ...jwArray.Block
                }
            ],
            menus: {
                enablePhysicsOption: [
                    'precise',
                    'box',
                    'circle'
                ],
                boundariesOption: [
                    'all',
                    'floor',
                    'none'
                ],
                touchingOption: [
                    'body',
                    'feet',
                    'head'
                ]
            }
        };
    }

    vectorToMatter(vector) {
        return Matter.Vector.create(vector.x, -vector.y)
    }

    matterToVector(matter) {
        return new jwVector.Type(matter.x, -matter.y)
    }

    angleToMatter(angle) {
        return (angle - 90) * Math.PI / 180
    }

    matterToAngle(matter) {
        return (matter * 180 / Math.PI) + 90
    }

    reset() {
        this.engine = Matter.Engine.create()
        this.bodies = {}
        this.bounds = null
    }

    correctBody(id) {
        /** @type {Matter.Body} */
        let body = this.bodies[id]
        let target = vm.runtime.getTargetById(id)

        if (target == undefined) {
            Matter.Composite.remove(this.engine.world, body)
            delete this.bodies[id]
            return
        }

        Matter.Body.setPosition(body, Matter.Vector.create(target.x, -target.y))
        Matter.Body.setAngle(body, this.angleToMatter(target.direction))
    }

    correctTarget(id) {
        /** @type {Matter.Body} */
        let body = this.bodies[id]
        let target = vm.runtime.getTargetById(id)

        target.setXY(body.position.x, -body.position.y, false, true)
        target.setDirection(this.matterToAngle(body.angle))
    }

    tick() {
        let fps = vm.runtime.frameLoop.framerate
        if (fps == 0) fps = 60

        for (let id of Object.keys(this.bodies)) {
            this.correctBody(id)
        }

        Matter.Engine.update(this.engine, 1000 / fps)

        for (let id of Object.keys(this.bodies)) {
            this.correctTarget(id)
        }
    }

    boundaries({OPTION}) {
        if (this.bounds) {
            Matter.Composite.remove(this.engine.world, this.bounds)
            this.bounds = null
        }

        let stageWidth = vm.runtime.stageWidth
        let stageHeight = vm.runtime.stageHeight

        this.bounds = Matter.Composite.create()

        switch (OPTION) {
            case 'all':
                Matter.Composite.add(this.bounds, [
                    Matter.Bodies.rectangle(-stageWidth, 0, stageWidth, Number.MAX_SAFE_INTEGER / 2, { isStatic: true }),
                    Matter.Bodies.rectangle(stageWidth, 0, stageWidth, Number.MAX_SAFE_INTEGER / 2, { isStatic: true }),
                    Matter.Bodies.rectangle(0, -stageHeight, Number.MAX_SAFE_INTEGER / 2, stageHeight, { isStatic: true }),
                ])
            case 'floor':
                Matter.Composite.add(this.bounds, Matter.Bodies.rectangle(0, stageHeight, Number.MAX_SAFE_INTEGER / 2, stageHeight, { isStatic: true }))
                break
        }

        Matter.Composite.add(this.engine.world, this.bounds)
    }

    setGravity({VECTOR}) {
        let v = jwVector.Type.toVector(VECTOR)
        this.engine.gravity.x = v.x
        this.engine.gravity.y = -v.y
    }

    getGravity() {
        return this.matterToVector(this.engine.gravity)
    }

    enablePhysics({OPTION}, util) {
        let target = util.target
        let costume = target.getCostumes()[target.currentCostume]
        let size = {
            x: costume.size[0] * (target.size / 100) * (target.stretch[0] / 100) / costume.bitmapResolution,
            y: costume.size[1] * (target.size / 100) * (target.stretch[1] / 100) / costume.bitmapResolution
        }

        console.debug(size)

        /** @type {Matter.Body?} */
        let body = null
        switch (OPTION) {
            case 'precise':
                throw "i need to finish precise mb"
                break
            case 'box':
                body = Matter.Bodies.rectangle(target.x, -target.y, size.x, size.y)
                break
            case 'circle':
                body = Matter.Bodies.circle(target.x, -target.y, Math.max(size.x, size.y) / 2)
                break
            default:
                throw "Invalid physics option"
        }

        body.label = target.id

        this.bodies[target.id] = body
        Matter.Composite.add(this.engine.world, body)

        this.correctBody(target.id)
    }

    disablePhysics({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        Matter.Composite.remove(this.engine.world, body)
        delete this.bodies[id]
        return
    }

    setPos({VECTOR}, util) {
        let v = jwVector.Type.toVector(VECTOR)
        util.target.setXY(v.x, v.y)
    }

    getPos({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return new jwVector.Type(util.target.x, util.target.y)
        return this.matterToVector(body.position)
    }

    setRot({ANGLE}, util) {
        let a = Cast.toNumber(ANGLE)
        util.target.setDirection(a)
    }

    getRot({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return util.target.direction
        return this.matterToAngle(body.angle)
    }

    setVel({VECTOR}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        let v = jwVector.Type.toVector(VECTOR)
        Matter.Body.setVelocity(body, this.vectorToMatter(v))
    }

    getVel({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return new jwVector.Type(0, 0)
        return this.matterToVector(body.velocity)
    }

    setAngVel({ANGLE}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        Matter.Body.setAngularVelocity(body, Cast.toNumber(ANGLE))
    }

    getAngVel({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0
        return body.angularVelocity
    }

    getMass({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0
        return body.mass
    }

    getDensity({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0.001
        return body.density
    }

    setDensity({NUMBER}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        Matter.Body.setDensity(Cast.toNumber(NUMBER))
    }

    getStatic({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return false
        return body.isStatic
    }

    setStatic({BOOLEAN}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        body.isStatic = BOOLEAN
    }

    getRotatable({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return true
        return body.inertia !== Infinity
    }

    setRotatable({BOOLEAN}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        if (BOOLEAN) {
            Matter.Body.setVertices(body, body.vertices)
        } else {
            Matter.Body.setInertia(body, Infinity)
        }
    }

    setFric({NUMBER}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        body.friction = Cast.toNumber(NUMBER)
    }

    getFric({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0.1
        return body.friction
    }

    setAirFric({NUMBER}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        body.frictionAir = Cast.toNumber(NUMBER)
    }

    getAirFric({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0.01
        return body.frictionAir
    }

    setRest({NUMBER}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return
        body.restitution = Cast.toNumber(NUMBER)
    }

    getRest({}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return 0.01
        return body.restitution
    }

    getCollides({OPTION}, util) {
        let body = this.bodies[util.target.id]
        if (!body) return new jwArray.Type()

        let collisions = Matter.Query.collides(body, Object.values(this.bodies).filter(v => v.label !== util.target.id))

        if (OPTION !== 'body') {
            collisions = collisions.filter(v => v.supports[0].x > body.bounds.min.x+1 && v.supports[0].x < body.bounds.max.x-1)
            console.debug(collisions)
            switch (OPTION) {
                case 'feet':
                    collisions = collisions.filter(v => {
                        for (let support of v.supports) {
                            if (support == null) continue
                            if (support.y > body.bounds.max.y-4) return true
                        }
                    })
                    break
                case 'head':
                    collisions = collisions.filter(v => {
                        for (let support of v.supports) {
                            if (support == null) continue
                            if (support.y < body.bounds.min.y+4) return true
                        }
                    })
                    break
            }
            console.debug(collisions)
        }

        let bodies = collisions.map(v => body == v.bodyA ? v.bodyB : v.bodyA)
        bodies.filter(v => v.label !== util.target.id)
        return new jwArray.Type(bodies.map(v => new jwTargets.Type(v.label)))
    }
}

module.exports = Extension