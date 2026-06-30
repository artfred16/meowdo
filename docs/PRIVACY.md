# Meowdo — Privacy Policy

_Last updated: 2026-07-01_

**Meowdo keeps everything on your device. It does not collect, store, transmit, sell, or share
any personal data, browsing activity, task content, or analytics.** There are no servers, no
tracking, and no third parties.

## What Meowdo does with your data

- **Your tasks and lists** (the text you type, whether each is done, and any reminder time) are
  saved locally via the browser's `chrome.storage.local`. They **never leave your device** and
  are not synced to any account or server.
- **Reminders** are scheduled locally with `chrome.alarms`. When one is due, Meowdo shows a
  system notification, opens a small on‑screen alert window, and plays a short chime — all
  generated on your device. No reminder data is sent anywhere.
- **The chime** is synthesized on your device with the Web Audio API in a short‑lived offscreen
  document. No audio file is downloaded and nothing is transmitted.
- **The toolbar badge** simply shows how many tasks are left, computed locally.

## Permissions

Meowdo requests only the permissions needed to store your tasks and remind you about them:

- `storage` — save your tasks, lists, and settings locally on this device.
- `alarms` — schedule a reminder so it can fire at the time you chose, even if the browser was
  closed when it came due.
- `notifications` — show the reminder notification when a task is due.
- `offscreen` — play the reminder chime (audio only). It makes no network calls and loads no
  remote code.

None of these permissions are used to collect or transmit data off your device. Meowdo requests
**no host permissions** and runs no content scripts on the pages you visit.

## Remote code

Meowdo uses **no remote code** and **no third‑party libraries** — there is no CDN, no analytics
SDK, and no bundled framework. All code is the extension's own, loaded locally.

## Changes to this policy

If this policy changes, the "Last updated" date above will change. Material changes will be
reflected in the extension's Chrome Web Store listing.

## Contact

Questions? Contact **artfred16** — https://artfred16.github.io
