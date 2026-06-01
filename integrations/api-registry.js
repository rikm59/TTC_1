/**
 * API Registry — global access to the cporter202/API-mega-list catalogue.
 *
 * The catalogue lives at libs/api-mega-list (git submodule). Each category
 * folder contains a README.md with a markdown table:
 *   | [Name](url) | Description |
 *
 * Usage:
 *   import { search, getCategory, listCategories } from './integrations/api-registry.js';
 *
 *   const results = search('instagram scraper');
 *   const aiApis  = getCategory('ai');
 *   const cats    = listCategories();
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CATALOGUE_ROOT = join(__dir, '..', 'libs', 'api-mega-list');

// ── Parsing ────────────────────────────────────────────────────────────────

function parseTableRow(line) {
  // Matches: | [Name](url) | Description |
  const match = line.match(/\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*(.+?)\s*\|/);
  if (!match) return null;
  return { name: match[1].trim(), url: match[2].trim(), description: match[3].trim() };
}

function parseReadme(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const entries = [];
  for (const line of text.split('\n')) {
    const entry = parseTableRow(line);
    if (entry) entries.push(entry);
  }
  return entries;
}

// ── Category discovery ─────────────────────────────────────────────────────

function discoverCategories() {
  if (!existsSync(CATALOGUE_ROOT)) {
    throw new Error(
      `API catalogue not found at ${CATALOGUE_ROOT}. Run: git submodule update --init`
    );
  }
  const entries = readdirSync(CATALOGUE_ROOT, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && e.name.match(/^[a-z].*-apis?-/i))
    .map(e => {
      const slug = e.name.replace(/-\d+$/, '');          // "ai-apis-1208" → "ai-apis"
      const label = slug.replace(/-apis?$/, '')          // "ai-apis" → "ai"
                        .replace(/-/g, ' ');             // "developer tools"
      return { slug: label, dir: e.name, path: join(CATALOGUE_ROOT, e.name, 'README.md') };
    })
    .filter(c => existsSync(c.path));
}

// ── Lazy in-memory cache ───────────────────────────────────────────────────

let _index = null;

function buildIndex() {
  if (_index) return _index;
  const categories = discoverCategories();
  _index = {};
  for (const cat of categories) {
    _index[cat.slug] = { meta: cat, entries: parseReadme(cat.path) };
  }
  return _index;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns all category slugs (e.g. "ai", "automation", "social media").
 */
export function listCategories() {
  return Object.keys(buildIndex()).sort();
}

/**
 * Returns all API entries for a given category slug (case-insensitive partial match).
 * e.g. getCategory('ai') or getCategory('social')
 */
export function getCategory(slug) {
  const idx = buildIndex();
  const key = Object.keys(idx).find(k => k.includes(slug.toLowerCase()));
  if (!key) return [];
  return idx[key].entries;
}

/**
 * Full-text search across all categories.
 * Returns entries matching query in name or description (case-insensitive).
 * Optional: pass { category } to restrict to one category slug.
 */
export function search(query, { category } = {}) {
  const q = query.toLowerCase();
  const idx = buildIndex();
  const keys = category
    ? Object.keys(idx).filter(k => k.includes(category.toLowerCase()))
    : Object.keys(idx);

  const results = [];
  for (const key of keys) {
    for (const entry of idx[key].entries) {
      if (entry.name.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q)) {
        results.push({ ...entry, category: key });
      }
    }
  }
  return results;
}

/**
 * Returns every API entry across all categories, optionally filtered by category slug.
 */
export function getAll({ category } = {}) {
  return search('', { category });
}

/**
 * Returns a summary of the catalogue: total APIs per category.
 */
export function summary() {
  const idx = buildIndex();
  return Object.entries(idx)
    .map(([slug, data]) => ({ category: slug, count: data.entries.length }))
    .sort((a, b) => b.count - a.count);
}
