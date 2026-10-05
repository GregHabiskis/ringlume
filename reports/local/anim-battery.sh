#!/usr/bin/env bash
# Which infinite animation burns the main thread?
set -u
cd "$(dirname "$0")/../.."
RUNS="${RUNS:-5}"

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "$RUNS" 6000 1500
	echo
}

t "O-pause-status-pulse" '.status-pulse{animation-play-state:paused!important}'
t "P-pause-waveform" '.waveform span{animation-play-state:paused!important}'
t "Q-pause-hero-ring" '.hero-ring{animation-play-state:paused!important}'
t "R-pause-animate-pulse" '.animate-pulse{animation-play-state:paused!important}'
t "S-pause-capability-card" '.status-pulse,.waveform span{animation-play-state:paused!important}'
