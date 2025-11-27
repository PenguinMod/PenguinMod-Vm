const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

class Pointer {
    constructor(value) {
        if (value === undefined) value = null
        this.id = jwPointer.pointers.push(value) - 1
    }

    get value() {
        return jwPointer.pointers[this.id] === undefined ? null : jwPointer.pointers[this.id]
    }

    toString() {
        return Cast.toString(this.value)
    }
}

let jwPointer = {
    Type: Pointer,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "jwPointer",
        disableMonitor: true
    },
    Argument: {
        check: ["jwPointer"]
    },

    pointers: []
}

class Extension {
    constructor() {
        vm.jwPointer = jwPointer
    }

    getInfo() {
        return {
            id: "jwPointer",
            name: "Pointers",
            blocks: [
                {
                    opcode: 'create',
                    text: 'create pointer [VALUE]',
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            exemptFromNormalization: true
                        }
                    },
                    ...jwPointer.Block
                },
            ]
        };
    }
}

module.exports = Extension