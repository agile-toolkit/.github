#!/usr/bin/env bash
# Runs rules.test.mjs against a throwaway Realtime Database emulator.
#
# Needs firebase-tools and the test deps; they are not vendored here because
# this repo has no build of its own:
#   npm i -g firebase-tools
#   npm i --no-save @firebase/rules-unit-testing firebase
#
# Then:  ./test-rules.sh
set -euo pipefail
cd "$(dirname "$0")"

firebase --project demo-agile-toolkit emulators:exec --only database \
  'node --test rules.test.mjs'
