# Agent & Sub-Agent Caching

`integrations/cache.js` provides a small in-process TTL cache (`TTLCache`,
`memoize`, `getCache`, `allStats`) used by two layers of the system:

## 1. LLM response cache (agent layer)

`integrations/claude-client.js` wraps every `ask*` call in a response cache
keyed on `(provider order, system prompt, user message, maxTokens)`, TTL
10 minutes. Agents (lead scoring, content generation, reply handling, etc.)
frequently re-run with identical inputs within a scheduler cycle — repeat
calls are served from memory instead of hitting a paid provider.

- Disable per call with `{ cache: false }` as the 4th/5th argument — used by
  `askClaudeStream`, where a replayed response would be wrong.
- Inspect hit/miss counts via `getLLMCacheStats()` or the `/api/cache-stats`
  endpoint.

On top of that, direct Anthropic calls (`callAnthropic`) mark the system
prompt as an `ephemeral` cache breakpoint via `cache_control`. Agent system
prompts are static strings reused across many calls (see `SYSTEM` constants
in `agents/*.js`), so Anthropic's own prompt cache reuses the cached prefix
server-side — this cuts cost/latency independent of our in-process cache,
and still helps on the first call after our cache entry expires.

## 2. Notion query cache (sub-agent layer)

`integrations/notion-crm.js` memoizes read queries that multiple
agents/sub-agents poll independently in the same run (leads, content
calendar, appointments, follow-up queue). TTL is 60s (15s for the
follow-up queue, since its `Send At` filter is time-sensitive).

Every write (`createLead`, `updateLeadStatus`, `createContentItem`,
`markFollowUpSent`, etc.) clears the corresponding cache (`notion-leads`,
`notion-content`, `notion-appts`, `notion-followup`) so the next read is
never stale relative to a write that just happened.

## Inspecting cache state

```
GET /api/cache-stats
```

Returns hit/miss/size for every named cache (LLM responses + each Notion
query group).

## Porting this policy to other tools/frameworks

[`docs/caching-policy.json`](./caching-policy.json) describes this same
caching architecture as a tool-agnostic JSON spec — cache layers, TTLs, key
strategy, and invalidation rules — so the same policy can be reimplemented
in another agent framework or no-code tool (LangChain, CrewAI, AutoGen,
Make.com, n8n, etc.) without depending on this repo's code.

