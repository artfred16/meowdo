# CLAUDE.md

Guidance for working in this repo.

**Meowdo** is a Manifest V3 Chrome extension: a private to-do list in the toolbar. Add tasks,
organize them into lists, see how many are left on the badge, and get optional reminders. See
`README.md` for the user-facing overview and `GUIDELINES.md` for development conventions.

## Quick facts

- **No build step, no framework, no `npm install`.** Plain ES2020+ JavaScript with HTML/CSS.
  Editing a source file *is* the change — just reload the unpacked extension at
  `chrome://extensions`. There is no transpile/bundle stage.
- **No runtime network access of any kind.** Tasks live in `chrome.storage.local` on the
  device; nothing is fetched or sent. This is a hard invariant — see
  [Invariants](#invariants--do-not-break).
- `node` is used *only* by `build.sh` (to read `name`/`version` from `manifest.json`).
  `python3` powers the icon tooling. Neither is a runtime dependency.
- There is **no test suite** — verify changes manually (see `GUIDELINES.md`).
- Current version: `manifest.json` → `version` (currently `1.0.0`).

## Commands

| Task | Command | Output |
| --- | --- | --- |
| Package the Web Store zip | `./build.sh` | `dist/meowdo-v<version>.zip` |
| Regenerate icons | `python3 icons/gen_icons.py` | `icons/icon{16,32,48,128}.png` |

## Architecture / file map

| File | Role | Key symbols |
| --- | --- | --- |
| `manifest.json` | MV3 manifest: name, the four permissions (`storage`, `alarms`, `notifications`, `offscreen`), `action` popup, `background` service worker. | — |
| `store.js` | **Shared model + storage.** DOM-free; loaded by both the popup (`<script>`) and the worker (`importScripts`). One storage key; every read is normalized. | `STORE_KEY`, `normalize`, `loadState`, `saveState`, `uid`, `activeCount` |
| `popup.html/.css/.js` | **The surface.** Add/edit/complete/delete tasks, list switcher, filters, inline reminder editor (preset dropdown + Custom date/time). Mutates `state` and saves; never touches alarms/notifications. | `render`, `commit`, `renderTodo`, `renderRemindEditor`, `REMIND_PRESETS`, `renderToolbar` |
| `background.js` | **Service worker.** Reconciles side effects from storage: the toolbar **badge** and a `chrome.alarms` entry per pending reminder → `chrome.notifications` + a chime + an alert window. | `reconcile`, `updateBadge`, `syncAlarms`, `onAlarm`, `chime`, `openAlert`, `onButtonClicked` |
| `offscreen.html/.js` | **Audio-only offscreen document.** Synthesizes the reminder chime with the Web Audio API (no file shipped). The worker can't play sound itself, so it creates this and messages it. | `playChime` |
| `alert.html/.css/.js` | **On-screen reminder alert.** A small focused popup window (`chrome.windows.create`, type `popup`) the worker opens when a reminder is due; Mark done / Snooze / Dismiss. Loads `store.js`. | `update`, `init` |
| `icons/gen_icons.py` | Dependency-free generator for the blue checklist icon. | `icon_pixel`, `tick`, `make`, `png` |
| `build.sh` | Packages a whitelisted Web Store zip (manifest at root). | — |

## The data flow (the most important behavior)

There is exactly **one source of truth**: the object under `chrome.storage.local["tally"]`,
shaped `{ lists: [{id,name}], todos: [{id,text,done,listId,createdAt,completedAt,remindAt,
notified}], settings: {activeListId, filter} }`. `normalize()` in `store.js` coerces whatever
is read into this shape, so the rest of the code never guards against partial/legacy data.

1. **Popup writes data only.** Every change goes through `commit(mut)` → mutate `state` →
   `saveState`. The popup has no knowledge of alarms or the badge.
2. **The worker reacts to storage.** `chrome.storage.onChanged` → `reconcile()` →
   `updateBadge()` (count of `!done`) + `syncAlarms()` (one alarm named `remind:<id>` per task
   that is `!done && remindAt && !notified`; stale alarms cleared).
3. **A reminder fires** → `onAlarm` marks the task `notified` (so a worker restart can't
   double-fire), saves, then raises **three cues**: a **chime** (offscreen document), an
   on-screen **alert window** (`openAlert` → `chrome.windows.create`), and a **notification**
   with **Mark done** / **Snooze 10 min** buttons. The notification buttons and the alert
   window's buttons both just mutate storage (done / snooze), which re-reconciles. Chime and
   alert are best-effort and fire-and-forget — they never block or break the notification path.
4. **The popup stays live.** It also listens to `storage.onChanged` to re-render if a
   notification action changed data while it's open — but it ignores the echo of its **own**
   write (compares against `lastWritten`) and skips re-render mid inline-edit.

**Why alarms, not setTimeout:** the service worker is not always alive. `chrome.alarms`
persists, wakes the worker, and fires a past-due `when` promptly — so a reminder that came due
while Chrome was closed is delivered on the next startup (`onStartup` → `reconcile`).

## Invariants — do not break

1. **Nothing leaves the device.** No `fetch`/`XMLHttpRequest`/`WebSocket`/`sendBeacon`, no
   analytics, no remote code or CDN assets. Tasks live only in `chrome.storage.local`.
2. **The worker is the only side-effect producer.** Badge and alarms/notifications are derived
   from storage in `reconcile()`. The popup must not create alarms or set the badge itself, or
   the two will drift.
3. **Every read goes through `normalize()`.** Don't consume raw `storage.get` results — shape
   guarantees (valid `listId`, boolean `done`, numeric-or-null `remindAt`) come from there.
4. **`notified` gates re-notification.** A fired reminder sets `notified = true`; changing the
   time resets it to `false`. Don't schedule an alarm for a task that is `done` or `notified`.
5. **Permissions are minimal** (`storage`, `alarms`, `notifications`, `offscreen`). Each is
   justified in the Web Store listing; adding one means new review — don't add casually. The
   `offscreen` document is **audio playback only** (the synthesized chime) — it makes no network
   calls and loads no remote code, so invariant #1 still holds.

If a change would touch any of these, call it out explicitly rather than landing it silently.

## Docs & skills

- **`docs/PRIVACY.md`** — the privacy policy (canonical source; publish as a gist for the Web
  Store listing). **`docs/store-listing.md`** — paste-ready Chrome Web Store listing copy.
  **`docs/releases/v<version>.md`** — per-release notes + submission checklist.
- **`LICENSE`** — proprietary; published for viewing/portfolio only.
- Project skills live in `.claude/skills/` (each is a `SKILL.md`):
  - **`package-extension`** — run `build.sh` to produce the Web Store zip.
  - **`regenerate-icons`** — regenerate the cat-checklist icon from `icons/gen_icons.py`.
  - **`cut-release`** — bump version → write `docs/releases/v<version>.md` → build → tag →
    publish a GitHub release.

## Conventions

See `GUIDELINES.md`. In short: 2-space indent, double-quoted strings, semicolons, small
`async/await` functions, vanilla DOM, `chrome.*` callback APIs wrapped in promises, user text
set via `textContent` (never `innerHTML`), and match the surrounding comment density (explain
*why*). No new runtime dependencies.

## Gotchas / context

- **Shared globals.** `store.js` defines top-level `const`/`function`s that both the popup's
  `<script>` and the worker's `importScripts` see by name (classic scripts share one global
  lexical scope). It must stay DOM-free — no `window`/`document`.
