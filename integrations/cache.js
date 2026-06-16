'use strict';

/**
 * In-process TTL cache shared by agents and sub-agents.
 *
 * Two consumers:
 *  - claude-client.js: memoizes LLM responses keyed on (provider order, system,
 *    user, maxTokens) so identical agent/sub-agent calls within the TTL window
 *    skip the network round-trip entirely.
 *  - notion-crm.js: memoizes read queries (leads, content, appointments,
 *    follow-ups) that multiple agents/sub-agents poll independently within the
 *    same scheduler cycle, and invalidates them on writes.
 */

const DEFAULT_TTL_MS      = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;

class TTLCache {
  constructor({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, name = 'cache' } = {}) {
    this.ttlMs      = ttlMs;
    this.maxEntries = maxEntries;
    this.name       = name;
    this.store      = new Map(); // key -> { value, expiresAt }
    this.hits       = 0;
    this.misses     = 0;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return undefined; }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (!this.store.has(key) && this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value; // Map preserves insertion order
      this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  deleteByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear() {
    this.store.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      name:    this.name,
      size:    this.store.size,
      hits:    this.hits,
      misses:  this.misses,
      hitRate: total ? +(this.hits / total).toFixed(3) : 0,
    };
  }
}

const registry = new Map();

function getCache(name, opts) {
  if (!registry.has(name)) registry.set(name, new TTLCache({ ...opts, name }));
  return registry.get(name);
}

// Stable, order-independent key for cache lookups.
function cacheKey(parts) {
  const str = JSON.stringify(parts);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `${str.length}:${hash}`;
}

/**
 * Wrap an async function so identical-argument calls within ttlMs are served
 * from cache instead of re-executing fn.
 */
function memoize(fn, { cacheName, ttlMs, keyFn } = {}) {
  const cache = getCache(cacheName || fn.name || 'anonymous', { ttlMs });
  const memoized = async (...args) => {
    const key    = keyFn ? keyFn(...args) : cacheKey(args);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
  memoized.cache = cache;
  return memoized;
}

function allStats() {
  return [...registry.values()].map(c => c.stats());
}

export { TTLCache, getCache, cacheKey, memoize, allStats };
