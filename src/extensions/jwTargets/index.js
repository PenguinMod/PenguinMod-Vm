const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

function span(text) {
    let el = document.createElement('span')
    el.innerText = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

const escapeHTML = unsafe => {
    return unsafe
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
};


class jwTargetType {
    customId = "jwTargets"

    targetId = ""

    constructor(targetId) {
        this.targetId = targetId
    }

    static toTarget(x) {
        if (x instanceof jwTargetType) return x
        if (typeof x == "string") return new jwTargetType(x)
        return new jwTargetType("")
    }

    jwArrayHandler() {
        try {
            return escapeHTML(`Target<${this.target.sprite.name}>`)
        } catch {
            return `Target`
        }
    }

    toString() {
        return this.targetId
    }
    toMonitorContent() {
        try {
            return span(this.target.sprite.name)
        } catch {
            return span(this.targetId)
        }
    }

    toReporterContent() {
        try {
            let target = this.target
            let name = target.sprite.name
            let isClone = !target.isOriginal
            let costumeURI = target.getCostumes()[target.currentCostume].asset.encodeDataURI()

            let root = document.createElement('div')
            root.style.display = 'flex'
            root.style.flexDirection = 'column'
            root.style.justifyContent = 'center'

            let img = document.createElement('img')
            img.src = costumeURI
            img.style.maxWidth = '150px'
            img.style.maxHeight = '150px'
            root.appendChild(img)
            
            root.appendChild(span(`${name}${isClone ? ' (clone)' : ''}`))

            return root
        } catch {
            return span("Unknown")
        }
    }

    get target() {
        return vm.runtime.getTargetById(this.targetId)
    }
}

const Target = {
    Type: jwTargetType,
    Block: {
        blockType: BlockType.REPORTER,
        blockShape: BlockShape.OCTAGONAL,
        forceOutputType: "Target",
        disableMonitor: true
    },
    Argument: {
        check: ["Target"],
        shape: BlockShape.OCTAGONAL
    }
}

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
}

class Extension {
    constructor() {
        vm.runtime.on("SPRITE_RENAMED", (change) => {
          if (!vm.editingTarget) return;

          let hasRefreshReason = false;
          for (const block of Object.values(vm.editingTarget.blocks._blocks)) {
            if (block.opcode === 'jwTargets_menu_sprite') {
              const field = block.fields.sprite;
              if (field.value === change.old) {
                field.value = change.new;
                if (block.parent) hasRefreshReason = true;
              }
            }
          }

          if (hasRefreshReason) vm.runtime.requestBlocksUpdate();
        });

        vm.jwTargets = Target
        vm.runtime.registerSerializer(
            "jwTargets", 
            v => v.targetId, 
            v => new Target.Type(v)
        );

        if (!vm.jwArray) vm.extensionManager.loadExtensionIdSync('jwArray')
        jwArray = vm.jwArray

        /*let oldInitDrawable = vm.exports.RenderedTarget.prototype.initDrawable
        vm.exports.RenderedTarget.prototype.initDrawable = function(...args) {
            oldInitDrawable.call(this, ...args)

            if (!this.isOriginal) {
                this.runtime.startHats(
                    'jwTargets_whenStart', {TARGET: new Target.Type(this.id)}, this
                );
            }
        }*/
    }

