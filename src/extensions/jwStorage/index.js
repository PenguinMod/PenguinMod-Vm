const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const TargetType = require('../../extension-support/target-type')
const Cast = require('../../util/cast')

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
}

class Extension {
    constructor() {
        if (!vm.jwArray) vm.extensionManager.loadExtensionIdSync('jwArray')
        jwArray = vm.jwArray
    }

    getInfo() {
        return {
            id: "jwStorage",
            name: "Storage",
            color1: "#555555",
            blocks: [
                {
                    opcode: 'getFile',
                    text: 'get file [NAME] as [TYPE]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "file.txt"
                        },
                        TYPE: {
                            menu: "fileExportType",
                            defaultValue: "text"
                        }
                    }
                },
                {
                    opcode: 'fileExists',
                    text: 'file/directory [NAME] exists?',
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "file.txt"
                        }
                    }
                },
                "---",
                {
                    opcode: 'getAllFiles',
                    text: 'get all files',
                    ...jwArray.Block
                },
                {
                    opcode: 'getAllDirectories',
                    text: 'get all directories',
                    ...jwArray.Block
                },
                {
                    opcode: 'getFilesInFolder',
                    text: 'get files in directory [NAME]',
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: "folder"
                        }
                    },
                    ...jwArray.Block
                }
            ],
            menus: {
                fileExportType: [
                    "text",
                    "base64"
                ],
            }
        };
    }

    async getFile({NAME, TYPE}) {
        if (!vm._projectZip.files["extraAssets/"]) return ""

        NAME = Cast.toString(NAME)
        TYPE = Cast.toString(TYPE)

        let file = vm._projectZip.folder("extraAssets").file(NAME)
        if (!file) return ""

        switch (TYPE) {
            case "text": return await file.async("text")
            case "base64": return await file.async("base64")
            default: return ""
        }
    }

    fileExists({NAME}) {
        if (!vm._projectZip.files["extraAssets/"]) return ""

        NAME = Cast.toString(NAME)

        if (NAME.endsWith("/")) {
            let dir = vm._projectZip.files[`extraAssets/${NAME}`]
            return !!dir
        } else {
            let file = vm._projectZip.folder("extraAssets").file(NAME)
            return !!file
        }
    }

    getAllFiles() {
        if (!vm._projectZip.files["extraAssets/"]) return new jwArray.Type()

        return new jwArray.Type(Object.values(vm._projectZip.files).filter(v => v.name.startsWith("extraAssets/") && !v.dir).map(v => v.name.substring(12)))
    }

    getAllDirectories() {
        if (!vm._projectZip.files["extraAssets/"]) return new jwArray.Type()

        return new jwArray.Type(Object.values(vm._projectZip.files).filter(v => v.name.startsWith("extraAssets/") && v.dir && v.name !== "extraAssets/").map(v => v.name.substring(12)))
    }

    getFilesInFolder({NAME}) {
        if (!vm._projectZip.files["extraAssets/"]) return new jwArray.Type()

        NAME = Cast.toString(NAME)
        if (!NAME.endsWith("/")) return new jwArray.Type()
        
        let rootFolder = `extraAssets/${NAME}`
        return new jwArray.Type(Object.values(vm._projectZip.files).filter(v => v.name.startsWith(rootFolder) && !v.dir).map(v => v.name.substring(rootFolder.length)))
    }
}

module.exports = Extension