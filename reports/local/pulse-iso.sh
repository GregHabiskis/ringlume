#!/usr/bin/env bash
# Isolate the pulse: everything else paused.
set -u
cd "$(dirname "$0")/../.."
OTHERS='.hero-ring,.waveform span,.animate-pulse{animation-play-state:paused!important}'

PULSE='
.status-pulse{position:relative!important;animation:none!important;overflow:visible!important}
.status-pulse::after{content:""!important;position:absolute!important;inset:0!important;border-radius:50%!important;background:rgba(76,217,100,.35)!important;opacity:1!important;transform:scale(1)!important;animation:__pulse 1.8s ease-out infinite!important;pointer-events:none!important}
@keyframes __pulse{0%{transform:scale(1);opacity:1}70%,100%{transform:scale(2.6);opacity:0}}
'
PULSE_OPACITY_ONLY='
.status-pulse{position:relative!important;animation:none!important}
.status-pulse::after{content:""!important;position:absolute!important;inset:0!important;border-radius:50%!important;background:rgba(76,217,100,.35)!important;opacity:1!important;animation:__fade 1.8s ease-out infinite!important;pointer-events:none!important}
@keyframes __fade{0%{opacity:.35}70%,100%{opacity:0}}
'
PULSE_STATIC_FADE='
.status-pulse{animation:__dotfade 1.8s ease-out infinite!important}
@keyframes __dotfade{0%{opacity:1}70%,100%{opacity:.55}}
'

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "${3:-5}" 6000 1500
	echo
}

t "ISO-A-pulse-boxshadow" "$OTHERS"
t "ISO-B-pulse-paused" "$OTHERS .status-pulse{animation-play-state:paused!important}"
t "ISO-C-pulse-pseudo-transform" "$OTHERS $PULSE"
t "ISO-D-pulse-pseudo-opacity" "$OTHERS $PULSE_OPACITY_ONLY"
t "ISO-E-pulse-element-opacity" "$OTHERS $PULSE_STATIC_FADE"
