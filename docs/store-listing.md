# Meowdo — Chrome Web Store listing copy (paste-ready)

Everything you need to *type* into the Developer Dashboard, field by field. Fields are grouped
by the dashboard tab they live under.

> **Privacy policy is published** (canonical source: `docs/PRIVACY.md`):
> **https://gist.github.com/artfred16/7ac21501c89f00c14761b3ab7dc42de3**
> If you edit `docs/PRIVACY.md`, update the gist: `gh gist edit 7ac21501c89f00c14761b3ab7dc42de3 docs/PRIVACY.md`

---

## Before you submit (one-time account setup)

- [ ] A **Chrome Web Store developer account** (one-time **US$5** registration fee).
- [ ] **2-Step Verification** enabled on the Google account.
- [ ] A **verified contact email** in the dashboard (required before any item can be published).

---

## Store listing tab

**Product name**
```
Meowdo
```

**Summary** (single line, max 132 characters)
```
A fast, private to-do list in your toolbar — organize tasks into lists, see what's left, and get optional reminders.
```

**Category**
```
Productivity
```

**Language**
```
English (United States)
```

**Description** (paste as-is)
```
Meowdo is a fast, private to-do list that lives in your browser toolbar. Capture a task in one keystroke, organize tasks into lists, see at a glance how many are left (right on the toolbar badge), and get an optional reminder when something's due. Everything stays on your device — no account, no servers, no tracking.

ORGANIZE
• Type a task and hit Enter — it lands in the current list
• Group tasks into as many lists as you like (Work, Home, Shopping…)
• Switch lists from the dropdown, or view All lists at once
• Rename or delete lists from the ⋯ menu

SEE WHAT'S LEFT
• The toolbar badge always shows how many tasks are still to do
• Filter by All / Active / Done; completed tasks drop to the bottom
• Click a task to edit it in place; clear it to delete — no popups

REMINDERS (optional)
• Give any task a time: In 30 minutes, 1 hour, 2 hours, This evening, Tomorrow — or a custom date/time
• When it's due you get a system notification, a prominent on-screen alert window, and a chime
• Mark done or Snooze 10 minutes right from the alert
• Reminders fire even if the browser was closed when they came due

PRIVATE BY DESIGN
• No accounts, no servers, no analytics, no remote code
• Tasks live only in your browser's local storage, on this device
• Minimal permissions — nothing ever leaves your device
```

**Screenshots** (upload 1–5 at 1280×800 or 640×400):
1. The popup with a few tasks across lists (badge showing the count).
2. The reminder dropdown open (presets + Custom…), with the "→ time" hint.
3. The on-screen reminder alert window (Mark done / Snooze).
4. Filters (All / Active / Done) with some completed tasks struck through.

**Small promo tile** (440×280, optional) and **Marquee** (1400×560, optional): the icon + the summary line.

---

## Privacy practices tab

**Single purpose** (paste)
```
Meowdo is a to-do list: it lets the user create tasks, organize them into lists, and set optional reminders that fire a notification, an on-screen alert, and a chime when a task is due — entirely on the user's device.
```

**Permission justifications** (one box each — paste the matching line)

- `storage`
```
Save the user's tasks, lists, and settings locally on the device (chrome.storage.local). No data is sent anywhere.
```
- `alarms`
```
Schedule a reminder so it fires at the time the user chose, including when the browser was closed at that moment.
```
- `notifications`
```
Show the reminder notification (with Mark done / Snooze actions) when a task the user set a reminder on comes due.
```
- `offscreen`
```
Play a short reminder chime via the Web Audio API in an offscreen document. Audio only — no network access and no remote code.
```
- **Host permissions:** none requested. If the form asks, answer: *"No host permissions are requested; Meowdo runs no content scripts and does not access page content."*

**Are you using remote code?**
```
No
```
Explanation if prompted:
```
No remote code is used. There are no third-party libraries, no CDN, and no remote resources. All code is the extension's own and is loaded locally. The reminder chime is synthesized on-device with the Web Audio API; no audio file is downloaded.
```

**Data usage** — what data does this item collect?
```
None. Meowdo does not collect or transmit any user data.
```
Leave every data-type checkbox UNCHECKED (no personally identifiable info, health, financial,
authentication, personal communications, location, web history, user activity, or website
content is collected/transmitted — tasks are stored locally and never leave the device).

Then check all three certifications:
- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**
```
https://gist.github.com/artfred16/7ac21501c89f00c14761b3ab7dc42de3
```

---

## Distribution tab

**Visibility**
```
Public
```
(Use **Unlisted** if you want to share by link only during a soft launch, then switch to Public.)

**Pricing**
```
Free
```

**Geographic distribution**
```
All regions
```

**This item contains ads?**
```
No
```

---

## Account / contact

- **Support / developer email:** the verified email on your developer account
  (e.g. artfred.simplyearth@gmail.com).
- **Support website (optional):** https://artfred16.github.io

---

## Quick reference — fields & limits

| Field | Limit | Status |
| --- | --- | --- |
| Product name | 75 chars | "Meowdo" |
| Summary | 132 chars | ✓ (see above) |
| Description | 16,000 chars | ✓ |
| Screenshots | 1280×800 or 640×400, ≥1 (3–5 recommended) | to add |
| Icon | 128×128 | `icons/icon128.png` |
| Single purpose | required | ✓ |
| Permission justifications | one per permission | ✓ (4) |
| Privacy policy URL | required | ✓ published (gist) |
| Visibility / Pricing / Regions | required | Public / Free / All |
| Package (.zip) | ≤ allowed size | `dist/meowdo-v1.0.1.zip` |
