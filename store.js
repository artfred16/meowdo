"use strict";

/* ============================================================
 * Meowdo — shared data model + storage.
 * Loaded by BOTH the popup (<script src>) and the service worker (importScripts), so it
 * must stay DOM-free and assume no `window`. Everything lives under a single
 * chrome.storage.local key; the popup writes data and the worker watches storage to keep
 * the toolbar badge and reminder alarms in sync. Nothing leaves the device.
 * ========================================================== */

const STORE_KEY = "tally";
const FILTERS = ["all", "active", "done"];

// A short, collision-resistant id (time prefix keeps ids roughly sortable by creation).
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Coerce whatever is in storage (or nothing, on first run) into a known-good shape, filling
// defaults and dropping anything malformed. Every read goes through this so the rest of the
// code never has to guard against partial/legacy data.
function normalize(raw) {
  const s = (raw && typeof raw === "object") ? raw : {};

  let lists = Array.isArray(s.lists)
    ? s.lists.filter((l) => l && typeof l.id === "string" && typeof l.name === "string")
    : [];
  if (!lists.length) lists = [{ id: "tasks", name: "Tasks" }];
  const listIds = new Set(lists.map((l) => l.id));

  const todos = (Array.isArray(s.todos) ? s.todos : [])
    .filter((t) => t && typeof t.id === "string" && typeof t.text === "string")
    .map((t) => ({
      id: t.id,
      text: t.text,
      done: !!t.done,
      listId: listIds.has(t.listId) ? t.listId : lists[0].id,
      createdAt: typeof t.createdAt === "number" ? t.createdAt : 0,
      completedAt: typeof t.completedAt === "number" ? t.completedAt : null,
      remindAt: typeof t.remindAt === "number" ? t.remindAt : null,
      notified: !!t.notified
    }));

  const set = (s.settings && typeof s.settings === "object") ? s.settings : {};
  // "all" is a valid scope (every list); otherwise it must point at a real list.
  const activeListId = (set.activeListId === "all" || listIds.has(set.activeListId))
    ? set.activeListId
    : lists[0].id;
  const filter = FILTERS.includes(set.filter) ? set.filter : "all";

  return { lists, todos, settings: { activeListId, filter } };
}

// Promise wrappers around the callback-style storage API (matches the project's async/await style).
function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORE_KEY, (res) => resolve(normalize(res[STORE_KEY])));
  });
}

function saveState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORE_KEY]: state }, resolve);
  });
}

// Tasks still to do (used for the toolbar badge and the "what's left" counts).
function activeCount(state) {
  return state.todos.filter((t) => !t.done).length;
}
