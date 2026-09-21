# Bug checker bot

Standalone JeiChat bot that **reproduces a ticket on a live website** when someone adds the **Bug** label. It waits 15 seconds so a mislabel can be undone, then replies **CONFIRM** or **REFUTE** with steps, a short description, and screenshots when they help.

This is live-site QA, not source-code review. The mention-driven reviewer is `jeichat-sample-bot`. The assignee-driven fixer is `jeichat-fixer-bot`.

## Flow

```
User adds Bug label
        │
        ▼
  Wait 15 seconds
        │
        ├── label removed → abort (no reply)
        │
        ▼
  Re-fetch ticket labels
        │
        ├── Bug gone → abort
        ├── website or page missing → post template, stop
        └── still Bug → ack → Cursor agent visits the site → CONFIRM/REFUTE (+ screenshots)
```

## Trigger

- Socket.IO `channel_event` → `ticketUpdate`
- Only `type === "labels_changed"`
- **Added** labels = names in `toValue` that are not in `fromValue` (by label id)
- Match name **Bug** case-insensitively
- Ignore other label edits while Bug is already present
- If Bug is **removed**, cancel the pending 15s timer for that ticket
- If Bug is **added**, (re)schedule a 15s timer per ticket id
- After the timer: `GET /workspaces/:ws/channels/:ticketId` and abort unless Bug is still on the ticket
- Two tickets can be in flight; skip a ticket already being checked

## Ticket input format

JeiChat tickets have no custom fields. The bot parses **Website** and **Page** from the **ticket description only** (not title, not chat history). Those two are required to start a check. Everything else is optional and is still sent to Cursor as the full description plus recent messages.

```
Website: https://example.com
Page: /settings
Test credentials: user@test.com / password

What's wrong:
<what you see>

Expected:
<what should happen>

Steps I tried:
1. ...
2. ...

Browser:
When: always / sometimes
Screenshot: attach if you have one
```

- A bare URL counts as **Website**
- If the URL has a path other than `/`, that path can count as **Page**
- **Test credentials** are optional
- If **Website** or **Page** is missing (or Website is still `example.com`), the bot posts that template and stops. It reads those fields from the **ticket description only**, not from earlier chat messages.

Do not echo test credentials in the public reply.

## Cursor check

`Agent.create` + `send` via `@cursor/sdk`. Default **local** runtime with `cwd` = this repo so screenshots stay on disk. Cloud is optional via env: the agent must save PNGs under `/opt/cursor/artifacts/`, then the bot downloads them with `listArtifacts` / `downloadArtifact` and attaches them the same way as local.

Prompt rules:

- Do not modify product code, commit, or open a PR
- Open **Website**, go to **Page**, sign in only if credentials were provided
- Try to reproduce the ticket
- Save proving screenshots under `runs/<ticketId>/` when they help
- Reply in this shape:

```
Verdict: CONFIRM
What's happening: <short description>
Steps to reproduce:
1. ...
2. ...
```

or `Verdict: REFUTE` with what was tried and why it did not reproduce.

Parse `Verdict: CONFIRM` vs `Verdict: REFUTE` from the agent text. Truncate replies to ~3500 characters.

## Reply

The bot comments on the ticket. It does **not** change status, assignee, or labels.

## Screenshots (JeiChat API companion change)

Bots cannot upload today (`POST /attachments/presign` is session-only).

In `jeichat`:

- Add `@BotAllowed()` on attachment **presign** and **download-url**
- Use `@Actor()` / `actor.userId` instead of `session.user.id`
- Keep `SEND_MESSAGES` / `VIEW_CHANNEL` checks (default bot role already has these)
- Bot: presign → PUT bytes to R2 → `POST /channels/:id/messages` with `attachmentIds`
- Cap at 5 images
- If there are no PNG/JPEG/GIF/WEBP files, send text only

## Repo layout

```
src/client.js      JeiChat REST + channel_event
src/labels.js      added/removed Bug detection
src/debounce.js    15s per-ticket timers + cancel on unlabel
src/fields.js      parse website / page / credentials
src/cursor.js      cursorAgentOptions()
src/check.js       prompt + Agent.prompt
src/verdict.js     CONFIRM / REFUTE
src/upload.js      presign + attach screenshots
src/index.js       wire-up
src/*.test.js      labels, fields, verdict, debounce
```

Stack: Bun, JavaScript, `@cursor/sdk`, `socket.io-client`. Same pattern as `jeichat-sample-bot`.

## Env

| Variable | Purpose |
|---|---|
| `JEICHAT_BOT_TOKEN` | Bot token from JeiChat Settings → Bots |
| `JEICHAT_API_URL` | API origin (`http://localhost:3001`) |
| `CURSOR_API_KEY` | Cursor user or service-account key |
| `CURSOR_RUNTIME` | `local` (default) or `cloud` |
| `CURSOR_REPO_PATH` | This checkout (local runtime; defaults to `cwd`) |
| `CURSOR_REPO_URL` | Optional git URL to clone on cloud (empty VM if omitted) |
| `CURSOR_REPO_REF` | Branch / SHA for cloud (`main` default) |
| `CURSOR_MODEL` | Model id (`composer-2.5` default) |

## Out of scope

- GitHub Issues
- Assigning the fixer bot or changing ticket status
- Custom ticket database fields
