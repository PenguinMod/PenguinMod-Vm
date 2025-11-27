const ArgumentType = require("../../extension-support/argument-type");
const BlockType = require("../../extension-support/block-type");
const Cast = require("../../util/cast");
const Color = require("../../util/color");

const xmlEscape = function (unsafe) {
    unsafe = Cast.toString(unsafe)
    return unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            case "\"": return "&quot;";
        }
    });
};
const delay = (ms) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

class sharkpoolPrinting {
    constructor(runtime) {
        this.runtime = runtime;
        this.DOMPurify = runtime.renderer.exports.SVGRenderer.DOMPurify;

        // Text Tools
        this.letterInfo = {
            color: "#000000", font: "Arial", size: "12",
            align: "left", letterSpacing: "0", linHeight: "1.2"
        };
        // Image Tools
        this.imgInfo = {
            width: "100",
            height: "100",
            x: 0,
            y: 0,
            rot: 0,
        };

        this.isCameraScreenshotEnabled = false;

        this.lastHTMLtxt = "";
        this.elementsToPrint = [];
        this.printBackground = null;
    }
    getInfo() {
        return {
            id: "sharkpoolPrinting",
            name: "Printing",
            blocks: [
                {
                    opcode: "isPrintingSupported",
                    blockType: BlockType.BOOLEAN,
                    text: "is printing supported?",
                    // actually seems like browsers havent deprecated this even though it causes crashes in certain browsers
                    hideFromPalette: true,
                    disableMonitor: true,
                },
                {
                    opcode: "printElements",
                    blockType: BlockType.COMMAND,
                    text: "print elements and wait",
                },
                '---',
                {
                    opcode: "addElementText",
                    blockType: BlockType.COMMAND,
                    text: "add text [TXT]",
                    arguments: {
                        TXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Hello world!"
                        }
                    },
                },
                {
                    opcode: "addElementScreenshot",
                    blockType: BlockType.COMMAND,
                    text: "add stage screenshot",
                },
                {
                    opcode: "addElementImg",
                    blockType: BlockType.COMMAND,
                    text: "add image [IMG]",
                    arguments: {
                        IMG: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://penguinmod.com/favicon.png"
                        }
                    },
                },
                {
                    opcode: "addElementHtml",
                    blockType: BlockType.COMMAND,
                    text: "add html [HTML]",
                    arguments: {
                        HTML: {
                            type: ArgumentType.STRING,
                            defaultValue: "<h1>Header text</h1><p>Paragraph here</p>"
                        }
                    },
                },
                {
                    opcode: "removeElements",
                    blockType: BlockType.COMMAND,
                    text: "remove all elements",
                },
                { blockType: BlockType.LABEL, text: "Formatting" },
                {
                    opcode: "txtFont",
                    blockType: BlockType.COMMAND,
                    text: "set font to [FONT] size [SZ]",
                    arguments: {
                        FONT: {
                            type: ArgumentType.STRING,
                            defaultValue: "Arial"
                        },
                        SZ: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 12
                        },
                    },
                },
                {
                    opcode: "txtColor",
                    blockType: BlockType.COMMAND,
                    text: "set text color [COLOR]",
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        },
                    },
                },
                {
                    opcode: "txtAlign",
                    blockType: BlockType.COMMAND,
                    text: "align text [ALIGN]",
                    arguments: {
                        ALIGN: {
                            type: ArgumentType.STRING,
                            menu: "ALIGNMENTS"
                        },
                    },
                },
                {
                    opcode: "txtSpacing",
                    blockType: BlockType.COMMAND,
                    text: "set text spacing letter [LET] line [LIN]",
                    arguments: {
                        LET: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        LIN: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1.2
                        },
                    },
                },
                "---",
                {
                    opcode: "imgSize",
                    blockType: BlockType.COMMAND,
                    text: "set image width [W] height [H]",
                    arguments: {
                        W: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 200
                        },
                        H: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 200
                        },
                    },
                },
                {
                    opcode: "imgPos",
                    blockType: BlockType.COMMAND,
                    text: "set image position to x [x] y [y]",
                    arguments: {
                        x: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                    },
                },
                {
                    opcode: "imgRot",
                    blockType: BlockType.COMMAND,
                    text: "set image rotation to [rot]",
                    arguments: {
                        rot: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        },
                    },
                },
                { blockType: BlockType.LABEL, text: "Background" },
                {
                    opcode: "setBGColor",
                    blockType: BlockType.COMMAND,
                    text: "set background color [COLOR]",
                    arguments: {
                        COLOR: {
                            type: ArgumentType.COLOR
                        },
                    },
                },
                {
                    opcode: "setBGImage",
                    blockType: BlockType.COMMAND,
                    text: "set background image [IMG]",
                    arguments: {
                        IMG: {
                            type: ArgumentType.STRING,
                            defaultValue: "https://penguinmod.com/test.png"
                        }
                    },
                },
                {
                    opcode: "setBGRepeat",
                    blockType: BlockType.COMMAND,
                    text: "set background to [BGMODE]",
                    arguments: {
                        BGMODE: {
                            type: ArgumentType.STRING,
                            menu: "BGMODE"
                        },
                    },
                },
                {
                    opcode: "resetBackground",
                    blockType: BlockType.COMMAND,
                    text: "remove background",
                },
                { blockType: BlockType.LABEL, text: "Miscellaneous" },
                {
                    opcode: "elementCount",
                    blockType: BlockType.REPORTER,
                    text: "elements in print"
                },
                {
                    opcode: "lastHTML",
                    blockType: BlockType.REPORTER,
                    text: "last printed html"
                },
            ],
            menus: {
                ALIGNMENTS: {
                    acceptReporters: true,
                    items: ["left", "right", "center"]
                },
                BGMODE: {
                    acceptReporters: true,
                    items: ["repeat", "not repeat", "fill", "stretch"]
                },
            }
        };
    }

    // util
    _getStageScreenshot() {
        // should we look for an external canvas
        if (this.runtime.prism_screenshot_checkForExternalCanvas) {
            // if so, does one exist (this will check for more than 1 in the future)
            if (this.runtime.prism_screenshot_externalCanvas) {
                // we dont need to check camera permissions since external canvases
                // will never have the ability to get camera data
                return this.runtime.prism_screenshot_externalCanvas.toDataURL();
            }
        }

        // renderer will handle not capturing video data
        return new Promise(resolve => {
            this.runtime.renderer.requestSnapshot(uri => {
                resolve(uri);
            });
        });
    }
    _convertToDataURL(stringg, optMimeType) {
        return new Promise((resolve, reject) => {
            const config = {};
            if (optMimeType) {
                config.type = optMimeType;
            }
            const blob = new Blob([stringg], config);

            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                resolve(dataUrl);
            };
            reader.onerror = (er) => {
                reject(er);
            };
            reader.readAsDataURL(blob);
        });
    }
    waitForLoad(element) {
        return new Promise((resolve, reject) => {
            element.onload = resolve;
            element.onerror = reject;
        });
    }
    applyStylings(objectt, element) {
        for (const key in objectt) {
            element.style[key] = objectt[key];
        }
    }

    // Main
    isPrintingSupported() {
        return 'print' in window;
    }
    async printElements() {
        await this.beginPrint();
    }

    // Elements
    addElementText(args) {
        this.prepare(xmlEscape(args.TXT), "txt");
    }
    async addElementScreenshot() {
        const screenshotUrl = await this._getStageScreenshot();
        this.prepare(xmlEscape(screenshotUrl), "img");
    }
    async addElementImg(args) {
        let url = args.IMG;
        const canFetch = await this.runtime.vm.securityManager.canFetch(url);
        if (!canFetch) {
            url = 'https://penguinmod.com/notallowed.png';
        }
        this.prepare(xmlEscape(url), "img");
    }
    async addElementHtml(args) {
        const html = args.HTML;
        const dataUrl = await this._convertToDataURL(html, 'text/html');
        const canEmbed = await this.runtime.vm.securityManager.canEmbed(dataUrl);
        if (!canEmbed) return;
        this.prepare(html, "html");
    }
    removeElements() {
        this.elementsToPrint = [];
    }

    // Formatting
    txtFont(args) {
        this.letterInfo.font = xmlEscape(args.FONT);
        this.letterInfo.size = Cast.toNumber(args.SZ);
    }
    txtColor(args) {
        const rgb = Cast.toRgbColorObject(args.COLOR);
        const hex = Color.rgbToHex(rgb);
        this.letterInfo.color = xmlEscape(hex);
    }
    txtAlign(args) {
        this.letterInfo.align = xmlEscape(args.ALIGN);
    }
    txtSpacing(args) {
        this.letterInfo.letterSpacing = Cast.toNumber(args.LET);
        this.letterInfo.linHeight = Cast.toNumber(args.LIN);
    }

    imgSize(args) {
        this.imgInfo.width = Cast.toNumber(args.W);
        this.imgInfo.height = Cast.toNumber(args.H);
    }
    imgPos(args) {
        this.imgInfo.x = Cast.toNumber(args.x);
        this.imgInfo.y = Cast.toNumber(args.y);
    }
    imgRot(args) {
        this.imgInfo.rot = Cast.toNumber(args.rot) - 90;
    }

    // Background
    setBGColor(args) {
        if (!this.printBackground) this.printBackground = {};
        const rgb = Cast.toRgbColorObject(args.COLOR);
        const hex = Color.rgbToHex(rgb);
        this.printBackground.color = hex;
    }
    async setBGImage(args) {
        let url = args.IMG;
        const canFetch = await this.runtime.vm.securityManager.canFetch(url);
        if (!canFetch) return;

        if (!this.printBackground) this.printBackground = {};
        this.printBackground.image = url;
    }
    setBGRepeat(args) {
        if (!this.printBackground) this.printBackground = {};
        this.printBackground.bgmode = args.BGMODE;
    }
    resetBackground() {
        this.printBackground = null;
    }

    // Miscellaneous
    elementCount() {
        return this.elementsToPrint.length;
    }
    lastHTML() {
        return this.lastHTMLtxt;
    }

    prepare(content, type) {
        const element = {};
        element.type = type;

        switch (type) {
            case 'txt': {
                element.style = {};
                element.style.fontFamily = this.letterInfo.font;
                element.style.fontSize = `${this.letterInfo.size}px`;
                element.style.color = this.letterInfo.color;
                element.style.textAlign = this.letterInfo.align;
                element.style.letterSpacing = `${this.letterInfo.letterSpacing}px`;
                element.style.lineHeight = `${this.letterInfo.linHeight}px`;

                element.textContent = content;
                break;
            }
            case 'img': {
                element.style = {};
                element.width = this.imgInfo.width;
                element.height = this.imgInfo.height;
                element.style.display = "block";
                element.style.transform = `translate(${Cast.toNumber(this.imgInfo.x)}px, ${Cast.toNumber(this.imgInfo.y)}px) rotate(${Cast.toNumber(this.imgInfo.rot)}deg)`;

                element.src = content;
                break;
            }
            case 'html': {
                element.html = this.DOMPurify.sanitize(content);
                break;
            }
        }

        this.elementsToPrint.push(element);
    }
    async beginPrint() {
        const modal = document.createElement("div");

        const imageElements = [];
        for (const element of this.elementsToPrint) {
            switch (element.type) {
                case 'txt': {
                    const txtDoc = document.createElement("div");
                    this.applyStylings(element.style, txtDoc);
                    txtDoc.textContent = element.textContent;
                    modal.appendChild(txtDoc);
                    break;
                }
                case 'img': {
                    const imgDoc = document.createElement("img");
                    imgDoc.width = element.width;
                    imgDoc.height = element.height;
                    this.applyStylings(element.style, imgDoc);
                    imgDoc.src = element.src;
                    modal.appendChild(imgDoc);
                    imageElements.push(imgDoc);
                    break;
                }
                case 'html': {
                    // sanitization happens on element preperation
                    modal.innerHTML += element.html;
                    break;
                }
            }
        }

        this.lastHTMLtxt = modal.innerHTML;
        const printWindow = window.open(
            "",
            "Document",
            `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,width=720,height=720,left=10,top=10`
        );
        if (printWindow) {
            printWindow.document.body.appendChild(modal);
            printWindow.document.title = 'Document';
            if (this.printBackground) {
                const bg = this.printBackground;
                const style = document.createElement('style');
                let innerHTML = 'body {\nbackground-attachment: fixed;\n';
                if (bg.color) {
                    innerHTML += `background: ${xmlEscape(bg.color)};`;
                }
                if (bg.image) {
                    innerHTML += `background-image: url(${JSON.stringify(xmlEscape(bg.image))});`;
                }
                if (bg.bgmode) {
                    let repeat = 'no-repeat';
                    switch (bg.bgmode) {
                        case 'repeat':
                            repeat = 'repeat';
                        case 'not repeat':
                            innerHTML += `background-repeat: ${repeat};`;
                            break;
                        case 'stretch':
                            innerHTML += `background-size: 100% 100%;`;
                            break;
                        case 'fill':
                            innerHTML += `background-size: 100%;`;
                            break;
                    }
                }
                innerHTML += '\n}';
                style.innerHTML = innerHTML;
                printWindow.document.head.appendChild(style);
                // wait for bg image load
                if (bg.image) {
                    const imageEl = new Image();
                    imageEl.style = 'position: absolute; left: 0px; top: 0px;'
                    try {
                        const promise = this.waitForLoad(imageEl);
                        imageEl.src = bg.image;
                        printWindow.document.head.appendChild(imageEl);
                        await promise;
                    } finally {
                        imageEl.remove();
                    }
                }
            }
            // wait for images to load if they exist
            if (imageElements.length > 0) {
                for (const imageEl of imageElements) {
                    try {
                        await this.waitForLoad(imageEl);
                    } catch (e) {
                        console.warn('Failed to load', imageEl, e);
                    }
                }
            }
            await delay(50); // browser tends to need just a little bit even after we waited for all the assets
            // packaged applications tend to require await on window prompts, print is a prompting api
            await printWindow.print();
            printWindow.close();
            modal.remove();
        } else {
            console.error("Unable to open print window");
        }
    }
}

module.exports = sharkpoolPrinting;