    getInfo() {
        return {
            id: "jwTargets",
            name: "Targets",
            color1: "#4254f5",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgeG1sbnM6Yng9Imh0dHBzOi8vYm94eS1zdmcuY29tIj4KICA8Y2lyY2xlIHN0eWxlPSJzdHJva2Utd2lkdGg6IDJweDsgcGFpbnQtb3JkZXI6IHN0cm9rZTsgZmlsbDogcmdiKDY2LCA4NCwgMjQ1KTsgc3Ryb2tlOiByZ2IoNDAsIDU1LCAxOTkpOyIgY3g9IjEwIiBjeT0iMTAiIHI9IjkiPjwvY2lyY2xlPgogIDxwYXRoIGQ9Ik0gMTAgMy4yMjIgQyA0Ljc4MyAzLjIyMiAxLjUyMyA4Ljg3IDQuMTMgMTMuMzg5IEMgNS4zNCAxNS40ODUgNy41OCAxNi43NzggMTAgMTYuNzc4IEMgMTUuMjE4IDE2Ljc3OCAxOC40OCAxMS4xMyAxNS44NjkgNi42MTEgQyAxNC42NjEgNC41MTUgMTIuNDIyIDMuMjIyIDEwIDMuMjIyIE0gMTAgNS40ODEgQyAxMy40NzkgNS40ODEgMTUuNjUzIDkuMjQ4IDEzLjkxMyAxMi4yNTkgQyAxMy4xMDYgMTMuNjU4IDExLjYxNiAxNC41MTkgMTAgMTQuNTE5IEMgNi41MjIgMTQuNTE5IDQuMzUgMTAuNzUyIDYuMDg3IDcuNzQxIEMgNi44OTUgNi4zNDIgOC4zODUgNS40ODEgMTAgNS40ODEgTSAxMCA3Ljc0MSBDIDguMjYyIDcuNzQxIDcuMTczIDkuNjIyIDguMDQ0IDExLjEzIEMgOC40NDggMTEuODI4IDkuMTkzIDEyLjI1OSAxMCAxMi4yNTkgQyAxMS43NCAxMi4yNTkgMTIuODI3IDEwLjM3OCAxMS45NTYgOC44NyBDIDExLjU1MyA4LjE3MiAxMC44MDggNy43NDEgMTAgNy43NDEiIGZpbGw9IiNmZmYiIHN0eWxlPSIiPjwvcGF0aD4KPC9zdmc+",
            blocks: [
                {
                    opcode: 'this',
                    text: 'this target',
                    hideFromPalette: true,
                    ...Target.Block
                },
                {
                    opcode: 'stage',
                    text: 'stage target',
                    hideFromPalette: true,
                    ...Target.Block
                },
                {
                    opcode: 'fromName',
                    text: '[SPRITE] target',
                    arguments: {
                        SPRITE: {
                            menu: "sprite"
                        }
                    },
                    ...Target.Block
                },
                {
                    opcode: 'cloneOrigin',
                    text: 'origin of [TARGET]',
                    arguments: {
                        TARGET: Target.Argument
                    },
                    ...Target.Block
                },
                '---',
                {
                    opcode: 'get',
                    text: '[TARGET] [MENU]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        TARGET: Target.Argument,
                        MENU: {
                            menu: "targetProperty",
                            defaultValue: "name"
                        }
                    }
                },
                {
                    opcode: 'set',
                    text: 'set [TARGET] [MENU] to [VALUE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TARGET: Target.Argument,
                        MENU: {
                            menu: "targetPropertySet",
                            defaultValue: "x"
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true
                        }
                    }
                },
                '---',
                {
                    opcode: 'isClone',
                    text: 'is [TARGET] a clone',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        TARGET: Target.Argument
                    }
                },
                {
                    opcode: 'isTouching',
                    text: 'is [A] touching [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: Target.Argument,
                        B: Target.Argument
                    }
                },
                {
                    opcode: 'isTouchingObject',
                    text: 'is [A] touching [B]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        A: Target.Argument,
                        B: {
                            menu: "touchingObject"
                        },
                    }
                },
                '---',
                {
                    opcode: 'getVar',
                    text: 'var [NAME] of [TARGET]',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    arguments: {
                        TARGET: Target.Argument,
                        NAME: {
                            type: ArgumentType.STRING
                        }
                    }
                },
                {
                    opcode: 'setVar',
                    text: 'set var [NAME] of [TARGET] to [VALUE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TARGET: Target.Argument,
                        NAME: {
                            type: ArgumentType.STRING
                        },
                        VALUE: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true
                        }
                    }
                },
                '---',
                {
                    opcode: 'clone',
                    text: 'create clone of [TARGET]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TARGET: Target.Argument
                    }
                },
                {
                    opcode: 'cloneR',
                    text: 'create clone of [TARGET]',
                    arguments: {
                        TARGET: Target.Argument
                    },
                    ...Target.Block
                },
                {
                    opcode: 'deleteClone',
                    text: 'delete clone [TARGET]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        TARGET: Target.Argument
                    }
                },
                '---',
                {
                    opcode: 'all',
                    text: 'all targets',
                    ...jwArray.Block
                },
                {
                    opcode: 'touching',
                    text: 'targets touching [TARGET]',
                    arguments: {
                        TARGET: Target.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'clones',
                    text: 'clones of [TARGET]',
                    arguments: {
                        TARGET: Target.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: 'arrayHasTarget',
                    text: '[ARRAY] has clone of [TARGET]',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        ARRAY: jwArray.Argument,
                        TARGET: Target.Argument
                    }
                },
                /*'---',
                {
                    opcode: 'whenStart',
                    text: 'when I start as a clone of [TARGET]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        TARGET: Target.Argument
                    }
                },*/
                '---',
                {
                    blockType: BlockType.XML,
                    xml: `<block type="control_run_as_sprite" />`
                }
            ],
            menus: {
                sprite: {
                    acceptReporters: true,
                    items: 'getSpriteMenu'
                },
                targetProperty: {
                    acceptReporters: true,
                    items: [
                        "name",
                        "id",
                        "x",
                        "y",
                        "direction",
                        "size",
                        "stretch x",
                        "stretch y",
                        "costume #",
                        "costume name",
                        "visible",
                        "layer",
                        "volume"
                    ]
                },
                targetPropertySet: {
                    acceptReporters: true,
                    items: [
                        "x",
                        "y",
                        "direction",
                        "size",
                        "stretch x",
                        "stretch y",
                        "costume #",
                        "costume name",
                        "visible",
                        "layer",
                        "volume"
                    ]
                },
                touchingObject: [
                    { text: "mouse-pointer", value: "_mouse_" },
                    { text: "edge", value: "_edge_" }
                ]
            }
        };
    }

    getSpriteMenu({}) {
        let sprites = ["this", "stage"]
        for (let target of vm.runtime.targets.filter(v => v !== vm.runtime._stageTarget)) {
            if (!sprites.includes(target.sprite.name)) sprites.push(target.sprite.name)
        }
        return sprites
    }

    this({}, util) {
        return new Target.Type(util.target.id)
    }

    stage() {
        return new Target.Type(vm.runtime._stageTarget.id)
    }

    fromName({SPRITE}, util) {
        SPRITE = Cast.toString(SPRITE)
        if (SPRITE == "this") return this.this({}, util)
        if (SPRITE == "stage") return this.stage()
        let target = vm.runtime.getSpriteTargetByName(SPRITE)
        return new Target.Type(target ? target.id : "")
    }

    cloneOrigin({TARGET}, util) {
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return ""

        return this.fromName({SPRITE: TARGET.target.sprite.name}, util)
    }

    get({TARGET, MENU}) {
        TARGET = Target.Type.toTarget(TARGET)
        MENU = Cast.toString(MENU)

        if (!TARGET.target) return ""

        switch(MENU) {
            case "name": return TARGET.target.sprite.name
            case "id": return TARGET.target.id
            case "x": return TARGET.target.x
            case "y": return TARGET.target.y
            case "direction": return TARGET.target.direction
            case "size": return TARGET.target.size
            case "stretch x": return TARGET.target.stretch[0]
            case "stretch y": return TARGET.target.stretch[1]
            case "costume #": return TARGET.target.currentCostume + 1
            case "costume name": return TARGET.target.getCurrentCostume().name
            case "visible": return TARGET.target.visible
            case "layer": return TARGET.target.getLayerOrder()
            case "volume": return TARGET.target.volume
        }

        return ""
    }

    set({TARGET, MENU, VALUE}) {
        TARGET = Target.Type.toTarget(TARGET)
        MENU = Cast.toString(MENU)

        if (!TARGET.target) return

        switch(MENU) {
            case "x":
                TARGET.target.setXY(Cast.toNumber(VALUE), TARGET.target.y)
                break
            case "y":
                TARGET.target.setXY(TARGET.target.x, Cast.toNumber(VALUE))
                break
            case "direction":
                TARGET.target.setDirection(Cast.toNumber(VALUE))
                break
            case "size":
                TARGET.target.setSize(Cast.toNumber(VALUE))
                break
            case "stretch x":
                TARGET.target.setStretch(Cast.toNumber(VALUE), TARGET.target.stretch[1])
                break
            case "stretch y":
                TARGET.target.setStretch(TARGET.target.stretch[0], Cast.toNumber(VALUE))
                break
            case "costume #":
                TARGET.target.setCostume(Cast.toNumber(VALUE) - 1)
                break
            case "costume name":
                let index = TARGET.target.getCostumes().indexOf(TARGET.target.getCostumes().find(v => v.name === Cast.toString(VALUE)))
                TARGET.target.setCostume(index)
                break
            case "visible":
                TARGET.target.setVisible(Cast.toBoolean(VALUE))
                break
            case "layer":
                vm.runtime.ext_scratch3_looks.setSpriteLayer({NUM: VALUE}, {target: TARGET.target})
                break
            case "volume":
                vm.runtime.ext_scratch3_sound._updateVolume(Cast.toNumber(VALUE), TARGET.target)
                break
        }
    }

    isClone({TARGET}) {
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return false

        return !TARGET.target.isOriginal
    }

    isTouching({A, B}) {
        A = Target.Type.toTarget(A)
        B = Target.Type.toTarget(B)

        if (!A.target || !B.target) return false

        return A.target.isTouchingTarget(B.target.id)
    }

    isTouchingObject({A, B}) {
        A = Target.Type.toTarget(A)

        if (!A.target) return false

        return A.target.isTouchingObject(B)
    }

    getVar({TARGET, NAME}) {
        TARGET = Target.Type.toTarget(TARGET)
        NAME = Cast.toString(NAME)
        if (!TARGET.target) return ""

        let variable = Object.values(TARGET.target.variables).find(v => v.name == NAME)
        if (!variable) return ""

        return variable.value
    }

    setVar({TARGET, NAME, VALUE}) {
        TARGET = Target.Type.toTarget(TARGET)
        NAME = Cast.toString(NAME)
        if (!TARGET.target) return

        let variable = Object.values(TARGET.target.variables).find(v => v.name == NAME)
        if (!variable) return

        variable.value = VALUE
    }

    clone(args) {
        this.cloneR(args)
    }

    cloneR({TARGET}) {
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return

        let origin = TARGET.target
        let clone = origin.makeClone()

        if (clone) {
            vm.runtime.addTarget(clone)
            clone.goBehindOther(origin) //mimick clone making from control category
        }

        return new Target.Type(clone ? clone.id : "")
    }

    deleteClone({TARGET}) {
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return
        if (TARGET.target.isOriginal) return

        vm.runtime.stopForTarget(TARGET.target)
        vm.runtime.disposeTarget(TARGET.target)
    }

    all() {
        return new jwArray.Type(vm.runtime.targets.map(v => new Target.Type(v.id)))
    }

    touching({TARGET}) {
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return new jwArray.Type

        let targets = vm.runtime.targets
        targets = targets.filter(v => v !== TARGET && !v.isStage)
        targets = targets.filter(v => v.isTouchingTarget(TARGET.targetId))
        return new jwArray.Type(targets.map(v => new Target.Type(v.id)))
    }

    clones({TARGET}) {
        TARGET = Target.Type.toTarget(TARGET)
        if (TARGET.target) {
            return new jwArray.Type(TARGET.target.sprite.clones.filter(v => !v.isOriginal).map(v => new Target.Type(v.id)))
        }
        return new jwArray.Type()
    }

    arrayHasTarget({ARRAY, TARGET}) {
        ARRAY = jwArray.Type.toArray(ARRAY)
        TARGET = Target.Type.toTarget(TARGET)
        if (!TARGET.target) return false

        return ARRAY.array.find(v => {
            let target = Target.Type.toTarget(v)
            if (!target.target) return false
            return target.target.sprite == TARGET.target.sprite
        }) !== undefined
    }
}

module.exports = Extension
