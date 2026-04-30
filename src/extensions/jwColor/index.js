const BlockType = require('../../extension-support/block-type')
const BlockShape = require('../../extension-support/block-shape')
const ArgumentType = require('../../extension-support/argument-type')
const Cast = require('../../util/cast')

/**
 * @param {number} x
 * @returns {string}
 */
function formatNumber(x) {
    if (x >= 1e6) {
        return x.toExponential(4)
    } else {
        x = Math.floor(x * 1000) / 1000
        return x.toFixed(Math.min(1, (String(x).split('.')[1] || '').length))
    }
}

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.whiteSpace = 'nowrap'
    el.style.width = '100%'
    el.style.textAlign = 'center'
    return el
}

class ColorType {
    customId = "jwColor"

    h = 0
    setHue(x) {
        this.h = (x % 360)
        if (this.h < 0) {
            this.h = 360 + this.h
        }
    }

    s = 0
    setSaturation(x) {
        this.s = Math.max(0, Math.min(x, 1))
    }

    v = 0
    setValue(x) {
        this.v = Math.max(0, Math.min(x, 1))
    }

    constructor(h = 0, s = 0, v = 0) {
        this.setHue(h)
        this.setSaturation(s)
        this.setValue(v)
    }

    static toColor(x) {
        if (x instanceof ColorType) return x
        if (Number(x) == x) return ColorType.fromDecimal(x)
        if (typeof x == 'string') return ColorType.fromHex(x)
        return new ColorType()
    }

    static fromHex(x) {
        if (x.startsWith("#")) x = x.substring(1)
        try {
            if (x.length === 6 || x.length === 8) {
                return ColorType.fromDecimal(Number(`0x${x.slice(0, 6)}`))
            } else if (x.length === 3 || x.length === 4) {
                return ColorType.fromDecimal(Number(`0x${x.slice(0, 3).split("").map(v => v + v).join("")}`))
            }
        } catch {}
        return new ColorType()
    }

    static fromRGB(r, g, b) {
        r = Math.max(0, Math.min(r / 255, 1))
        g = Math.max(0, Math.min(g / 255, 1))
        b = Math.max(0, Math.min(b / 255, 1))

        let v = Math.max(r, g, b), c = v - Math.min(r, g, b)
        let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c))
        return new ColorType(60 * (h < 0 ? h + 6 : h), v && c / v, v)
    }

    static fromDecimal(d) {
        const r = (d >> 16) & 0xFF
        const g = (d >> 8) & 0xFF
        const b = d & 0xFF
        return this.fromRGB(r, g, b)
    }

    jwArrayHandler() {
        let color = document.createElement('div')
        color.style.width = "16px"
        color.style.height = "16px"
        color.style.border = "1px solid black"
        color.style.borderRadius = "4px"
        color.style.boxSizing = "border-box"
        color.style.backgroundColor = `#${this.toHex()}`
        color.style.display = "inline-block"
        color.style.verticalAlign = "text-bottom"

        return color.outerHTML
    }

    toString() {
        return `#${this.toHex()}`
    }
    toMonitorContent = () => span(this.toString())

    toReporterContent() {
        let root = document.createElement('div')
        root.style.display = 'flex'
        root.style.width = "200px"
        root.style.overflow = "hidden"
        let details = document.createElement('div')
        details.style.display = 'flex'
        details.style.flexDirection = 'column'
        details.style.justifyContent = 'center'
        details.style.width = "100px"
        details.appendChild(span(`<b>H:</b> ${formatNumber(Math.round(this.h))}`))
        details.appendChild(span(`<b>S:</b> ${formatNumber(this.s * 100)}%`))
        details.appendChild(span(`<b>V:</b> ${formatNumber(this.v * 100)}%`))
        root.appendChild(details)
        let color = document.createElement('div')
        color.style.width = "84px"
        color.style.height = "84px"
        color.style.margin = "8px"
        color.style.border = "2px solid black"
        color.style.borderRadius = "8px"
        color.style.boxSizing = "border-box"
        color.style.backgroundColor = `#${this.toHex()}`
        root.appendChild(color)
        return root
    }

    toRGB() {
        let f = (n, k = (n + this.h / 60) % 6) => this.v - this.v * this.s * Math.max(Math.min(k, 4 - k, 1), 0)
        return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)]
    }

    toDecimal() {
        let [r, g, b] = this.toRGB()
        return r * 0x10000 + g * 0x100 + b * 0x1
    }

    toHex() {
        return this.toDecimal().toString(16).padStart(6, "0")
    }

    toJSON() {
        return {
            hue: this.h,
            saturation: this.s,
            value: this.v
        }
    }
}

const Color = {
    Type: ColorType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "Color",
        disableMonitor: true
    },
    Argument: {
        type: ArgumentType.COLOR,
        defaultValue: "#ff7aab"
    }
}

