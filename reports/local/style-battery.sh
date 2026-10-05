#!/usr/bin/env bash
# Style-recalc attribution battery (perf-metrics harness, 4x CPU throttle).
set -u
cd "$(dirname "$0")/../.."
RUNS="${RUNS:-5}"

t() {
	LABEL="$1" INJECT_CSS="$2" node reports/local/perf-metrics.mjs "$RUNS" 6000 1500
	echo
}

t "A-baseline" ""
t "G-no-transitions" '*{transition:none!important}'
t "H-no-animations" '*,*::before,*::after{animation-play-state:paused!important}'
t "I-no-content-visibility" '.content-auto{content-visibility:visible!important}'
t "J-no-reveal" '.reveal,.reveal-text,.capability-card{transition:none!important;opacity:1!important;transform:none!important;filter:none!important}'
t "K-no-backdrop" '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
t "L-no-grain" '.grain::after{display:none!important}'
t "M-no-scene" '.scene{display:none!important}'
t "N-no-specular" '.specular::before,.specular::after{display:none!important}'
