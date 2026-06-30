# Development Guidelines

Conventions and workflows for working on **Meowdo**. For the architecture map and load-bearing
invariants, see `CLAUDE.md`; for the user-facing overview, `README.md`.

## Ground rules

- **No build step, no framework, no package manager.** Plain ES2020+ JavaScript with HTML/CSS,
  loaded as an unpacked MV3 extension. Don't introduce a bundler, TypeScript, or `node_modules`.
  Editing a file *is* the change.
- **No runtime dependencies.** No CDN, npm dep, or remote resource. (`node` / `python3` are dev
  tooling only — never required at runtime.)
- **Preserve the privacy invariant.** Nothing leaves the device: no network calls, analytics, or
  remote code. Tasks live only in `chrome.storage.local`. A change that breaks this must be
  flagged, not landed quietly.
- **Keep permissions minimal.** The current set is `storage`, `alarms`, `notifications`,
  `offscreen`, each justified in the Web Store listing. Adding one triggers stricter review — get
  explicit sign-off first. (`offscreen` exists only to play the reminder chime — audio, no network.)

## Code style

- **2-space indentation**, semicolons, double-quoted strings — match the existing files.
- Prefer **small `async/await` functions**; wrap `chrome.*` callback APIs in promises
  (`loadState`/`saveState` already do).
- Vanilla DOM only (`document.querySelector`, `createElement`, `addEventListener`) — no jQuery;
  the tiny `$` alias is enough.
- **User text goes through `textContent`, never `innerHTML`.** `innerHTML` is reserved for the
  static SVG glyphs in `SVG` (no user data). This is the one XSS-shaped footgun here.
- **Match the surrounding comment density.** Comments explain *why* (the echo guard, why alarms
  instead of `setTimeout`, the `notified` gate), not *what*.
- Guard `chrome.*` calls that can reject (notifications, badge) with try/catch, as the worker does.
- Keep the split clean: `popup.js` and `alert.js` mutate data (tasks); `background.js` owns the
  side effects (badge + alarms + notification + chime + alert window); `store.js` owns the shape.
  Don't set the badge or create an alarm from a UI surface — change storage and let the worker
  reconcile.

## Data & lifecycle

- All state is one object under `chrome.storage.local["tally"]` (`STORE_KEY`). Read it with
  `loadState()` (which runs `normalize()`); write the whole object with `saveState()`.
- In the popup, **never mutate-and-save by hand** — go through `commit(mut)` so the write is
  recorded in `selfWrites` (the echo guard, so the popup ignores its own storage change) and a
  re-render follows.
- In the worker, **never derive side effects ad hoc** — change storage and let `reconcile()`
  rebuild the badge and alarms. One code path keeps them from drifting.
- A task's reminder is `{ remindAt: <epoch ms> | null, notified: bool }`. Setting/clearing a
  reminder resets `notified` to `false`; the worker schedules an alarm only while
  `!done && remindAt && !notified`.

## Adding a feature

- **A new per-task field** → add it to the object built in `addTodo` *and* to `normalize()` in
  `store.js` (with a default), so old stored tasks stay valid. Render it in `renderTodo`.
- **A new task action** → add a `row-btn` in `renderTodo`, a mutation that goes through
  `commit`, and (if it affects reminders/the count) nothing else — the worker reconciles.
- **A new reminder preset** → add a `[key, label, fn]` entry to the `REMIND_PRESETS` array; `fn`
  returns an epoch-ms timestamp (evaluated at Save time). The `Custom…` entry (`fn === null`)
  must stay last.
- **A new list operation** → follow `saveListName` / `deleteCurrentList`: mutate `s.lists` /
  `s.todos` / `s.settings.activeListId` together so no task is orphaned to a missing list
  (`normalize()` will re-home any that are, but don't rely on it as the primary path).

## Manual test checklist

There is no automated test suite. After a change, load the unpacked extension
(`chrome://extensions` → Developer mode → Load unpacked → this folder) and verify:

1. **Add / complete / delete** — type a task + Enter (badge count goes up); click the circle to
   complete (drops to the bottom, struck through; badge down); the trash icon removes it.
2. **Edit in place** — click a task's text, change it, Enter to save / Esc to cancel; clearing
   the text deletes the task.
3. **Filters** — All / Active / Done show the right subset with correct counts; the empty state
   message matches the active filter.
4. **Lists** — ＋ adds a list (and selects it); the dropdown switches scope; **All lists** shows
   every task; ⋯ → Rename works; ⋯ → Delete asks once, then removes the list and its tasks; the
   badge counts across all lists.
5. **Reminders** — bell → the preset dropdown (**In 30 minutes** / **1 hour** / **2 hours** /
   **This evening** / **Tomorrow**) updates the live "→ time" hint; **Custom…** reveals the
   date/time picker. Save; the chip shows the time (red when overdue); editing/clearing works.
   Pick **Custom…** ~1 min out and confirm all three cues fire: the **notification** (with **Mark
   done** / **Snooze 10 min**), the on-screen **alert window**, and the **chime**. Check that the
   buttons on *both* the notification and the alert window do what they say (badge/chip update
   after). Snooze should re-open the alert ~10 min later.
6. **Persistence** — reopen the popup and reload the extension; tasks, lists, and reminders
   survive. A reminder set for a past minute (e.g. via DevTools) fires on the next worker start.
7. **Privacy** — with DevTools open on the popup and the service worker, confirm **no network
   requests** are made.

## Tooling

- **Icons** — procedurally generated; edit `icons/gen_icons.py` and re-run it.
- **Packaging** — `build.sh` produces the whitelisted Web Store zip.

## Releasing

Use the `cut-release` skill: bump `version` in `manifest.json` → write `docs/releases/v<version>.md`
→ `./build.sh` → commit → tag `v<version>` → `gh release create` with the zip. Push and release
are outward-facing — confirm before those steps. The Web Store listing copy and privacy policy
live in `docs/store-listing.md` and `docs/PRIVACY.md`.

## Commit conventions

- Short imperative subject (`Fix …`, `Add …`, `Release v1.0.1`), with a body explaining the
  *why* when non-obvious.
- End commit messages with the required `Co-Authored-By` trailer.
- Commit/push only when asked.