class Extension {
    constructor() {
        vm.jwColor = Color
        vm.runtime.registerSerializer(
            "jwColor",
            v => [v.h, v.s, v.v],
            v => new Color.Type(...v)
        );
    }

    getInfo() {
        return {
            id: "jwColor",
            name: "Color",
            color1: "#f04a87",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9ImZpbGw6IHJnYigyNDAsIDc0LCAxMzUpOyBzdHJva2U6IHJnYigyMTYsIDY2LCAxMjIpOyBzdHJva2Utd2lkdGg6IDJweDsgcGFpbnQtb3JkZXI6IHN0cm9rZTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOSIgcnk9IjkiPjwvZWxsaXBzZT4KICA8cGF0aCB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGQ9Ik0gMTIuMTYyIDExLjAxNSBDIDExLjM1OCAxMS44MTkgMTAuNzY1IDEyLjIzMyAxMC4yOTkgMTIuMzkxIEMgMTAuMTYyIDExLjk2OCA5LjkyOSAxMS41NzYgOS42MDEgMTEuMjQ4IEMgOS4yNjIgMTAuOTIgOC44NzEgMTAuNjg3IDguNDQ3IDEwLjUzOCBDIDguNjE3IDEwLjA3MyA5LjAzIDkuNDggOS44MjMgOC42ODcgQyAxMS43MjggNi43NzEgMTUuMTE1IDQuNDMyIDE1Ljc2MSA1LjA3OCBDIDE2LjQwNyA1LjcyMyAxNC4wNjggOS4xMSAxMi4xNjIgMTEuMDE1IFogTSA4LjY1IDE0LjUzOSBDIDguMzM1IDE0Ljg0NCA3LjkyOSAxNSA3LjUyMiAxNS4wMiBMIDcuNTIyIDE1LjAzIEwgNy40MjEgMTUuMDMgQyA0LjY5OCAxNS4xMjggMy41MDkgMTIuMDQ2IDQuNDQ0IDEyLjM2OSBDIDUuNjczIDEyLjc5MiA2LjE3MiAxMi4xODMgNi4xOTEgMTIuMTYzIEMgNi44NzIgMTEuNTE2IDcuOTY5IDExLjUxNiA4LjY1IDEyLjE2MyBDIDkuMzMxIDEyLjgyMSA5LjMzMSAxMy44OTIgOC42NSAxNC41MzkgWiIgaWQ9ImJ1cnNoLWljb24iIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L3BhdGg+Cjwvc3ZnPg==",
            blocks: [
                {
                    opcode: 'newColor',
                    text: 'new color [COLOR]',
                    arguments: {
                        COLOR: Color.Argument
                    },
                    ...Color.Block
                },
                {
                    opcode: 'fromRGB',
                    text: 'from RGB [R] [G] [B]',
                    arguments: {
                        R: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 255
                        },
                        G: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 122
                        },
                        B: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 171
                        }
                    },
                    ...Color.Block
                },
                {
                    opcode: 'fromHSV',
                    text: 'from HSV [H] [S] [V]',
                    arguments: {
                        H: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 338
                        },
                        S: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.52
                        },
                        V: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...Color.Block
                },
                {
                    opcode: 'fromHex',
                    text: 'from hex [HEX]',
                    arguments: {
                        HEX: {
                            type: ArgumentType.STRING,
                            defaultValue: "ff7aab"
                        }
                    },
                    ...Color.Block
                },
                "---",
                {
                    opcode: 'add',
                    text: '[A] + [B]',
                    arguments: {
                        A: Color.Argument,
                        B: Color.Argument
                    },
                    ...Color.Block
                },
                {
                    opcode: 'sub',
                    text: '[A] - [B]',
                    arguments: {
                        A: Color.Argument,
                        B: Color.Argument
                    },
                    ...Color.Block
                },
                {
                    opcode: 'mul',
                    text: '[A] * [B]',
                    arguments: {
                        A: Color.Argument,
                        B: Color.Argument
                    },
                    ...Color.Block
                },
                {
                    opcode: 'interpolate',
                    text: 'interpolate [A] to [B] by [I] using [OPTION]',
                    arguments: {
                        A: Color.Argument,
                        B: Color.Argument,
                        I: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0.5
                        },
                        OPTION: {
                            menu: "interpolateOption"
                        }
                    },
                    ...Color.Block
                },
                "---",
                {
                    opcode: 'get',
                    text: 'get [OPTION] [COLOR]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        COLOR: Color.Argument,
                        OPTION: {
                            menu: "propOption"
                        }
                    }
                },
                {
                    opcode: 'set',
                    text: 'set [OPTION] [COLOR] to [VALUE]',
                    arguments: {
                        COLOR: Color.Argument,
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        OPTION: {
                            menu: "propOption"
                        }
                    },
                    ...Color.Block
                },
                "---",
                {
                    opcode: 'toDecimal',
                    text: '[COLOR] to decimal',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        COLOR: Color.Argument
                    }
                },
                {
                    opcode: 'toHex',
                    text: '[COLOR] to hexadecimal [OPTION]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        COLOR: Color.Argument,
                        OPTION: {
                            menu: "toHexOption"
                        }
                    }
                }
            ],
            menus: {
                interpolateOption: {
                    acceptReporters: true,
                    items: [
                        'RGB',
                        'HSV'
                    ]
                },
                propOption: {
                    acceptReporters: true,
                    items: [
                        'red',
                        'green',
                        'blue',
                        'hue',
                        'saturation',
                        'value'
                    ]
                },
                toHexOption: {
                    acceptReporters: false,
                    items: [
                       'RRGGBB',
                       '#RRGGBB',
                       '0xRRGGBB' 
                    ]
                }
            }
        };
    }

    newColor({COLOR}) {
        return Color.Type.toColor(COLOR)
    }

    fromRGB({R, G, B}) {
        R = Cast.toNumber(R)
        G = Cast.toNumber(G)
        B = Cast.toNumber(B)

        return Color.Type.fromRGB(R, G, B)
    }

    fromHSV({H, S, V}) {
        H = Cast.toNumber(H)
        S = Cast.toNumber(S)
        V = Cast.toNumber(V)

        return new Color.Type(H, S, V)
    }

    fromHex({HEX}) {
        HEX = Cast.toString(HEX)

        return Color.Type.fromHex(HEX)
    }

    add({A, B}) {
        A = Color.Type.toColor(A).toRGB()
        B = Color.Type.toColor(B).toRGB()

        return Color.Type.fromRGB(Math.min(255, A[0] + B[0]), Math.min(255, A[1] + B[1]), Math.min(255, A[2] + B[2]))
    }

    sub({A, B}) {
        A = Color.Type.toColor(A).toRGB()
        B = Color.Type.toColor(B).toRGB()

        return Color.Type.fromRGB(A[0] - B[0], A[1] - B[1], A[2] - B[2])
    }

    mul({A, B}) {
        A = Color.Type.toColor(A).toRGB()
        B = Color.Type.toColor(B).toRGB()

        return Color.Type.fromRGB(A[0] * B[0] / 255, A[1] * B[1] / 255, A[2] * B[2] / 255)
    }

    interpolate({A, B, I, OPTION}) {
        A = Color.Type.toColor(A)
        B = Color.Type.toColor(B)
        I = Math.max(0, Math.min(Cast.toNumber(I), 1))

        switch (OPTION) {
            case "RGB":
                A = A.toRGB()
                B = B.toRGB()

                return Color.Type.fromRGB(A[0] * (1-I) + B[0] * I, A[1] * (1-I) + B[1] * I, A[2] * (1-I) + B[2] * I)
            case "HSV":
                let hueDifference = Math.abs(A.h - B.h)
                if (hueDifference > 180) {
                    return new Color.Type(A.h * (1-I) - (360 - B.h) * I, A.s * (1-I) + B.s * I, A.v * (1-I) + B.v * I)
                } else {
                    return new Color.Type(A.h * (1-I) + B.h * I, A.s * (1-I) + B.s * I, A.v * (1-I) + B.v * I)
                }
            default: return new Color.Type
        }
    }

    get({COLOR, OPTION}) {
        COLOR = Color.Type.toColor(COLOR)

        switch (OPTION) {
            case "red": return COLOR.toRGB()[0]
            case "green": return COLOR.toRGB()[1]
            case "blue": return COLOR.toRGB()[2]
            case "hue": return COLOR.h
            case "saturation": return COLOR.s
            case "value": return COLOR.v
            default: return 0
        }
    }

    set({COLOR, VALUE, OPTION}) {
        COLOR = Color.Type.toColor(COLOR)
        VALUE = Cast.toNumber(VALUE)

        switch (OPTION) {
            case "red": return Color.Type.fromRGB(VALUE, COLOR.toRGB()[1], COLOR.toRGB()[2])
            case "green": return Color.Type.fromRGB(COLOR.toRGB()[0], VALUE, COLOR.toRGB()[2])
            case "blue": return Color.Type.fromRGB(COLOR.toRGB()[0], COLOR.toRGB()[1], VALUE)
            case "hue": return new Color.Type(VALUE, COLOR.s, COLOR.v)
            case "saturation": return new Color.Type(COLOR.h, VALUE, COLOR.v)
            case "value": return new Color.Type(COLOR.h, COLOR.s, VALUE)
        }
    }

    toDecimal({COLOR}) {
        COLOR = Color.Type.toColor(COLOR)

        return COLOR.toDecimal()
    }

    toHex({COLOR, OPTION}) {
        COLOR = Color.Type.toColor(COLOR);

        let hex = COLOR.toHex();

        switch (OPTION) {
            case "#RRGGBB": return `#${hex}`;
            case "0xRRGGBB": return `0x${hex}`;
            default: return hex
        }
    }
}

module.exports = Extension