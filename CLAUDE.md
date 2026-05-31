# Xpert Life Solutions — AI Agent Team

Node.js/Express app deployed on Render. Five AI agents that run on cron schedules, coordinated by `xpert-server.js`.

## Architecture

**Entry point**: `xpert-server.js` — Express server, cron scheduler, REST API, webhooks

**Agents** (`agents/`):
- `lead-generator.js` — scrapes/ingests leads, scores them
- `sales-agent.js` — AI outreach via SMS (Twilio) and email (Resend)
- `marketing-team.js` — generates weekly content calendar (Reels, Carousels, Stories, Static Posts, Email Newsletters)
- `scheduling-agent.js` — books appointments, sends reminders, processes Calendly webhooks
- `followup-agent.js` — nurture sequences for cold leads
- `social-poster.js` — publishes content to Instagram/Facebook

**Integrations** (`integrations/`):
- `notion-crm.js` — single source of truth; 4 databases: Leads, Content Calendar, Appointments, Follow-Ups
- `claude-client.js` — Claude-first model router (`askPremiumJSON`); order: Claude → OpenAI → Gemini → DeepSeek → Grok
- `image-client.js` — carousel slide images: AI background (Replicate → Fal → DALL-E) + ffmpeg text composite → Cloudinary
- `video-client.js` — Reels: AI footage (Kie.ai → Replicate → Fal → Luma) + ffmpeg overlay → Cloudinary
- `cloudinary-client.js` — permanent media storage; supports `CLOUDINARY_URL` or separate `CLOUD_NAME/API_KEY/API_SECRET`
- `twilio-client.js` — SMS send/receive
- `email-client.js` — Resend transactional email

## Key patterns

**Content pipeline**: `buildWeeklyContentCalendar` → `buildFullContent` → `maybeGenerateVideo` → `createContentItem` (Notion)

**Carousel metadata persistence**: Script field stores `[Slide N]...\n\n[Caption]\n...\n\n[CTA]\n...\n\n[CoverSubtitle]\n...` — parsed by `parseCarouselScript` in `xpert-server.js`.

**Polish All** (`POST /api/run/polish-all`): scans all content items, replaces broken/missing media. Treats `.onrender.com` video URLs as broken (ephemeral disk). Cloudinary URLs are permanent.

**ffmpeg text safety**: `ffSafe()` uses an allowlist `[a-zA-Z0-9 \-\.!?']` — prevents filter-graph injection from Notion content. `execFfmpeg()` retries with DejaVu font directives stripped if the first attempt fails.

**Notion rich_text**: Always join all blocks — `rich_text?.map(r => r.plain_text ?? '').join('')` — never take only `[0]`, as long text spans multiple 2000-char blocks.

## Auth

All mutating and data-reading endpoints require `x-auth-token` header matching `TRIGGER_SECRET_KEY`. The dashboard stores the key in `localStorage` and sends it on every request. Never pass the token as a URL query parameter.

## Cron schedules

| Schedule | Agent |
|---|---|
| 08:00 daily | Lead Gen + Sales |
| 09:00 Mon/Wed/Fri | Marketing Team |
| Every 2 hours | Follow-Up + Appointment Reminders |

## Deployment

Render.com — see `render.yaml`. `buildCommand` installs `fonts-dejavu-core` for ffmpeg text rendering. Media is ephemeral on disk; always upload to Cloudinary for permanent URLs.

## Session history

- https://claude.ai/code/session_014PEVQieRi3SQMzA5AuNLUT — AI photo carousel backgrounds, code review (7 fixes), adversarial security review (13 fixes)
