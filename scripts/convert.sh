#!/usr/bin/env bash
# Faster (parallel, output order may vary): ./scripts/convert.sh --parallel
set -euo pipefail

cd "$(dirname "$0")/.."

exec node engine.js "$@"
