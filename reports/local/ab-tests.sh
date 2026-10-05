#!/usr/bin/env bash
# A/B tests: inject CSS before load, measure TBT with the CDP harness.
set -u
cd "$(dirname "$0")/../.."
RUNS="${RUNS:-3}"
WINDOW="${WINDOW:-8000}"

run_test() {
	local name="$1"
	local css="$2"
	LABEL="$name" INJECT_CSS="$css" node reports/local/tbt-measure.mjs "$RUNS" "$WINDOW" 3000
	echo
}

run_test "A-baseline" ""
run_test "B-no-animations" '*,*::before,*::after{animation-play-state:paused!important}'
run_test "C-no-backdrop" '*{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
run_test "D-no-refract" '.refract{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
run_test "E-no-grain" '.grain::after{display:none!important}'
run_test "F-no-scene" '.scene{display:none!important}'
