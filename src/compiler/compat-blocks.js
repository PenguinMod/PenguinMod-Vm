// @ts-check

/**
 * @fileoverview List of blocks to be supported in the compiler compatibility layer.
 * This is only for native blocks. Extensions should not be listed here.
 */

// Please keep these lists alphabetical.

const stacked = [
    'control_backToGreenFlag',
    'looks_changestretchby',
    'looks_hideallsprites',
    'looks_sayforsecs',
    'looks_setColor',
    'looks_setFont',
    'looks_setShape',
    'looks_setstretchto',
    'looks_switchbackdroptoandwait',
    'looks_thinkforsecs',
    'motion_align_scene',
    'motion_glidesecstoxy',
    'motion_glideto',
    'motion_goto',
    'motion_pointtowards',
    'motion_scroll_right',
    'motion_scroll_up',
    'sensing_askandwait',
    'sensing_setclipboard',
    'sensing_setdragmode',
    'sound_changeeffectby',
    'sound_changevolumeby',
    'sound_cleareffects',
    'sound_play',
    'sound_playallsounds',
    'sound_play_at_seconds',
    'sound_play_at_seconds_until_done',
    'sound_playuntildone',
    'sound_seteffectto',
    'sound_set_stop_fadeout_to',
    'sound_setvolumeto',
    'sound_stop',
    'sound_stopallsounds',
];

const inputs = [
    'motion_xscroll',
    'motion_yscroll',
    'operator_javascript_output',
    'operator_javascript_boolean',
    'sensing_getclipboard',
    'sensing_loud',
    'sensing_loudness',
    'sensing_online',
    'sensing_userid',
    'sound_getEffectValue',
    'sound_getLength',
    'sound_isSoundPlaying',
    'sound_volume'
];

module.exports = {
    stacked,
    inputs
};
