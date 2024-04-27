const Cast = require('../util/cast');
const { validateArray } = require('../util/json-block-utilities');

class Scratch3DataBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            data_variable: this.getVariable,
            data_setvariableto: this.setVariableTo,
            data_changevariableby: this.changeVariableBy,
            data_hidevariable: this.hideVariable,
            data_showvariable: this.showVariable,
            data_listcontents: this.getListContents,
            data_addtolist: this.addToList,
            data_deleteoflist: this.deleteOfList,
            data_deletealloflist: this.deleteAllOfList,
            data_insertatlist: this.insertAtList,
            data_replaceitemoflist: this.replaceItemOfList,
            data_itemoflist: this.getItemOfList,
            data_itemnumoflist: this.getItemNumOfList,
            data_lengthoflist: this.lengthOfList,
            data_listcontainsitem: this.listContainsItem,
            data_hidelist: this.hideList,
            data_showlist: this.showList,
            data_reverselist: this.data_reverselist,
            data_itemexistslist: this.data_itemexistslist,
            data_listisempty: this.data_listisempty,
            data_listarray: this.data_listarray,
            data_arraylist: this.data_arraylist,
            data_listforeachnum: this.data_listforeachnum,
            data_listforeachitem: this.data_listforeachitem
        };
    }

    data_reverselist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        list.value.reverse();
        list._monitorUpToDate = false;
    }
    data_itemexistslist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (index === Cast.LIST_INVALID) {
            return false;
        }
        return true;
    }
    data_listisempty (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return list.value.length < 1;
    }
    data_listarray (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return JSON.stringify(list.value);
    }
    data_arraylist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const array = validateArray(args.VALUE).array
            .map(v => {
                if (typeof v === 'object') return JSON.stringify(v);
                return String(v);
            });
        list.value = array;
    }
    data_listforeachnum (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = list.value.length;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            this.setVariableTo({
                VARIABLE: args.INDEX,
                VALUE: util.stackFrame.loopCounter
            }, util);
            util.startBranch(1, true);
        }
    }
    data_listforeachitem (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = list.value.length;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            this.setVariableTo({
                VARIABLE: args.INDEX,
                VALUE: list.value[util.stackFrame.loopCounter]
            }, util);
            util.startBranch(1, true);
        }
    }

    getVariable (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        return variable.value;
    }

    setVariableTo (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        variable.value = args.VALUE;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, args.VALUE]);
        }
    }

    changeVariableBy (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        const castedValue = Cast.toNumber(variable.value);
        const dValue = Cast.toNumber(args.VALUE);
        const newValue = castedValue + dValue;
        variable.value = newValue;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, newValue]);
        }
    }

    changeMonitorVisibility (id, visible) {
        // Send the monitor blocks an event like the flyout checkbox event.
        // This both updates the monitor state and changes the isMonitored block flag.
        this.runtime.monitorBlocks.changeBlock({
            id: id, // Monitor blocks for variables are the variable ID.
            element: 'checkbox', // Mimic checkbox event from flyout.
            value: visible
        }, this.runtime);
    }

    showVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, true);
    }

    hideVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, false);
    }

    showList (args) {
        this.changeMonitorVisibility(args.LIST.id, true);
    }

    hideList (args) {
        this.changeMonitorVisibility(args.LIST.id, false);
    }

    getListContents (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // If block is running for monitors, return copy of list as an array if changed.
        if (util.thread.updateMonitor) {
            // Return original list value if up-to-date, which doesn't trigger monitor update.
            if (list._monitorUpToDate) return list.value;
            // If value changed, reset the flag and return a copy to trigger monitor update.
            // Because monitors use Immutable data structures, only new objects trigger updates.
            list._monitorUpToDate = true;
            return list.value.slice();
        }

        // Determine if the list is all single letters.
        // If it is, report contents joined together with no separator.
        // If it's not, report contents joined together with a space.
        let allSingleLetters = true;
        for (let i = 0; i < list.value.length; i++) {
            const listItem = list.value[i];
            if (!((typeof listItem === 'string') &&
                  (listItem.length === 1))) {
                allSingleLetters = false;
                break;
            }
        }
        if (allSingleLetters) {
            return list.value.join('');
        }
        return list.value.join(' ');

    }

    addToList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        list.value.push(args.ITEM);
        list._monitorUpToDate = false;
    }

    deleteOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, true);
        if (index === Cast.LIST_INVALID) {
            return;
        } else if (index === Cast.LIST_ALL) {
            list.value = [];
            return;
        }
        list.value.splice(index - 1, 1);
        list._monitorUpToDate = false;
    }

    deleteAllOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        list.value = [];
        return;
    }

    insertAtList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length + 1, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        list.value.splice(index - 1, 0, item);
        list._monitorUpToDate = false;
    }

    replaceItemOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        list.value[index - 1] = item;
        list._monitorUpToDate = false;
    }

    getItemOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, list.value.length, false);
        if (index === Cast.LIST_INVALID) {
            return '';
        }
        return list.value[index - 1];
    }

    getItemNumOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // Go through the list items one-by-one using Cast.compare. This is for
        // cases like checking if 123 is contained in a list [4, 7, '123'] --
        // Scratch considers 123 and '123' to be equal.

        // Store list length to prevent the engine repeatedly accessing the length of the array on each iteration
        // improves performance for large lists
        const length = list.value.length;
        for (let i = 0; i < length; i++) {
            if (Cast.compare(list.value[i], item) === 0) {
                return i + 1;
            }
        }

        // We don't bother using .indexOf() at all, because it would end up with
        // edge cases such as the index of '123' in [4, 7, 123, '123', 9].
        // If we use indexOf(), this block would return 4 instead of 3, because
        // indexOf() sees the first occurence of the string 123 as the fourth
        // item in the list. With Scratch, this would be confusing -- after all,
        // '123' and 123 look the same, so one would expect the block to say
        // that the first occurrence of '123' (or 123) to be the third item.

        // Default to 0 if there's no match. Since Scratch lists are 1-indexed,
        // we don't have to worry about this conflicting with the "this item is
        // the first value" number (in JS that is 0, but in Scratch it's 1).
        return 0;
    }

    lengthOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return list.value.length;
    }

    listContainsItem (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (list.value.indexOf(item) >= 0) {
            return true;
        }
        // Try using Scratch comparison operator on each item.
        // (Scratch considers the string '123' equal to the number 123).

        // Store list length to prevent the engine repeatedly accessing the length of the array on each iteration
        // improves performance for large lists
        const length = list.value.length;
        for (let i = 0; i < length; i++) {
            if (Cast.compare(list.value[i], item) === 0) {
                return true;
            }
        }
        return false;
    }
}

module.exports = Scratch3DataBlocks;
