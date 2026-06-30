"use strict";

/* ============================================================
 * Meowdo — reminder alert window.
 * Shown in a small focused popup window (chrome.windows.create, type "popup") when a reminder
 * comes due — a prominent on-screen alert that doesn't depend on OS notification settings.
 * Loads store.js for the shared model; mutating storage here re-syncs the badge/alarms via the
 * worker's storage listener (e.g. Snooze re-arms the alarm).
 * ========================================================== */

const SNOOZE_MS = 10 * 60 * 1000;
const id = new URLSearchParams(location.search).get("id");

function fmtWhen(ts) {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  const opts = sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return d.toLocaleString([], opts);
}

// Apply a mutation to this task, persist, and close the window.
async function update(mut) {
  const state = await loadState();
  const t = state.todos.find((x) => x.id === id);
  if (t && mut) { mut(t); await saveState(state); }
  window.close();
}

async function init() {
  const state = await loadState();
  const t = state.todos.find((x) => x.id === id);
  if (!t) { window.close(); return; }

  const list = state.lists.find((l) => l.id === t.listId);
  document.getElementById("task").textContent = t.text;
  const bits = [];
  if (list) bits.push(list.name);
  if (t.remindAt) bits.push(fmtWhen(t.remindAt));
  document.getElementById("meta").textContent = bits.join(" · ");
  document.title = "Reminder · " + t.text;

  document.getElementById("done").addEventListener("click", () =>
    update((x) => { x.done = true; x.completedAt = Date.now(); }));
  document.getElementById("snooze").addEventListener("click", () =>
    update((x) => { x.remindAt = Date.now() + SNOOZE_MS; x.notified = false; }));
  document.getElementById("dismiss").addEventListener("click", () => window.close());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.close(); });
  document.getElementById("done").focus();
}

init();
