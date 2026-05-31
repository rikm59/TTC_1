#!/usr/bin/env bash
# S.T.E.L.L.A. — vault-aware JARVIS session launcher
# Injects vault context (tasks, vitals, sector) into the chat session

JARVIS_HOME="${OPENJARVIS_HOME:-$HOME/.openjarvis}"
VENV="$JARVIS_HOME/.venv/bin/python"
DB="$JARVIS_HOME/stella.db"
VAULT_PATH="${STELLA_VAULT_PATH:-$HOME/Documents/JARVIS Vault}"

# Load API keys from Xpert Life Solutions .env if present
XPERT_ENV="$HOME/TTC_1/.env"
if [[ -f "$XPERT_ENV" ]]; then
    set -a; source "$XPERT_ENV"; set +a
fi

# Auto-ingest vault if DB is older than 1 hour or doesn't exist
if [[ -d "$VAULT_PATH" ]]; then
    if [[ ! -f "$DB" ]] || [[ $(find "$DB" -mmin +60 2>/dev/null | wc -l) -gt 0 ]]; then
        echo "[S.T.E.L.L.A.] Syncing vault index..."
        "$VENV" "$JARVIS_HOME/vault_ingest.py" --vault "$VAULT_PATH" --db "$DB" 2>/dev/null
    fi
fi

# Build context preamble from vault DB
CONTEXT=""
if [[ -f "$DB" ]]; then
    CONTEXT="$("$VENV" - "$DB" <<'PYEOF' 2>/dev/null
import sqlite3, sys, json
from datetime import datetime, timezone

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

# Vitals
vitals_row = conn.execute(
    "SELECT energy, hrv, mood, p_level, caffeine FROM journal WHERE date=?", (today,)
).fetchone()
vitals = ""
if vitals_row:
    e, h, m, p, c = vitals_row
    parts = []
    if p: parts.append(f"P{p}")
    if e: parts.append(f"energy:{e}")
    if h: parts.append(f"HRV:{h}")
    vitals = " · ".join(parts) if parts else ""

# Open tasks
tasks = conn.execute(
    "SELECT text, p_level, due FROM tasks WHERE status='open' "
    "ORDER BY CASE WHEN due IS NULL THEN 1 ELSE 0 END, due, COALESCE(p_level,9) LIMIT 10"
).fetchall()

# Sector
sector_row = conn.execute(
    "SELECT sector FROM notes ORDER BY modified_at DESC LIMIT 1"
).fetchone()
sector = sector_row[0] if sector_row else "general"

# Counts
open_count = conn.execute("SELECT COUNT(*) FROM tasks WHERE status='open'").fetchone()[0]
overdue = conn.execute(
    "SELECT COUNT(*) FROM tasks WHERE status='open' AND due < ?", (today,)
).fetchone()[0]

# Build header
header = f"S.T.E.L.L.A. online · sector: {sector} · {vitals + ' · ' if vitals else ''}{open_count} open · {overdue} overdue"
print(header)
if tasks:
    print("\nTOP OPEN TASKS:")
    for text, p, due in tasks[:5]:
        p_str = f"[P{p}]" if p else "[P?]"
        due_str = f"  due:{due}" if due else ""
        print(f"  {p_str} {text[:80]}{due_str}")

conn.close()
PYEOF
    )"
fi

if [[ -n "$CONTEXT" ]]; then
    echo "$CONTEXT"
    echo ""
fi

# Launch jarvis with vault context injected
exec "$JARVIS_HOME/.venv/bin/jarvis" "$@"
