const uid = require('../../util/uid');

class iterStore {
    constructor() {
        this.iterators = {};
    }

    getIterator(id) {
        return this.iterators[id];
    }

    deleteIterator(id) {
        const o = this.iterators[id];
        delete this.iterators[id];
        return o;
    }

    newIterator(name, starter, opt_id) {
        starter = starter || 0;   
        const id = opt_id || uid();
        const data = {
            name: name,
            id: id,
            value: starter,
            calc: {
                f: 1,
                r: 1,
                zeta: 0.5,
                k1: 0,
                k2: 0,
                k3: 0,
                xp: 0,
                y: 0,
                yd: 0
            }
        };
        this.iterators[id] = data;
        return data;
    }

    getIteratorByName(name) {
        return Object.values(this.iterators).find((i) => i.name === name);
    }

    getAllIterators() {
        return Object.values(this.iterators);
    }
}

module.exports = iterStore;
