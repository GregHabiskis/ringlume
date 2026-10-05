#!/usr/bin/env bash
# Corrected pulse rework tests: no !important on the animated properties.
set -u
cd "$(dirname "$0")/../.."
OTHERS='.hero-ring,.waveform span,.animate-pulse{animation-play-state:paused!important}'

# F: halo pseudo-element, transform + opacity (no !important on animated props)
PULSE_F='
.status-pulse{position:relative!important;animation:none!important}
.status-pulse::after{content:""!important;position:absolute!important;inset:0!important;pointer-events:none!important;border-radius:50%;background:rgba(76,217,100,.35);animation:__pulse 1.8s ease-out infinite}
@keyframes __pulse{0%{transform:scale(1);opacity:1}70%,100%{transform:scale(2.6);opacity:0}}
'
# G: halo pseudo-element, opacity only (static ring fades in/out, no expansion)
PULSE_G='
.status-pulse{position:relative!important;animation:none!important}
.status-pulse::after{content:""!important;position:absolute!important;inset:-6px!important;pointer-events:none!important;border-radius:50%;box-shadow:0 0 0 3px rgba(76,217,100,.35);animation:__fade 1.8s ease-out infinite}
@keyframes __fade{0%{opacity:1}70%,100%{opacity:0}}
'
# H: element-level transform animation (dot itself scales) - control for element-level anims
PULSE_H='
.status-pulse{animation:__grow 1.8s ease-out infinite!important}
@keyframes __grow{0%{transform:scale(1)}70%,100%{transform:scale(2.6)}}
'

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "${3:-5}" 6000 1500
	echo
}

t "ISO-F-pseudo-transform-fixed" "$OTHERS $PULSE_F"
t "ISO-G-pseudo-opacity-fixed" "$OTHERS $PULSE_G"
t "ISO-H-element-transform" "$OTHERS $PULSE_H"
