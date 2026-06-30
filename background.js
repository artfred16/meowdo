"use strict";

/* ============================================================
 * Meowdo — service worker.
 * The popup only ever writes plain data to chrome.storage.local. This worker is the single
 * place that produces side effects from that data:
 *   - the toolbar badge shows how many tasks are still left, and
 *   - each task with a reminder gets a chrome.alarms entry that fires a notification.
 * It reconciles both from storage on every change (and on install/startup/wake), so the
 * popup never has to touch alarms or notifications directly.
 * ========================================================== */

importScripts("store.js");

const REMIND_PREFIX = "remind:"; // alarm name → "remind:<todoId>"
const NOTE_PREFIX = "todo:";     // notification id → "todo:<todoId>"
const SNOOZE_MS = 10 * 60 * 1000;

// Play the reminder chime via an offscreen document. The worker has no DOM/Web Audio, so it
// hosts a tiny audio-only page (offscreen.js) and messages it to play. This gives a consistent
// sound on every OS — independent of whether the platform's notification itself makes one.
let creatingOffscreen = null; // promise lock so concurrent alarms don't double-create the doc
async function chime() {
  try {
    if (!chrome.offscreen) return; // older Chrome without the offscreen API: skip the sound
    const has = await chrome.offscreen.hasDocument();
    if (!has) {
      if (!creatingOffscreen) {
        creatingOffscreen = chrome.offscreen.createDocument({
          url: "offscreen.html",
          reasons: ["AUDIO_PLAYBACK"],
          justification: "Play a short chime when a task reminder is due."
        });
      }
      await creatingOffscreen;
      creatingOffscreen = null;
    }
    await chrome.runtime.sendMessage({ target: "offscreen", cmd: "chime" });
  } catch (e) {
    // Sound is best-effort — never let it break the reminder/notification path.
  }
}

// Pop a small on-screen alert window for a due reminder. Unlike an OS notification (which can be
// a fleeting banner, or suppressed by OS settings), this is a real focused window the user has
// to act on. Returns true if a window opened.
async function openAlert(id) {
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL("alert.html?id=" + encodeURIComponent(id)),
      type: "popup",
      width: 400,
      height: 232,
      focused: true
    });
    return true;
  } catch (e) {
    return false; // some environments block window creation — the notification still fires
  }
}

async function reconcile() {
  const state = await loadState();
  await updateBadge(state);
  await syncAlarms(state);
}

async function updateBadge(state) {
  const left = activeCount(state);
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
    await chrome.action.setBadgeText({ text: left ? String(left) : "" });
  } catch {}
}

// Make the live set of alarms match the reminders we actually want pending: one per task
// that is not done, has a reminder, and hasn't fired yet. Stale alarms (task done/deleted,
// reminder cleared, or already notified) are removed.
async function syncAlarms(state) {
  const wanted = new Map();
  for (const t of state.todos) {
    if (!t.done && t.remindAt && !t.notified) wanted.set(REMIND_PREFIX + t.id, t.remindAt);
  }

  const existing = await chrome.alarms.getAll();
  for (const a of existing) {
    if (a.name.startsWith(REMIND_PREFIX) && !wanted.has(a.name)) await chrome.alarms.clear(a.name);
  }
  for (const [name, when] of wanted) {
    const have = existing.find((a) => a.name === name);
    // (Re)create when missing or the time drifted (a reminder was edited). A `when` already in
    // the past fires almost immediately — that's how reminders that came due while the browser
    // was closed still get delivered on the next startup.
    if (!have || Math.abs(have.scheduledTime - when) > 1000) {
      await chrome.alarms.create(name, { when });
    }
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(REMIND_PREFIX)) return;
  const id = alarm.name.slice(REMIND_PREFIX.length);
  const state = await loadState();
  const todo = state.todos.find((t) => t.id === id);
  if (!todo || todo.done || todo.notified) return;

  todo.notified = true;        // mark fired first so a worker restart can't double-notify
  await saveState(state);      // also triggers reconcile() via storage.onChanged

  chime();                     // best-effort sound, regardless of the OS notification
  openAlert(id);               // prominent on-screen alert window

  const list = state.lists.find((l) => l.id === todo.listId);
  try {
    await chrome.notifications.create(NOTE_PREFIX + id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title: todo.text,
      message: list ? "Reminder · " + list.name : "Reminder",
      priority: 2,
      requireInteraction: true,
      buttons: [{ title: "Mark done" }, { title: "Snooze 10 min" }]
    });
  } catch {}
});

chrome.notifications.onButtonClicked.addListener(async (nid, btn) => {
  if (!nid.startsWith(NOTE_PREFIX)) return;
  const id = nid.slice(NOTE_PREFIX.length);
  const state = await loadState();
  const t = state.todos.find((x) => x.id === id);
  if (t) {
    if (btn === 0) { t.done = true; t.completedAt = Date.now(); }
    else if (btn === 1) { t.remindAt = Date.now() + SNOOZE_MS; t.notified = false; } // reschedule via reconcile
    await saveState(state);
  }
  chrome.notifications.clear(nid);
});

chrome.notifications.onClicked.addListener((nid) => {
  if (nid.startsWith(NOTE_PREFIX)) chrome.notifications.clear(nid);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORE_KEY]) reconcile();
});

chrome.runtime.onInstalled.addListener(reconcile);
chrome.runtime.onStartup.addListener(reconcile);
reconcile(); // also runs whenever the worker spins back up
