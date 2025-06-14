const switches = {};

const noopSwitch = {
    isNoop: true
}

function getSwitches({runtime}) {
    var _switches = switches;
    for (let ext of runtime._blockInfo) {
        if (ext.id in _switches) continue;
        _switches[ext.id] = {};
        for (let block of ext.blocks) {
            var blockswitches = block.info.switches;
            if (!blockswitches) continue;
            let opcode = block.info.opcode;
            _switches[ext.id][opcode] = blockswitches.map(current => {
                if (typeof current === "string") {
                    current = {opcode: current}
                } else if (typeof current !== "object") {
                    return noopSwitch;
                }

                if ("isNoop" in current && current.isNoop) {
                    return {
                        isNoop: true,
                        msg: current.overwriteText ?? block.info.switchText ?? block.info.text
                    };
                }

                if (!("opcode" in current)) {
                    return noopSwitch;
                }

                let get_block = ext.blocks.find(e => e.info.opcode === current.opcode);
                if (!get_block) { // block doesn't exist.
                    return noopSwitch;
                }

                let createInputs = {};
                let currargs = current.createArguments ?? {};

                const parser = new DOMParser();

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
                    .filter(arg => !Object.keys(get_block.info.arguments).includes(arg) && !Object.keys(current.remapArguments ?? {}).includes(arg));

                const remapShadowType = {};

                parser.parseFromString(block.xml, "text/xml")
                    .querySelectorAll(`[type="${block.json.type}"] > value`)
                    .forEach(el => {
                        let name = el.getAttribute("name");
                        if (!(name in get_block.info.arguments)) return;
                        let shadowType = el.querySelector("shadow")
                        if (!shadowType) return;
                        shadowType = shadowType.getAttribute("type");
                        remapShadowType[name] = shadowType;
                    });

                parser.parseFromString(get_block.xml, "text/xml")
                    .querySelectorAll(`[type="${get_block.json.type}"] > value`)
                    .forEach(el => {
                        let name = el.getAttribute("name");
                        if (!(name in remapShadowType)) return;

                        let shadowType = el.querySelector("shadow");
                        if (!shadowType) {
                            return;
                        }
                        shadowType = shadowType.getAttribute("type");

                        if (remapShadowType[name] == shadowType) {
                            delete remapShadowType[name];
                            return;
                        }
                        remapShadowType[name] = shadowType;
                    });

                return {
                    opcode: `${ext.id}_${current.opcode}`,
                    remapInputName: current.remapArguments ?? {},
                    createInputs,
                    splitInputs,
                    remapShadowType,
                    mapFieldValues: current.remapMenus ?? {},
                    msg: current.overwriteText ?? get_block.info.switchText ?? get_block.info.text,
                };
            });
        }
    }
    return _switches;
}

module.exports = getSwitches;
