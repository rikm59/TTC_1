# TTC Estimator — Feature Reference

Use this file to update the in-app PDF guides (`public/docs/`). Each section below matches a guide section.

---

## Estimate Form

### Client Info Section
- **Return-client autocomplete** — Start typing a client name and matching CRM contacts appear in a dropdown. Selecting one fills in all fields instantly (name, company, phone, email, address).
- **Auto-save to CRM** — As you type, client info is automatically saved to the CRM within 1.5 seconds. A "Saved to CRM" indicator briefly appears when the sync completes. No manual action needed.
- **Clear button** — A "Clear" link appears at the bottom of the form when any field has data. Clicking it resets all client fields so you can start fresh.
- **Draft persistence** — The entire in-progress estimate is saved to the device every 500 ms. Switching tabs, backgrounding the app, or receiving a call will no longer lose your work.

### Auto-Save Behavior
- Every 500 ms: current estimate saved to device storage (`ttc_draft_estimate`)
- Every 30 s: full estimate saved to estimate history (`ttc_estimates`)
- On closing the tab or navigating away: draft is preserved and restored on next open

---

## CRM (Clients)

- **Company field** — Clients now have an optional Company field in both the add-client modal and the estimate form.
- **Estimates auto-link** — When you fill in a client name on an estimate, the CRM record is created or updated automatically. You'll see the client appear in the CRM without having to add them separately.
- **Return clients** — Clients added through the CRM appear as suggestions when typing a client name on any new estimate.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-09 | Return-client autocomplete in estimate form |
| 2026-06-09 | Auto-save client info to CRM on typing |
| 2026-06-09 | Clear button on client info form |
| 2026-06-09 | Company field added to CRM client records |
| 2026-06-09 | Draft estimate persists across tab switches on mobile |
| 2026-06-09 | Page no longer hangs when network is slow |
