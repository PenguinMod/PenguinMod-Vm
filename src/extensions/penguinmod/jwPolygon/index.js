const BlockType = require('../../../extension-support/block-type');
const BlockShape = require('../../../extension-support/block-shape');
const ArgumentType = require('../../../extension-support/argument-type');
const Cast = require('../../../util/cast');

function span(text) {
    let el = document.createElement('span')
    el.innerHTML = text
    el.style.display = 'hidden'
    el.style.width = '100%'
    el.style.boxSizing = 'border-box'
    el.style.textAlign = 'center'
    return el
}

/**
* @param {number} x
* @returns {string}
*/
function formatNumber(x) {
    if (x >= 1e6) {
        return x.toExponential(4)
    } else {
        x = Math.round(x * 1000) / 1000
        return x.toFixed(Math.min(3, (String(x).split('.')[1] || '').length))
    }
}

class PolygonType {
    customId = "jwPolygon"

    /** @type {{x: number, y: number}[]} */
    points = []

    constructor(points = []) {
        this.points = points;
    }

    static toPolygon(x) {
        if (x instanceof PolygonType) return x
        if (x instanceof jwArray.Type) return new PolygonType(x.array.map(v => jwVector.Type.toVector(v)).map(v => ({x: v.x, y: v.y})))
        return new PolygonType
    }

    toReporterContent() {
        if (this.points.length == 0) {
            return span('<i style="opacity: 0.75">No points</i>');
        }

        let root = document.createElement('div');
        root.style.overflow = "hidden";
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.alignItems = 'center';

        let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '-110 -110 220 220');
        svg.setAttribute('width', '150px');
        svg.setAttribute('height', '150px');
        root.appendChild(svg);

        let centered = this.centerPolygon().scaleBoundsToSize(200);
        var bounds = centered.bounds();
        let points = centered.points;

        //rectangle around bounds
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', bounds.left);
        rect.setAttribute('y', bounds.top);
        rect.setAttribute('width', (bounds.right - bounds.left));
        rect.setAttribute('height', (bounds.bottom - bounds.top));
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', 'var(--text-primary)');
        rect.setAttribute('stroke-width', 4);
        rect.setAttribute('opacity', 0.2);
        svg.appendChild(rect);

