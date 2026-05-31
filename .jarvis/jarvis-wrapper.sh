#!/usr/bin/env bash
# J.A.R.V.I.S. — global launcher (safely loads API keys from .env)

JARVIS_HOME="${OPENJARVIS_HOME:-$HOME/.openjarvis}"

# Check common .env locations
for ENV_PATH in \
    "/home/user/TTC_1/.env" \
    "$HOME/TTC_1/.env" \
    "$(pwd)/.env" \
    "$HOME/.env"
do
    if [[ -f "$ENV_PATH" ]]; then
        XPERT_ENV="$ENV_PATH"
        break
    fi
done

# Safely extract only known safe API key lines (no eval/source)
if [[ -n "${XPERT_ENV:-}" ]]; then
    while IFS= read -r line; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        if [[ "$line" =~ ^(ANTHROPIC_API_KEY|NOTION_API_KEY|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|SENDGRID_API_KEY|OPENAI_API_KEY)= ]]; then
            key="${line%%=*}"
            val="${line#*=}"
            export "$key=$val"
        fi
    done < "$XPERT_ENV"
fi

exec "$JARVIS_HOME/.venv/bin/jarvis" "$@"
