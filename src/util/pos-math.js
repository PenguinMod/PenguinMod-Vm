/* eslint-disable no-mixed-operators */
const translateForCamera = (runtime, screen, x, y) => {
    const {pos, size, direction} = runtime.renderer.camera.getState(screen, true);
    const radians = (direction - 90) / 180 * Math.PI;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const offX = x - pos[0];
    const offY = y - pos[1];
    return [
        size[0] * 100 * offX * cos - size[1] * 100 * offY * sin,
        size[0] * 100 * offX * sin + size[1] * 100 * offY * cos
    ];
};

const translateScreenPos = (runtime, screen, x, y) => {
    const {pos, size, direction} = runtime.renderer.camera.getState(screen, true);
    const radians = (-direction + 90) / 180 * Math.PI;
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    return [
        pos[0] + 100 / size[0] * x * cos - 100 / size[1] * y * sin,
        pos[1] + 100 / size[0] * x * sin + 100 / size[1] * y * cos
    ];
};

module.exports = {
    translateForCamera,
    translateScreenPos
};