        let path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${points.map(v => ` ${v.x} ${-v.y} `).join("L")}Z`);
        path.setAttribute('fill', 'var(--text-primary-transparent)');
        path.setAttribute('stroke', 'var(--text-primary)');
        path.setAttribute('stroke-width', 4);
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);

        points.forEach(v => {
            let ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            ellipse.setAttribute('cx', v.x || 0);
            ellipse.setAttribute('cy', -v.y || 0);
            ellipse.setAttribute('rx', 5);
            ellipse.setAttribute('ry', 5);
            ellipse.setAttribute('fill', 'var(--text-primary)')
            svg.appendChild(ellipse);
        });

        var bounds = this.bounds();
        root.appendChild(span(`(${formatNumber(bounds.left)}, ${formatNumber(bounds.top)}) -> (${formatNumber(bounds.right)}, ${formatNumber(bounds.bottom)})`));
        root.appendChild(span(`${formatNumber(bounds.right - bounds.left)} x ${formatNumber(bounds.bottom - bounds.top)}`));
        root.appendChild(span(`${this.points.length} points`));

        return root;
    }

    toJSON() {
        return this.points;
    }

    bounds() {
        if (this.points.length == 0) return { left: 0, right: 0, top: 0, bottom: 0 };

        return {
            left: Math.min(...this.points.map(v => v.x)),
            right: Math.max(...this.points.map(v => v.x)),
            top: Math.max(...this.points.map(v => v.y)),
            bottom: Math.min(...this.points.map(v => v.y))
        }
    }

    center() {
        let bounds = this.bounds()
        return {
            x: (bounds.left + bounds.right) / 2,
            y: (bounds.top + bounds.bottom) / 2
        }
    }

    centerPolygon() {
        let bounds = this.bounds()
        let x = (bounds.left + bounds.right) / 2
        let y = (bounds.top + bounds.bottom) / 2
        return new PolygonType(this.points.map(v => ({ x: v.x - x, y: v.y - y })))
    }

    scaleBoundsToSize(size) {
        if (this.points.length < 2) return this;

        let center = this.center();
        let bounds = this.bounds();
        let scale = Math.min(size / (bounds.right - bounds.left), size / (bounds.bottom - bounds.top));
        return new PolygonType(this.points.map(v => ({ x: (v.x - center.x) * scale + center.x, y: (v.y - center.y) * scale + center.y })));
    }

    polyPoint(x, y) {
        let collision = false;

        for (let i = 0; i < this.points.length; i++) {
            let currentPoint = this.points[i];
            let nextPoint = this.points[(i + 1) % this.points.length];

            if (
                ((currentPoint.y >= y) != (nextPoint.y >= y)) &&
                (x <= (nextPoint.x - currentPoint.x) * (y - currentPoint.y) / (nextPoint.y - currentPoint.y) + currentPoint.x)
            ) {
                collision = !collision;
            }
        }

        return collision;
    }

    polyLine(x1, y1, x2, y2) {
        for (let i = 0; i < this.points.length; i++) {
            let currentPoint = this.points[i];
            let nextPoint = this.points[(i + 1) % this.points.length];

            let hit = PolygonType.lineLine(x1, y1, x2, y2, currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y);
            if (hit) return true;
        }

        // could be inside
        return this.polyPoint(x1, y1) || this.polyPoint(x2, y2);
    }

    polyLinePoints(x1, y1, x2, y2) {
        let output = [];

        for (let i = 0; i < this.points.length; i++) {
            let currentPoint = this.points[i];
            let nextPoint = this.points[(i + 1) % this.points.length];

            let hit = PolygonType.lineLine(x1, y1, x2, y2, currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y);
            if (hit && !output.find(v => v.x == hit.x && v.y == hit.y)) output.push(hit);
        }

        return output;
    }

    static lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
        let uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
        let uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

        if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
            return { x: x1 + (x2 - x1) * uA, y: y1 + (y2 - y1) * uA };
        }

        return null;
    }

    polyPoly(other) {
        for (let i = 0; i < this.points.length; i++) {
            let currentPoint = this.points[i];
            let nextPoint = this.points[(i + 1) % this.points.length];

            if (other.polyLine(currentPoint.x, currentPoint.y, nextPoint.x, nextPoint.y)) return true;
        }

        return false;
    }
}

let jwArray = {
    Type: class {},
    Block: {},
    Argument: {}
};

let jwVector = {
    Type: class {},
    Block: {},
    Argument: {}
};

let jwPolygon = {
    Type: PolygonType,
    Block: {
        blockType: BlockType.REPORTER,
        forceOutputType: "jwPolygon",
        disableMonitor: true
    },
    Argument: {
        check: ["jwPolygon"]
    }
};

class Extension {
    constructor() {
        vm.jwPolygon = jwPolygon;
        vm.runtime.registerSerializer(
            "jwPolygon", 
            v => v.points, 
            v => new jwPolygon.Type(v)
        );

        vm.extensionManager.addExtensionDependency("jwPolygon", "jwArray", () => jwArray = vm.jwArray);
        vm.extensionManager.addExtensionDependency("jwPolygon", "jwVector", () => jwVector = vm.jwVector);
    }

    getInfo() {
        return {
            id: "jwPolygon",
            name: "Polygons",
            color: "#d36bff",
            menuIconURI: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCI+CiAgPGVsbGlwc2Ugc3R5bGU9InN0cm9rZTogcmdiKDE2OSwgODYsIDIwNCk7IGZpbGw6IHJnYigyMTEsIDEwNywgMjU1KTsiIGN4PSIxMCIgY3k9IjEwIiByeD0iOS41IiByeT0iOS41Ij48L2VsbGlwc2U+CiAgPHBhdGggZD0iTSA4LjQ1OSA0LjM5MiBDIDkuNDAzIDMuOTI0IDEwLjU5NyAzLjkyNCAxMS41NDEgNC4zOTIgTCAxNC4wODYgNS44NjEgQyAxNC45NjMgNi40NDUgMTUuNTYgNy40NzkgMTUuNjI3IDguNTMgTCAxNS42MjcgMTEuNDY5IEMgMTUuNTYgMTIuNTIgMTQuOTYzIDEzLjU1NSAxNC4wODYgMTQuMTM4IEwgMTEuNTQxIDE1LjYwNyBDIDEwLjU5NyAxNi4wNzUgOS40MDMgMTYuMDc1IDguNDU5IDE1LjYwNyBMIDUuOTE0IDE0LjEzOCBDIDUuMDM3IDEzLjU1NCA0LjQ0IDEyLjUyIDQuMzczIDExLjQ2OSBMIDQuMzczIDguNTMgQyA0LjQ0IDcuNDc5IDUuMDM3IDYuNDQ0IDUuOTE0IDUuODYxIFogTSA2LjkxNCA3LjU5MyBDIDYuNDAzIDcuODExIDYuMzA2IDcuOTc5IDYuMzczIDguNTMgTCA2LjM3MyAxMS40NjkgQyA2LjMwNiAxMi4wMiA2LjQwMyAxMi4xODkgNi45MTQgMTIuNDA2IEwgOS40NTkgMTMuODc1IEMgOS45MDMgMTQuMjA5IDEwLjA5NyAxNC4yMDkgMTAuNTQxIDEzLjg3NSBMIDEzLjA4NiAxMi40MDYgQyAxMy41OTcgMTIuMTg4IDEzLjY5NCAxMi4wMiAxMy42MjcgMTEuNDY5IEwgMTMuNjI3IDguNTMgQyAxMy42OTQgNy45NzkgMTMuNTk3IDcuODEgMTMuMDg2IDcuNTkzIEwgMTAuNTQxIDYuMTI0IEMgMTAuMDk3IDUuNzkgOS45MDMgNS43OSA5LjQ1OSA2LjEyNCBaIiBzdHlsZT0iZmlsbDogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9wYXRoPgo8L3N2Zz4=",
            blocks: [
                {
                    opcode: "regular",
                    text: "[SIDES] sided polygon of size [SIZE]",
                    arguments: {
                        SIDES: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 6
                        },
                        SIZE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        }
                    },
                    ...jwPolygon.Block
                },
                {
                    opcode: "rectangle",
                    text: "rectangle from [ONE] to [TWO]",
                    arguments: {
                        ONE: jwVector.Argument,
                        TWO: jwVector.Argument
                    },
                    ...jwPolygon.Block
                },
                {
                    opcode: "fromPoints",
                    text: "polygon from vectors [POINTS]",
                    arguments: {
                        POINTS: jwArray.Argument
                    },
                    ...jwPolygon.Block
                },
                "---",
                {
                    opcode: "getPoints",
                    text: "get points of [POLYGON]",
                    arguments: {
                        POLYGON: jwPolygon.Argument
                    },
                    ...jwArray.Block
                },
                {
                    opcode: "getCenter",
                    text: "get center of [POLYGON]",
                    arguments: {
                        POLYGON: jwPolygon.Argument
                    },
                    ...jwVector.Block
                },
                {
                    opcode: "getBoundsCorner",
                    text: "get [CORNER] of bounds of [POLYGON]",
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        CORNER: {
                            menu: "corner"
                        }
                    },
                    ...jwVector.Block
                },
                {
                    opcode: "getDimension",
                    text: "get [DIMENSION] of [POLYGON]",
                    blockType: BlockType.REPORTER,
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        DIMENSION: {
                            menu: "dimension"
                        }
                    }
                },
                {
                    opcode: "isConvex",
                    text: "is [POLYGON] convex",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POLYGON: jwPolygon.Argument
                    }
                },
                "---",
                {
                    opcode: "translate",
                    text: "translate [POLYGON] by [VECTOR]",
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        VECTOR: jwVector.Argument
                    },
                    ...jwPolygon.Block
                },
                {
                    opcode: "scale",
                    text: "scale [POLYGON] by [VECTOR]",
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        VECTOR: jwVector.Argument
                    },
                    ...jwPolygon.Block
                },
                {
                    opcode: "scaleNumber",
                    text: "scale [POLYGON] by [SCALE]",
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        SCALE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    },
                    ...jwPolygon.Block
                },
                {
                    opcode: "rotate",
                    text: "rotate [POLYGON] by [ANGLE]",
                    arguments: {
                        POLYGON: jwPolygon.Argument,
                        ANGLE: {
                            type: ArgumentType.ANGLE,
                            defaultValue: 90
                        }
                    },
                    ...jwPolygon.Block
                },
                "---",
                {
                    opcode: "polyPoint",
                    text: "is [POINT] intersecting [POLYGON]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POINT: jwVector.Argument,
                        POLYGON: jwPolygon.Argument
                    }
                },
                {
                    opcode: "polyLine",
                    text: "is line [POINTA] [POINTB] intersecting [POLYGON]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POINTA: jwVector.Argument,
                        POINTB: jwVector.Argument,
                        POLYGON: jwPolygon.Argument
                    }
                },
                {
                    opcode: "polyPoly",
                    text: "is polygon [POLYGONA] intersecting [POLYGONB]",
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        POLYGONA: jwPolygon.Argument,
                        POLYGONB: jwPolygon.Argument
                    }
                },
                "---",
                {
                    opcode: "polyLinePoints",
                    text: "points of line [POINTA] [POINTB] intersecting [POLYGON]",
                    arguments: {
                        POINTA: jwVector.Argument,
                        POINTB: jwVector.Argument,
                        POLYGON: jwPolygon.Argument
                    },
                    ...jwArray.Block
                }
            ],
            menus: {
                corner: {
                    acceptReporters: false,
                    items: [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right"
                    ]
                },
                dimension: {
                    acceptReporters: false,
                    items: [
                        "width",
                        "height"
                    ]
                }
            }
        }
    }

    regular({SIDES, SIZE}) {
        SIDES = Math.floor(Cast.toNumber(SIDES));
        SIZE = Cast.toNumber(SIZE);

        if (SIDES <= 0) return new jwPolygon.Type;
        if (SIDES == 1) return new jwPolygon.Type([{x: 0, y: 0}]);

        let points = [];
        for (let i = 0; i < SIDES; i++) {
            let angle = 360 / SIDES * (i - 0.5);
            points.push({
                x: Math.sin(angle * Math.PI / 180),
                y: -Math.cos(angle * Math.PI / 180)
            });
        }

        return new jwPolygon.Type(points).scaleBoundsToSize(SIZE);
    }

    rectangle({ONE, TWO}) {
        ONE = jwVector.Type.toVector(ONE);
        TWO = jwVector.Type.toVector(TWO);

        return new jwPolygon.Type([
            {x: ONE.x, y: ONE.y},
            {x: TWO.x, y: ONE.y},
            {x: TWO.x, y: TWO.y},
            {x: ONE.x, y: TWO.y}
        ]);
    }

    fromPoints({POINTS}) {
        POINTS = jwArray.Type.toArray(POINTS);
        return new jwPolygon.Type(POINTS.array.map(v => jwVector.Type.toVector(v)));
    }

    getPoints({POLYGON}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        return new jwArray.Type(POLYGON.points.map(v => new jwVector.Type(v.x, v.y)));
    }

    getCenter({POLYGON}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        let bounds = POLYGON.bounds();
        return new jwVector.Type(
            (bounds.left + bounds.right) / 2,
            (bounds.top + bounds.bottom) / 2
        );
    }

    getBoundsCorner({CORNER, POLYGON}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        let bounds = POLYGON.bounds();
        switch (CORNER) {
            case "top-left": return new jwVector.Type(bounds.left, bounds.top);
            case "top-right": return new jwVector.Type(bounds.right, bounds.top);
            case "bottom-left": return new jwVector.Type(bounds.left, bounds.bottom);
            case "bottom-right": return new jwVector.Type(bounds.right, bounds.bottom);
            default: return new jwVector.Type(0, 0);
        }
    }

    getDimension({DIMENSION, POLYGON}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        let bounds = POLYGON.bounds();
        switch (DIMENSION) {
            case "width": return bounds.right - bounds.left;
            case "height": return bounds.top - bounds.bottom;
            default: return 0;
        }
    }

    isConvex({POLYGON}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        if (POLYGON.points.length < 3) return false;

        let sign = 0;
        for (let i = 0; i < POLYGON.points.length; i++) {
            let a = POLYGON.points[i];
            let b = POLYGON.points[(i + 1) % POLYGON.points.length];
            let c = POLYGON.points[(i + 2) % POLYGON.points.length];

            let crossProduct = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);

            if (crossProduct != 0) {
                if (sign == 0) sign = crossProduct > 0 ? 1 : -1;
                else if (sign != (crossProduct > 0 ? 1 : -1)) return false;
            }
        }

        return true;
    }

    translate({POLYGON, VECTOR}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        VECTOR = jwVector.Type.toVector(VECTOR);
        return new jwPolygon.Type(POLYGON.points.map(v => ({x: v.x + VECTOR.x, y: v.y + VECTOR.y})));
    }

    scale({POLYGON, VECTOR}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        VECTOR = jwVector.Type.toVector(VECTOR);
        return new jwPolygon.Type(POLYGON.points.map(v => ({x: v.x * VECTOR.x, y: v.y * VECTOR.y})));
    }

    scaleNumber({POLYGON, SCALE}) {
        SCALE = Cast.toNumber(SCALE);
        return this.scale({POLYGON, VECTOR: new jwVector.Type(SCALE, SCALE)});
    }

    rotate({POLYGON, ANGLE}) {
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        ANGLE = -Cast.toNumber(ANGLE);
        return new jwPolygon.Type(POLYGON.points.map(v => ({
            x: v.x * Math.cos(ANGLE * Math.PI / 180) - v.y * Math.sin(ANGLE * Math.PI / 180), 
            y: v.x * Math.sin(ANGLE * Math.PI / 180) + v.y * Math.cos(ANGLE * Math.PI / 180)
        })));
    }

    polyPoint({POINT, POLYGON}) {
        POINT = jwVector.Type.toVector(POINT);
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        return POLYGON.polyPoint(POINT.x, POINT.y);
    }

    polyLine({POINTA, POINTB, POLYGON}) {
        POINTA = jwVector.Type.toVector(POINTA);
        POINTB = jwVector.Type.toVector(POINTB);
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        return POLYGON.polyLine(POINTA.x, POINTA.y, POINTB.x, POINTB.y);
    }

    polyPoly({POLYGONA, POLYGONB}) {
        POLYGONA = jwPolygon.Type.toPolygon(POLYGONA);
        POLYGONB = jwPolygon.Type.toPolygon(POLYGONB);
        return POLYGONA.polyPoly(POLYGONB);
    }

    polyLinePoints({POINTA, POINTB, POLYGON}) {
        POINTA = jwVector.Type.toVector(POINTA);
        POINTB = jwVector.Type.toVector(POINTB);
        POLYGON = jwPolygon.Type.toPolygon(POLYGON);
        return new jwArray.Type(POLYGON.polyLinePoints(POINTA.x, POINTA.y, POINTB.x, POINTB.y).map(v => new jwVector.Type(v.x, v.y)));
    }
}

module.exports = Extension;