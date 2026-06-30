# Meowdo ✅

*A fast, private to-do list that lives in your browser toolbar.*

A Chrome extension (Manifest V3) that keeps your tasks one click away: **organize** them into
lists, **see what's left** at a glance (right on the toolbar badge), and get an **optional
reminder** when something's due. No account, no sync server, no tracking — everything stays on
your device.

![icon](icons/icon128.png)

## Features

- **Quick capture** — type a task and hit Enter. The toolbar badge always shows how many tasks
  are still left, across all your lists.
- **Lists** — group tasks into as many lists as you like (Work, Home, Shopping…). Switch with
  the dropdown, or view **All lists** at once. Rename or delete from the ⋯ menu.
- **Check it off** — one click to complete; completed tasks drop to the bottom, struck through.
  **Filter** by All / Active / Done, and **clear completed** when you're done.
- **Edit in place** — click any task to rename it; clearing the text deletes it. No popups.
- **Optional reminders** — give any task a time and Meowdo notifies you when it's due, even if
  the browser was closed at that moment. Pick from the dropdown (**In 30 minutes**, **1 hour**,
  **2 hours**, **This evening**, **Tomorrow**) or choose **Custom…** for an exact date/time — a
  live hint shows when it'll fire. When it's due you get **three cues**: a system notification
  (with **Mark done** / **Snooze 10 min**), a prominent **on-screen alert window**, and a
  built-in **chime** that sounds the same on Windows, Linux, and macOS.
- **Private by design** — no network calls, no analytics, no remote code. Tasks live in
  `chrome.storage.local` on this device only.

## How it works

| Piece | Role |
| --- | --- |
| `popup.html/.css/.js` | **The surface.** Add / edit / complete / delete tasks, switch lists, filter, and set reminders. Writes plain data to storage. |
| `store.js` | **Shared data model + storage.** One `chrome.storage.local` key; loaded by both the popup and the worker so they agree on the shape. |
| `background.js` | **Service worker.** Watches storage and produces the side effects: the toolbar **badge** (count of what's left) and reminder **alarms → notification + chime**. |
| `offscreen.html/.js` | **Audio-only document** that synthesizes the reminder chime with the Web Audio API (no file shipped). The worker can't play sound itself, so it spins this up. |
| `alert.html/.css/.js` | The **on-screen reminder alert** — a small focused popup window the worker opens when a reminder is due (Mark done / Snooze / Dismiss). |
| `icons/` | Procedurally generated cat-checklist icon (dependency-free Python). |

The popup never touches alarms or notifications directly — it just saves tasks. The service
worker reconciles a `chrome.alarms` entry for every task that has a pending reminder and, when
one comes due, plays a chime, opens the alert window, and fires a `chrome.notifications` toast.
Because alarms persist and wake the worker, a reminder that falls due while Chrome is closed is
delivered the next time it starts.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top-right) on.
3. Click **Load unpacked** and select this project folder.
4. Pin the **Meowdo** icon — the badge shows how many tasks are left.

## Usage

1. Click the toolbar icon.
2. Type a task and press **Enter** (it lands in the current list).
3. Click the **circle** to complete it, the **text** to edit it, or the **bell** to set a
   reminder (pick a preset or an exact time → **Save**).
4. Use the **list dropdown** to organize tasks into lists; **＋** adds a list, **⋯** renames or
   deletes one.
5. Filter with **All / Active / Done**, and **Clear completed** to tidy up.

## Notes & limitations

- **Reminders need notifications.** If you've blocked Chrome notifications at the OS level, the
  banner won't appear — the badge, in-popup chip, the **on-screen alert window**, and the
  built-in chime still work. The
  notification *sound* is the OS's job (Windows plays one automatically, macOS depends on the
  per-app "Play sound for notifications" setting, Linux is often silent), which is exactly why
  Meowdo plays its own chime too. On macOS, enable notifications under **System Settings →
  Notifications → Google Chrome**.
- **One device.** Tasks are stored in `chrome.storage.local`, so they don't sync across
  machines (this is deliberate — nothing leaves the device).
- Reminder times are in your computer's local timezone.

## Development

No build step, no framework — Meowdo is plain MV3 + vanilla JavaScript, loaded unpacked. See
**[GUIDELINES.md](GUIDELINES.md)** for code style and the manual test checklist, and
**[CLAUDE.md](CLAUDE.md)** for the architecture map and project invariants (chiefly: nothing
leaves the device).

Common tasks — each is also a Claude Code skill under `.claude/skills/`:

| Task | Command | Output |
| --- | --- | --- |
| Package the Web Store zip | `./build.sh` | `dist/meowdo-v<version>.zip` |
| Regenerate the icon (dependency-free) | `python3 icons/gen_icons.py` | `icons/icon*.png` |

To cut a release (the `cut-release` skill): bump `version` in `manifest.json`, write
`docs/releases/v<version>.md`, run `./build.sh`, tag `v<version>`, and `gh release create` with
the zip. Web Store submission copy lives in [docs/store-listing.md](docs/store-listing.md).

## Tech

Manifest V3 · `chrome.storage.local` · `chrome.alarms` · `chrome.notifications` ·
`chrome.offscreen` + Web Audio (chime) · `chrome.windows` (alert) · `chrome.action` badge ·
vanilla DOM. No dependencies.

## License

**Proprietary — © 2026 Artfred Dela Cruz. All rights reserved.** This source is published for
viewing and portfolio purposes only; no permission is granted to use, copy, modify, or
distribute it without prior written consent. See [LICENSE](LICENSE).

Privacy policy: [docs/PRIVACY.md](docs/PRIVACY.md) · Web Store listing copy:
[docs/store-listing.md](docs/store-listing.md).

## Author

Made by [artfred16](https://artfred16.github.io).
