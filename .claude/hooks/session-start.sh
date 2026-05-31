#!/bin/bash
set -euo pipefail

# Only run in remote (web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "Installing npm dependencies..."
npm install

echo "Installing ffmpeg (optional, for Remotion rendering)..."
apt-get install -y ffmpeg 2>/dev/null || true

echo "Session start complete."
