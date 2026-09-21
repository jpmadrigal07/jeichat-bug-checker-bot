# JeiChat bug checker bot

Standalone **JavaScript** bot that **reproduces a ticket on a live website** when someone adds the **Bug** label. It waits 15 seconds so a mislabel can be undone, then replies **CONFIRM** or **REFUTE** with steps, a short description, and screenshots when they help.

This is live-site QA, not source-code review. The mention-driven reviewer is `jeichat-sample-bot`. The assignee-driven fixer is `jeichat-fixer-bot`.

See [SPEC.md](./SPEC.md) for the full contract.

## Prerequisites

- [Bun](https://bun.sh)
- JeiChat API at `http://localhost:3001` (with bot attachment uploads enabled)
- Workspace **owner** (to create the bot)
- [Cursor API key](https://cursor.com/dashboard/integrations)

## Run

1. In JeiChat: **Settings → Bots → Create** a bot named something like `Bug Checker`. Copy the `jei_live_...` token (shown once). Keep it in `.env`, not in git.
2. In this folder:

```bash
bun install
cp .env.example .env
```

3. Fill `.env` with that **checker** token (not the tester or fixer token):

```
JEICHAT_BOT_TOKEN=jei_live_...
JEICHAT_API_URL=http://localhost:3001
CURSOR_API_KEY=cursor_...
CURSOR_RUNTIME=local
CURSOR_REPO_PATH=C:\zkript-solutions\in-house\jeichat-bug-checker-bot
```

4. Start:

```bash
bun run start
```

5. On a ticket, put this in the **description** (under the title), then add the **Bug** label:

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

Website and Page are required. The rest is optional but makes CONFIRM/REFUTE more accurate.

The bot waits 15 seconds, then comments in the ticket thread. If Website/Page are missing from the **description**, it asks for that template even when earlier chat messages already contain example URLs. Fill the description, **remove Bug, add Bug again** to retry.

## Env

| Variable | Purpose |
|---|---|
| `JEICHAT_BOT_TOKEN` | Checker bot token from JeiChat |
| `JEICHAT_API_URL` | API origin (`http://localhost:3001`) |
| `CURSOR_API_KEY` | Cursor user or service-account key |
| `CURSOR_RUNTIME` | `local` or `cloud` (cloud screenshots attach via artifact download) |
| `CURSOR_REPO_PATH` | This checkout for local runtime (defaults to `cwd`) |
| `CURSOR_REPO_URL` | Optional git URL to clone on cloud (omit for an empty VM) |
| `CURSOR_REPO_REF` | Branch / SHA for cloud (`main` default) |
| `CURSOR_MODEL` | Model id (`composer-2.5` default) |
