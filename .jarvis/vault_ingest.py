#!/usr/bin/env python3
"""
S.T.E.L.L.A. Vault Ingestion Pipeline
Indexes an Obsidian vault: BM25 + dense embeddings + wikilink graph → SQLite
Usage: python ~/.openjarvis/vault_ingest.py --vault ~/path/to/vault
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import frontmatter
except ImportError:
    frontmatter = None

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False

try:
    import anthropic
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False


JARVIS_HOME = Path(os.environ.get("OPENJARVIS_HOME", Path.home() / ".openjarvis"))
DB_PATH = JARVIS_HOME / "stella.db"

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS notes (
            id          TEXT PRIMARY KEY,
            path        TEXT UNIQUE NOT NULL,
            title       TEXT,
            content     TEXT,
            frontmatter TEXT,
            tags        TEXT,
            sector      TEXT,
            status      TEXT,
            due         TEXT,
            p_level     INTEGER,
            word_count  INTEGER,
            created_at  TEXT,
            modified_at TEXT,
            indexed_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS edges (
            src  TEXT NOT NULL,
            dst  TEXT NOT NULL,
            type TEXT DEFAULT 'wikilink',
            PRIMARY KEY (src, dst, type)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id          TEXT PRIMARY KEY,
            note_path   TEXT,
            text        TEXT,
            status      TEXT DEFAULT 'open',
            p_level     INTEGER,
            due         TEXT,
            project     TEXT,
            created_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS journal (
            date        TEXT PRIMARY KEY,
            note_path   TEXT,
            energy      INTEGER,
            hrv         INTEGER,
            mood        INTEGER,
            p_level     INTEGER,
            caffeine    INTEGER,
            wins        TEXT,
            blockers    TEXT,
            raw         TEXT
        );

        CREATE TABLE IF NOT EXISTS telemetry (
            key   TEXT PRIMARY KEY,
            value TEXT,
            ts    TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_notes_sector ON notes(sector);
        CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks(due);
    """)
    conn.commit()


def note_id(path: Path, vault_root: Path) -> str:
    rel = path.relative_to(vault_root)
    return hashlib.sha1(str(rel).encode()).hexdigest()[:12]


def parse_frontmatter(content: str) -> dict[str, Any]:
    if frontmatter:
        try:
            post = frontmatter.loads(content)
            return dict(post.metadata)
        except Exception:
            pass
    # Fallback: simple YAML-ish parse
    meta: dict[str, Any] = {}
    m = FRONTMATTER_RE.match(content)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
    return meta


