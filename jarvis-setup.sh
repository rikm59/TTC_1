#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# J.A.R.V.I.S. + S.T.E.L.L.A. — Personal AI Setup Script
# Run this on any new machine to get your full stack running.
# ═══════════════════════════════════════════════════════════════
# Usage:
#   chmod +x jarvis-setup.sh && ./jarvis-setup.sh
#   Optional: STELLA_VAULT_PATH=~/my-vault ./jarvis-setup.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

JARVIS_HOME="${OPENJARVIS_HOME:-$HOME/.openjarvis}"
STELLA_VAULT="${STELLA_VAULT_PATH:-$HOME/Documents/ObsidianVault}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════════════════════"
echo "  J.A.R.V.I.S. + S.T.E.L.L.A. Personal AI Setup"
echo "  Install dir: $JARVIS_HOME"
echo "═══════════════════════════════════════════════════════════"
echo

# ── 1. uv ────────────────────────────────────────────────────
if ! command -v uv &>/dev/null; then
    echo "[1/7] Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
else
    echo "[1/7] uv already installed — $(uv --version)"
fi

# ── 2. Clone OpenJARVIS ──────────────────────────────────────
if [[ ! -d "$JARVIS_HOME/src/.git" ]]; then
    echo "[2/7] Cloning OpenJARVIS..."
    mkdir -p "$JARVIS_HOME"
    git clone --depth 1 https://github.com/open-jarvis/OpenJarvis.git "$JARVIS_HOME/src"
else
    echo "[2/7] OpenJARVIS source already present"
fi

# ── 3. Virtual environment ───────────────────────────────────
if [[ ! -d "$JARVIS_HOME/.venv" ]]; then
    echo "[3/7] Creating Python 3.11 venv..."
    uv venv --python 3.11 "$JARVIS_HOME/.venv"
else
    echo "[3/7] venv already exists"
fi

# ── 4. Install OpenJARVIS package ───────────────────────────
echo "[4/7] Installing OpenJARVIS..."
cd "$JARVIS_HOME/src"
uv pip install --python "$JARVIS_HOME/.venv/bin/python" -e . -q

# ── 5. Copy config & scripts from repo ──────────────────────
echo "[5/7] Deploying JARVIS + STELLA config..."
mkdir -p "$JARVIS_HOME/.scripts"

# Config
cp -f "$REPO_DIR/.jarvis/config.toml"       "$JARVIS_HOME/config.toml"
cp -f "$REPO_DIR/.jarvis/stella.md"          "$JARVIS_HOME/stella.md"
cp -f "$REPO_DIR/.jarvis/vault_ingest.py"    "$JARVIS_HOME/vault_ingest.py"

# Launcher scripts
cp -f "$REPO_DIR/.jarvis/jarvis-wrapper.sh"  "$JARVIS_HOME/.scripts/jarvis-wrapper.sh"
cp -f "$REPO_DIR/.jarvis/stella-wrapper.sh"  "$JARVIS_HOME/.scripts/stella-wrapper.sh"
chmod +x "$JARVIS_HOME/.scripts/"*.sh

# ── 6. Install global commands ───────────────────────────────
echo "[6/7] Installing global commands..."
mkdir -p "$HOME/.local/bin"
ln -sf "$JARVIS_HOME/.scripts/jarvis-wrapper.sh" "$HOME/.local/bin/jarvis"
ln -sf "$JARVIS_HOME/.scripts/stella-wrapper.sh" "$HOME/.local/bin/stella"

# Ensure PATH
if ! grep -q "OpenJarvis" "$HOME/.bashrc" 2>/dev/null; then
    echo '' >> "$HOME/.bashrc"
    echo '# OpenJarvis' >> "$HOME/.bashrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi
if [[ -f "$HOME/.zshrc" ]] && ! grep -q "OpenJarvis" "$HOME/.zshrc" 2>/dev/null; then
    echo '' >> "$HOME/.zshrc"
    echo '# OpenJarvis' >> "$HOME/.zshrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
fi

# ── 7. Optional: Obsidian vault ingest ───────────────────────
if [[ -d "$STELLA_VAULT" ]]; then
    echo "[7/7] Ingesting Obsidian vault at $STELLA_VAULT..."
    "$JARVIS_HOME/.venv/bin/python" "$JARVIS_HOME/vault_ingest.py" \
        --vault "$STELLA_VAULT" --db "$JARVIS_HOME/stella.db"
else
    echo "[7/7] Vault not found at $STELLA_VAULT — skipping ingest"
    echo "      To ingest later: python ~/.openjarvis/vault_ingest.py --vault ~/path/to/vault"
fi

echo
echo "═══════════════════════════════════════════════════════════"
echo "  Setup complete. Commands installed:"
echo "    jarvis        — J.A.R.V.I.S. (Claude-powered AI)"
echo "    stella        — S.T.E.L.L.A. (vault-aware mode)"
echo ""
echo "  Required: Set ANTHROPIC_API_KEY in your .env file"
echo "    export ANTHROPIC_API_KEY=sk-ant-..."
echo ""
echo "  Quick start:"
echo "    jarvis ask 'What's my top priority today, sir?'"
echo "    stella chat"
echo "    jarvis serve  # starts API server on :8000"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  source ~/.bashrc  (or open a new terminal)"
