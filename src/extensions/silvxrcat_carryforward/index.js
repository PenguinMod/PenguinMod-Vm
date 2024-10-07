const BlockType = Scratch.BlockType;
const ArgumentType = Scratch.ArgumentType;
const cstore = require('./iterStore');
const store = new cstore();

class CarryForwards {
    constructor(runtime) {
        this.runtime = runtime;
    }
    // stolen code from gsa edited for this stuff
    deserialize(data) {
        store.iterators = {};
        for (const iter of data) {
            store.newIterator(iter.name, iter.value, iter.id);
        }
    }

    serialize() {
        return store.getAllIterators()
            .map(variable => ({
                name: variable.name,
                value: variable.value,
                id: variable.id,
                calc: variable.calc
            }));
    }

    orderCategoryBlocks(blocks) {
        const button = blocks[0];
        const varBlock = blocks[1];
        delete blocks[0];
        delete blocks[1];
        const varBlocks = store.getAllIterators().map(i => varBlock
            .replace('{iterId}', i.id));
        if (!varBlocks.length) {
            return [button];
        }
        varBlocks
            .reverse()
            .push(button);
        blocks = varBlocks
            .reverse()
            .concat(blocks);
        return blocks;
    }
    // not stolen code
    getInfo() {
        return {
            id: "carryforwards",
            name: "CarryForwards",
            color1: "#75cc50",
            color2: "#41ab4a",
            color3: "#41ab4a",
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'createIterator',
                    blockType: BlockType.BUTTON,
                    text: 'create iterator',
                },
                {
                    opcode: 'iterGetter',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: '{iterId}'
                        }
                    },
                    text: '[iter]'
                },
                {
                    blockType: BlockType.LABEL,
                    text: 'Edit',
                },
                {
                    opcode: 'setFrequency',
                    blockType: BlockType.COMMAND,
                    text: 'set frequency of [iter] to [f]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        },
                        f: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                },
                {
                    opcode: 'setReaction',
                    blockType: BlockType.COMMAND,
                    text: 'set reaction speed of [iter] to [r]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        },
                        r: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                },
                {
                    opcode: 'setZeta',
                    blockType: BlockType.COMMAND,
                    text: 'set zeta of [iter] to [z]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        },
                        z: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.5
                        }
                    },
                },
                '---',
                {
                    opcode: 'initializeIterator',
                    blockType: BlockType.COMMAND,
                    text: 'initialize core values of [iter]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        }
                    },
                },
                {
                    blockType: BlockType.LABEL,
                    text: 'Execute',
                },
                {
                    opcode: 'stepIterator',
                    blockType: BlockType.COMMAND,
                    text: 'step [iter] to [x] with time dialiation [t]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        },
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        t: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.1
                        }
                    },
                },
                {
                    opcode: 'setIterator',
                    blockType: BlockType.COMMAND,
                    text: 'set [iter] to [x]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        },
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    },
                },
                {
                    blockType: BlockType.LABEL,
                    text: 'Information',
                },
                {
                    opcode: 'getIteratorFrequency',
                    blockType: BlockType.REPORTER,
                    text: 'frequency of [iter]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        }
                    },
                },
                {
                    opcode: 'getIteratorReaction',
                    blockType: BlockType.REPORTER,
                    text: 'reaction time of [iter]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        }
                    },
                },
                {
                    opcode: 'getIteratorZeta',
                    blockType: BlockType.REPORTER,
                    text: 'zeta of [iter]',
                    arguments: {
                        iter: {
                            type: ArgumentType.STRING,
                            menu: 'iterators',
                            defaultValue: ""
                        }
                    },
                },
            ],
            menus: {
                iterators: {
                    acceptReporters: true,
                    items: this.getIteratorItems()
                }
            }
        };
    }

    getIteratorItems() {
        let items = store.getAllIterators();
        if (items.length < 1) return {text: '', value: ''};
        return items.map(i => ({
            text: i.name,
            value: i.id
        }))
    }

    createIterator() {
        const pi = prompt("Iterator name?", "default");
        if (!pi) return;
        if (store.getIteratorByName(pi)) return alert("Iterator name already exists");
        store.newIterator(pi);
        vm.emitWorkspaceUpdate();
        this.serialize();
    }

    iterGetter(args) {
        return store.getIterator(args.iter).value;
    }

    setFrequency(args) {
        store.setCalcValue(args.iter, 'f', args.f);
    }

    setReaction(args) {
        store.setCalcValue(args.iter, 'r', args.r);
    }

    setZeta(args) {
        store.setCalcValue(args.iter, 'zeta', args.z);
    }

    initializeIterator(args) {
        const { iter, f, r, zeta, value } = store.getIterator(args.iter).calc;
        const pi = Math.PI;
        Object.assign(iter.calc, {
            k1: zeta / (pi * f),
            k2: 1 / ((2 * pi * f) ** 2),
            k3: (r * zeta) / (2 * pi * f),
            xp: value,
            y: value,
            yd: 0
        });
    }
    
    stepIterator(args) {
        const { t, x, iter } = args;
        const { xp, k1, k2, k3, y, yd } = store.getIterator(iter).calc;
        const xd = (x - xp) / t;
        iter.calc.xp = x;
        const approx = 1.1 * (((t ** 2) / 4) + ((t * k1) / 2));
        if (k2 < approx) iter.calc.k2 = approx;
        iter.calc.y += t * yd;
        iter.calc.yd += (t * (((x + (k3 * xd)) - y) - (k1 * yd))) / k2;
        iter.value = iter.calc.y;
    }

    setIterator(args) {
        const { iter, x } = args;
        store.getIterator(iter).value = x;
        store.getIterator(iter).calc.y = x;
    }

    getIteratorFrequency(args) {
        return store.getIterator(args.iter).calc.f;
    }

    getIteratorReaction(args) {
        return store.getIterator(args.iter).calc.r;
    }

    getIteratorZeta(args) {
        return store.getIterator(args.iter).calc.zeta;
    }
}

module.exports = CarryForwards;