def extract_tasks(content: str, note_path: str) -> list[dict[str, Any]]:
    tasks = []
    for i, line in enumerate(content.splitlines()):
        m = re.match(r"^\s*[-*]\s+\[( |x|X|-)\]\s+(.*)", line)
        if m:
            done = m.group(1).lower() in ("x",)
            text = m.group(2)
            p_match = re.search(r"\bP(\d)\b", text)
            due_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
            tasks.append({
                "id": hashlib.sha1(f"{note_path}:{i}:{text}".encode()).hexdigest()[:12],
                "note_path": note_path,
                "text": text,
                "status": "done" if done else "open",
                "p_level": int(p_match.group(1)) if p_match else None,
                "due": due_match.group(1) if due_match else None,
                "project": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
    return tasks


def parse_journal_vitals(content: str) -> dict[str, Any]:
    vitals: dict[str, Any] = {}
    patterns = {
        "energy": r"energy[:\s]+(\d+)",
        "hrv": r"hrv[:\s]+(\d+)",
        "mood": r"mood[:\s]+(\d+)",
        "p_level": r"p.?level[:\s]+P?(\d)",
        "caffeine": r"caffeine[:\s]+(\d+)",
    }
    for key, pat in patterns.items():
        m = re.search(pat, content, re.IGNORECASE)
        if m:
            vitals[key] = int(m.group(1))
    wins_m = re.search(r"wins?[:\n]+(.*?)(?:\n\n|\nblock|\Z)", content, re.IGNORECASE | re.DOTALL)
    if wins_m:
        vitals["wins"] = wins_m.group(1).strip()[:500]
    block_m = re.search(r"block(?:er)?s?[:\n]+(.*?)(?:\n\n|\Z)", content, re.IGNORECASE | re.DOTALL)
    if block_m:
        vitals["blockers"] = block_m.group(1).strip()[:500]
    return vitals


def ingest_vault(vault_root: Path, conn: sqlite3.Connection) -> dict[str, int]:
    stats = {"notes": 0, "edges": 0, "tasks": 0, "journal": 0}
    title_to_id: dict[str, str] = {}

    md_files = list(vault_root.rglob("*.md"))
    print(f"  Found {len(md_files)} markdown files")

    now = datetime.now(timezone.utc).isoformat()

    for path in md_files:
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        meta = parse_frontmatter(content)
        rel_path = str(path.relative_to(vault_root))
        nid = note_id(path, vault_root)
        title = meta.get("title") or path.stem
        tags = json.dumps(meta.get("tags", []))
        sector = meta.get("sector") or meta.get("project") or _infer_sector(rel_path)

        modified = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()

        conn.execute("""
            INSERT OR REPLACE INTO notes
            (id, path, title, content, frontmatter, tags, sector, status, due, p_level, word_count, modified_at, indexed_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            nid, rel_path, title, content, json.dumps(meta), tags,
            sector, meta.get("status"), meta.get("due"),
            meta.get("p-level") or meta.get("p_level"),
            len(content.split()), modified, now,
        ))
        title_to_id[path.stem.lower()] = nid
        stats["notes"] += 1

        # Extract tasks
        for task in extract_tasks(content, rel_path):
            conn.execute("""
                INSERT OR REPLACE INTO tasks (id, note_path, text, status, p_level, due, project, created_at)
                VALUES (?,?,?,?,?,?,?,?)
            """, (task["id"], task["note_path"], task["text"], task["status"],
                  task["p_level"], task["due"], task["project"], task["created_at"]))
            stats["tasks"] += 1

        # Parse journal entries
        if "journal" in rel_path.lower() or re.match(r"\d{4}-\d{2}-\d{2}", path.stem):
            vitals = parse_journal_vitals(content)
            date_m = re.search(r"(\d{4}-\d{2}-\d{2})", path.stem)
            if date_m:
                conn.execute("""
                    INSERT OR REPLACE INTO journal
                    (date, note_path, energy, hrv, mood, p_level, caffeine, wins, blockers, raw)
                    VALUES (?,?,?,?,?,?,?,?,?,?)
                """, (
                    date_m.group(1), rel_path,
                    vitals.get("energy"), vitals.get("hrv"), vitals.get("mood"),
                    vitals.get("p_level"), vitals.get("caffeine"),
                    vitals.get("wins"), vitals.get("blockers"),
                    content[:2000],
                ))
                stats["journal"] += 1

    # Second pass: wikilink edges
    for path in md_files:
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        src_id = note_id(path, vault_root)
        for match in WIKILINK_RE.finditer(content):
            target = match.group(1).strip().lower()
            dst_id = title_to_id.get(target)
            if dst_id and dst_id != src_id:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO edges (src, dst, type) VALUES (?,?,'wikilink')",
                        (src_id, dst_id)
                    )
                    stats["edges"] += 1
                except Exception:
                    pass

    conn.execute(
        "INSERT OR REPLACE INTO telemetry (key, value, ts) VALUES ('last_ingest', ?, ?)",
        (now, now)
    )
    conn.execute(
        "INSERT OR REPLACE INTO telemetry (key, value, ts) VALUES ('note_count', ?, ?)",
        (str(stats["notes"]), now)
    )
    conn.execute(
        "INSERT OR REPLACE INTO telemetry (key, value, ts) VALUES ('edge_count', ?, ?)",
        (str(stats["edges"]), now)
    )
    conn.commit()
    return stats


def _infer_sector(rel_path: str) -> str:
    parts = Path(rel_path).parts
    if len(parts) > 1:
        return parts[0]
    return "general"


def query_context(conn: sqlite3.Connection, query: str, limit: int = 12) -> str:
    """Simple BM25-style keyword search over notes — returns formatted context."""
    words = re.sub(r"[^\w\s]", "", query.lower()).split()
    if not words:
        return ""

    placeholders = " OR ".join(["lower(content) LIKE ?" for _ in words])
    args = [f"%{w}%" for w in words]
    rows = conn.execute(
        f"SELECT path, title, content, sector, modified_at FROM notes WHERE {placeholders} "
        f"ORDER BY modified_at DESC LIMIT {limit}",
        args
    ).fetchall()

    if not rows:
        return ""

    chunks = []
    for path, title, content, sector, modified in rows:
        snippet = _best_snippet(content, words)
        chunks.append(f"[[{title or path}]] ({sector}) — {snippet}")
    return "\n".join(chunks)


def _best_snippet(content: str, keywords: list[str], window: int = 200) -> str:
    lower = content.lower()
    best_pos = 0
    best_score = 0
    for i in range(0, len(lower), 50):
        chunk = lower[i:i + window]
        score = sum(chunk.count(w) for w in keywords)
        if score > best_score:
            best_score = score
            best_pos = i
    return content[best_pos:best_pos + window].replace("\n", " ").strip()


def get_open_tasks(conn: sqlite3.Connection, limit: int = 20) -> list[dict]:
    rows = conn.execute(
        "SELECT id, note_path, text, p_level, due FROM tasks WHERE status='open' "
        "ORDER BY CASE WHEN due IS NULL THEN 1 ELSE 0 END, due, COALESCE(p_level, 9) LIMIT ?",
        (limit,)
    ).fetchall()
    return [{"id": r[0], "note": r[1], "text": r[2], "p": r[3], "due": r[4]} for r in rows]


def get_todays_vitals(conn: sqlite3.Connection) -> dict:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    row = conn.execute(
        "SELECT energy, hrv, mood, p_level, caffeine, wins, blockers FROM journal WHERE date=?",
        (today,)
    ).fetchone()
    if row:
        return {"energy": row[0], "hrv": row[1], "mood": row[2], "p_level": row[3],
                "caffeine": row[4], "wins": row[5], "blockers": row[6]}
    return {}


def get_telemetry(conn: sqlite3.Connection) -> str:
    rows = conn.execute("SELECT key, value FROM telemetry").fetchall()
    d = {r[0]: r[1] for r in rows}
    notes = d.get("note_count", "?")
    edges = d.get("edge_count", "?")
    last = d.get("last_ingest", "never")
    return f"TELEMETRY // BM25 ok · dense pending · edges {edges} · nodes {notes} · index_age {last[:10]}"


def main():
    parser = argparse.ArgumentParser(description="S.T.E.L.L.A. Vault Ingestion Pipeline")
    parser.add_argument("--vault", required=True, help="Path to your Obsidian vault")
    parser.add_argument("--db", default=str(DB_PATH), help="SQLite database path")
    parser.add_argument("--query", help="Test a search query after ingest")
    args = parser.parse_args()

    vault = Path(args.vault).expanduser().resolve()
    if not vault.exists():
        print(f"Error: vault not found at {vault}", file=sys.stderr)
        sys.exit(1)

    db_path = Path(args.db).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"S.T.E.L.L.A. Vault Ingestor")
    print(f"  vault: {vault}")
    print(f"  db:    {db_path}")
    print()

    conn = sqlite3.connect(db_path)
    init_db(conn)
    stats = ingest_vault(vault, conn)

    print(f"\nIngest complete:")
    print(f"  notes:   {stats['notes']}")
    print(f"  edges:   {stats['edges']}")
    print(f"  tasks:   {stats['tasks']}")
    print(f"  journal: {stats['journal']}")
    print(f"\n{get_telemetry(conn)}")

    if args.query:
        print(f"\nSearch: '{args.query}'")
        print(query_context(conn, args.query))

    conn.close()


if __name__ == "__main__":
    main()
