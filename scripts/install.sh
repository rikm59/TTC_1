#!/usr/bin/env bash
# Faster (parallel, output order may vary): ./scripts/install.sh --no-interactive --parallel
set -euo pipefail

cd "$(dirname "$0")/.."

PARALLEL=false
INTERACTIVE=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --parallel)       PARALLEL=true; shift ;;
    --no-interactive) INTERACTIVE=false; shift ;;
    -h|--help)
      printf 'Usage: %s [--no-interactive] [--parallel]\n' "$0"
      printf '  --no-interactive  Skip prompts; copy .env.example when .env is missing\n'
      printf '  --parallel        Run npm install and env setup concurrently\n'
      exit 0 ;;
    *) printf '[install] Unknown option: %s\n' "$1" >&2; exit 1 ;;
  esac
done

# --parallel implies --no-interactive (background output conflicts with prompts)
if [[ "$PARALLEL" == true ]]; then
  INTERACTIVE=false
fi

MIN_NODE_MAJOR=18

# ── Prerequisite checks (always sequential — they're fast) ──────────────────
if ! command -v node &>/dev/null; then
  echo "[install] ❌ Node.js not found. Install v${MIN_NODE_MAJOR}+ from https://nodejs.org" >&2
  exit 1
fi
node_ver=$(node -e 'process.stdout.write(String(process.version.slice(1).split(".")[0]))')
if [[ "$node_ver" -lt "$MIN_NODE_MAJOR" ]]; then
  echo "[install] ❌ Node.js v${node_ver} found — v${MIN_NODE_MAJOR}+ required (native fetch)." >&2
  exit 1
fi
echo "[install] ✅ Node.js $(node --version)"

if ! command -v npm &>/dev/null; then
  echo "[install] ❌ npm not found." >&2
  exit 1
fi
echo "[install] ✅ npm v$(npm --version)"

# ── Task: install npm dependencies ──────────────────────────────────────────
task_npm() {
  echo "[install] 📦 Installing npm dependencies..."
  npm install --no-progress 2>&1 | sed 's/^/[npm] /'
  echo "[install] ✅ Dependencies installed"
}

# ── Task: create .env ────────────────────────────────────────────────────────
task_env() {
  if [[ -f .env ]]; then
    echo "[install] ℹ️  .env already exists — skipping"
    return 0
  fi

  if [[ "$INTERACTIVE" == false ]]; then
    cp .env.example .env
    echo "[install] ✅ .env created from .env.example (fill in real values before running)"
    return 0
  fi

  echo ""
  echo "[install] 📝 Setting up .env — press Enter to keep the placeholder value."
  echo ""
  cp .env.example .env

  _prompt() {
    local key="$1" desc="$2" default="$3"
    printf '  %s\n  %s [%s]: ' "$desc" "$key" "$default"
    IFS= read -r val
    val="${val:-$default}"
    sed -i "s|^${key}=.*|${key}=${val}|" .env
    echo ""
  }

  _prompt TRIGGER_SECRET_KEY \
    "Webhook auth secret (tip: openssl rand -hex 32)" \
    "$(openssl rand -hex 32 2>/dev/null || echo 'change-me')"

  _prompt INSTAGRAM_ACCESS_TOKEN \
    "Facebook Graph API token (developers.facebook.com/tools/explorer)" \
    "your-facebook-graph-api-token-here"

  _prompt FB_APP_ID \
    "Facebook App ID — optional, enables auto token refresh" \
    "your-app-id-here"

  _prompt FB_APP_SECRET \
    "Facebook App Secret — optional" \
    "your-app-secret-here"

  _prompt NOTION_API_KEY \
    "Notion integration token (notion.so/profile/integrations)" \
    "secret_your-notion-integration-token-here"

  _prompt NOTION_DATABASE_ID \
    "Notion 'Instagram Posts' collection ID" \
    "a9e63dc8-16a6-4cf7-8554-7dc7cfcde933"

  _prompt NOTION_ACCOUNTS_DATABASE_ID \
    "Notion 'Instagram Accounts' collection ID" \
    "dbb3afce-fede-4849-8006-9c4e31d129f0"

  echo "[install] ✅ .env written"
}

# ── Execute ──────────────────────────────────────────────────────────────────
if [[ "$PARALLEL" == true ]]; then
  task_npm &
  pid_npm=$!
  task_env &
  pid_env=$!
  wait "$pid_npm"
  wait "$pid_env"
else
  task_npm
  task_env
fi

echo ""
echo "[install] 🎉 Setup complete!"
echo "  Run the sync:  node engine.js"
echo "  Run the agent: node agent-manager.js"
echo "  Convert:       ./scripts/convert.sh [--parallel]"
