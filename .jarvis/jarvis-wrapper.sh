#!/usr/bin/env bash
# J.A.R.V.I.S. — launcher wrapper
# Sources .env from ~/TTC_1 if present (loads ANTHROPIC_API_KEY etc.)

JARVIS_HOME="${OPENJARVIS_HOME:-$HOME/.openjarvis}"
VENV="$JARVIS_HOME/.venv/bin/python"

# Load API keys from the Xpert Life Solutions project .env if present
XPERT_ENV="$HOME/TTC_1/.env"
if [[ -f "$XPERT_ENV" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$XPERT_ENV"
    set +a
fi

exec "$JARVIS_HOME/.venv/bin/jarvis" "$@"