- **`datetime-local` is local time.** `toLocalInput()` formats a timestamp for the input;
  `new Date(value).getTime()` parses it back. `min` is set to "now" so past times can't be
  picked in the UI (overdue reminders still fire via alarm). The reminder editor is a **preset
  dropdown** (`REMIND_PRESETS`) plus a `Custom…` option that reveals the date/time input;
  `resolvedTs()` computes the chosen time and a live "→ time" hint shows what it resolves to.
- **The chime needs an offscreen document.** A service worker has no DOM/Web Audio, so `chime()`
  creates `offscreen.html` (reason `AUDIO_PLAYBACK`) and messages it to play. A promise lock
  (`creatingOffscreen`) stops concurrent alarms double-creating it; the message is sent only
  after `createDocument` resolves, so the listener is ready. Guard with `if (!chrome.offscreen)`
  for older Chrome.
- **Notification sound is OS-dependent; the chime isn't.** `chrome.notifications` shows a banner
  on Windows/Linux/macOS, but the *sound* varies (Windows plays one automatically, macOS depends
  on the per-app setting, Linux is often silent). The synthesized chime plays the same on all
  three, so it's the reliable audible cue.
- **Full re-render every change.** The popup re-renders the whole list on each mutation (it's a
  few dozen nodes). Inline editors (`editId`/`remindId`) and the list name input refocus via
  `requestAnimationFrame` after render.
- **No `Date.now()`/`Math.random()` worries here** — this is browser extension code, not a
  workflow script; those APIs are available and used (`uid`, timestamps).
