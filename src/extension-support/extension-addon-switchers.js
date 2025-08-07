const log = require("../util/log");
const switches = {};
const parser = new DOMParser();

const define_error_noop = (msg) => {
    log.warn(msg);
    return {
        msg,
        isNoop: true,
        isError: true,
    };
};

function get_extension_switches(id, blocks) {
    let _switches = {};
    for (let block of blocks) {
        var blockswitches = block.info.switches;
        if (!blockswitches) continue;
        let opcode = block.info.opcode;
        _switches[opcode] = blockswitches.map(current => {
            switch (typeof current) {
                case "object":
                    break;
                case "string":
                    current = { opcode: current };
                    break;
                default:
                    return define_error_noop((typeof current) + " disallowed");
            }

            if (current.isNoop) {
                return {
                    isNoop: true,
                    msg: current.overwriteText ?? block.info.switchText ?? block.info.text
                };
            }

            if (!current.opcode) {
                return define_error_noop("No defined opcode");
            }

            let get_block = blocks.find(e => e.info.opcode === current.opcode);
            if (!get_block) {
                return define_error_noop(`Block ${current.opcode} doesn't exist`);
            }

            let createInputs = {};
            let currargs = current.createArguments ?? {};

            parser.parseFromString(get_block.xml, "text/xml")
                .querySelectorAll(`[type="${get_block.json.type}"] > value`)
                .forEach(el => {
                    let name = el.getAttribute("name");
                    if (
                        !!block.info.arguments[name]
                        && !(current.remapArguments ?? {})[name]
                    ) return;
                    if (Object.values(current.remapArguments ?? {}).includes(name)) return;

                    let shadowType = el.getElementsByTagName("shadow")[0].getAttribute("type");

                    let value = (currargs[name] ?? get_block.info.arguments[name].defaultValue ?? "").toString();

                    createInputs[name] = {
                        shadowType,
                        value
                    };
                });

            const splitInputs = Object.keys(block.info.arguments)
                .filter(arg =>
                    !!get_block.info.arguments[arg]
                    && !!(current.remapArguments ?? {})[arg]
                    && !Object.values(current.remapArguments ?? {}).includes(arg)
                );

            const remapShadowType = {};

            parser.parseFromString(block.xml, "text/xml")
                .querySelectorAll(`[type="${block.json.type}"] > value`)
                .forEach(el => {
                    let name = el.getAttribute("name");
                    if ((current.remapArguments ?? {})[name]) name = current.remapArguments[name];
                    if (!get_block.info.arguments[name]) return;

                    let shadowType = el.querySelector("shadow")
                    if (!shadowType) return;
                    shadowType = shadowType.getAttribute("type");

                    remapShadowType[name] = shadowType;
                });

            parser.parseFromString(get_block.xml, "text/xml")
                .querySelectorAll(`[type="${get_block.json.type}"] > value`)
                .forEach(el => {
                    let name = el.getAttribute("name");
                    if (!remapShadowType[name]) return;

                    let shadowType = el.querySelector("shadow");
                    if (!shadowType) return;
                    shadowType = shadowType.getAttribute("type");

                    if (remapShadowType[name] == shadowType) {
                        delete remapShadowType[name];
                        return;
                    }
                    remapShadowType[name] = shadowType;
                });

            return {
                opcode: `${id}_${current.opcode}`,
                msg: current.overwriteText ?? get_block.info.switchText ?? get_block.info.text,

                mapFieldValues: current.remapMenus ?? {},
                remapInputName: current.remapArguments ?? {},

                createInputs,
                splitInputs,
                remapShadowType,
            };
        });
    }
    return _switches;
}

function getSwitches({runtime}) {
    for (let ext of runtime._blockInfo) {
        if (ext.id in switches) continue;
        switches[ext.id] = get_extension_switches(ext.id, ext.blocks);
    }
    return switches;
}

module.exports = getSwitches;
module.exports.get_extension_switches = get_extension_switches;
module.exports.noopSwitch = { isNoop: true };
