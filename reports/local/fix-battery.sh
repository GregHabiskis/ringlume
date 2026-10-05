#!/usr/bin/env bash
# Test candidate fixes via injected CSS before touching source.
set -u
cd "$(dirname "$0")/../.."
RUNS="${RUNS:-5}"

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "$RUNS" 6000 1500
	echo
}

# status-pulse reworked as a pseudo-element halo (opacity + transform only)
PULSE='
.status-pulse{position:relative!important;animation:none!important;overflow:visible!important}
.status-pulse::after{content:""!important;position:absolute!important;inset:0!important;border-radius:50%!important;background:rgba(76,217,100,.35)!important;opacity:1!important;transform:scale(1)!important;animation:__pulse 1.8s ease-out infinite!important;pointer-events:none!important}
@keyframes __pulse{0%{transform:scale(1);opacity:1}70%,100%{transform:scale(2.6);opacity:0}}
'

t "FIX1-pulse-rework" "$PULSE"
t "FIX2-rings-willchange" '.hero-ring{will-change:transform,opacity!important}'
t "FIX3-waveform-willchange" '.waveform span{will-change:transform,opacity!important}'
t "FIX4-pulse+rings+wave" "$PULSE .hero-ring{will-change:transform,opacity!important} .waveform span{will-change:transform,opacity!important}"
t "FIX5-pulse+pause-rings-wave" "$PULSE .hero-ring{animation-play-state:paused!important} .waveform span{animation-play-state:paused!important}"
