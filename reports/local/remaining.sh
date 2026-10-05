#!/usr/bin/env bash
# What's left after the pulse fix? (current build)
set -u
cd "$(dirname "$0")/../.."

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "${3:-4}" 6000 1500 | grep -E "MEDIAN"
}

t "P0-current" ""
t "P1-pause-rings" '.hero-ring{animation-play-state:paused!important}'
t "P2-pause-waveform" '.waveform span{animation-play-state:paused!important}'
t "P3-pause-animate-pulse" '.animate-pulse{animation-play-state:paused!important}'
t "P4-pause-rings+wave" '.hero-ring,.waveform span{animation-play-state:paused!important}'
t "P5-pause-all" '*,*::before,*::after{animation-play-state:paused!important}'
t "P6-rings-3d" '.hero-ring{animation-name:__ring3d!important}@keyframes __ring3d{0%{transform:translateZ(0) scale(.16);opacity:0}12%{opacity:.24}72%{opacity:.12}100%{transform:translateZ(0) scale(1.15);opacity:0}}'
t "P7-rings-container-layer" '.hero-rings{will-change:transform;transform:translateZ(0)}'
