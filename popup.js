"use strict";

/* ============================================================
 * Meowdo — popup (the toolbar surface).
 * Organize tasks into lists, check off what's done, edit in place, and set optional
 * reminders. The popup only mutates the in-memory `state` and writes it to storage; the
 * service worker watches storage and handles the badge + reminder alarms/notifications.
 * Re-rendering is full and cheap — a handful of nodes — so every change just re-renders.
 * ========================================================== */

const $ = (s, r = document) => r.querySelector(s);

let state = null;
let editId = null;          // id of the todo whose text is being edited inline
let remindId = null;        // id of the todo whose reminder editor is open
let listMode = null;        // "add" | "rename" — the toolbar shows a name input
let menuOpen = false;       // the list ⋯ menu is open
let confirmDeleteList = false;
const selfWrites = new Set(); // serialized snapshots we wrote, so we can ignore their echoes

// Static SVGs (no user data — safe as innerHTML).
const SVG = {
  plus: '<svg viewBox="0 0 24 24" class="ico"><path d="M12 5v14M5 12h14"/></svg>',
  kebab: '<svg viewBox="0 0 24 24" class="ico"><path d="M12 5h.01M12 12h.01M12 19h.01" stroke-width="2.6"/></svg>',
  check: '<svg viewBox="0 0 24 24" class="ico"><path d="M5 13l4 4 10-10"/></svg>',
  bell: '<svg viewBox="0 0 24 24" class="ico"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9M9.5 19a2.5 2.5 0 0 0 5 0"/></svg>',
  trash: '<svg viewBox="0 0 24 24" class="ico"><path d="M4 7h16M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v6M14 11v6"/></svg>'
};

/* ---------- helpers ---------- */

function scopeTodos() {
  const lid = state.settings.activeListId;
  return state.todos.filter((t) => lid === "all" || t.listId === lid);
}

function visibleTodos() {
  const f = state.settings.filter;
  let ts = scopeTodos();
  if (f === "active") ts = ts.filter((t) => !t.done);
  else if (f === "done") ts = ts.filter((t) => t.done);
  // Active tasks first (newest on top), completed below (most recently done first).
  return ts.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.done) return (b.completedAt || 0) - (a.completedAt || 0);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function fmtRemind(ts) {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  const opts = sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  return d.toLocaleString([], opts);
}

// Local "YYYY-MM-DDTHH:MM" for an <input type="datetime-local"> value.
function toLocalInput(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function presetIn30m() { return Date.now() + 30 * 60 * 1000; }
function presetIn1h() { return Date.now() + 60 * 60 * 1000; }
function presetIn2h() { return Date.now() + 2 * 60 * 60 * 1000; }
function presetTonight() {
  const d = new Date(); d.setHours(18, 0, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}
function presetTomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
  return d.getTime();
}

// Mutate state, persist, re-render. The storage write echoes back via onChanged; we record
// what we wrote so the listener can ignore our own change.
async function commit(mut) {
  mut(state);
  selfWrites.add(JSON.stringify(normalize(state)));
  await saveState(state);
  render();
}

/* ---------- mutations ---------- */

function addTodo(text) {
  const lid = state.settings.activeListId === "all" ? state.lists[0].id : state.settings.activeListId;
  commit((s) => {
    s.todos.push({
      id: uid(), text, done: false, listId: lid,
      createdAt: Date.now(), completedAt: null, remindAt: null, notified: false
    });
  });
}

function toggleDone(id) {
  commit((s) => {
    const t = s.todos.find((x) => x.id === id);
    if (t) { t.done = !t.done; t.completedAt = t.done ? Date.now() : null; }
  });
}

function commitEdit(id, value) {
  const text = value.trim();
  editId = null;
  // Clearing the text deletes the task (a familiar to-do convention).
  commit((s) => {
    if (!text) { s.todos = s.todos.filter((t) => t.id !== id); return; }
    const t = s.todos.find((x) => x.id === id);
    if (t) t.text = text;
  });
}

function deleteTodo(id) {
  if (editId === id) editId = null;
  if (remindId === id) remindId = null;
  commit((s) => { s.todos = s.todos.filter((t) => t.id !== id); });
}

function setReminder(id, ts) {
  remindId = null;
  commit((s) => {
    const t = s.todos.find((x) => x.id === id);
    if (t) { t.remindAt = ts; t.notified = false; }
  });
}

function clearReminder(id) {
  remindId = null;
  commit((s) => {
    const t = s.todos.find((x) => x.id === id);
    if (t) { t.remindAt = null; t.notified = false; }
  });
}

function clearDone() {
  const lid = state.settings.activeListId;
  commit((s) => {
    s.todos = s.todos.filter((t) => !(t.done && (lid === "all" || t.listId === lid)));
  });
}

function setFilter(f) { commit((s) => { s.settings.filter = f; }); }

function selectList(id) {
  menuOpen = false; confirmDeleteList = false;
  commit((s) => { s.settings.activeListId = id; });
}

function saveListName(value) {
  const name = value.trim();
  const mode = listMode;
  listMode = null;
  if (!name) { render(); return; }
  if (mode === "add") {
    const id = uid();
    commit((s) => { s.lists.push({ id, name }); s.settings.activeListId = id; });
  } else if (mode === "rename") {
    const lid = state.settings.activeListId;
    commit((s) => { const l = s.lists.find((x) => x.id === lid); if (l) l.name = name; });
  }
}

function deleteCurrentList() {
  const lid = state.settings.activeListId;
  if (lid === "all" || state.lists.length <= 1) return;
  menuOpen = false; confirmDeleteList = false;
  commit((s) => {
    s.lists = s.lists.filter((l) => l.id !== lid);
    s.todos = s.todos.filter((t) => t.listId !== lid);
    s.settings.activeListId = s.lists[0].id;
  });
}

/* ---------- rendering ---------- */

function render() {
  renderSubtitle();
  renderToolbar();
  renderFilters();
  renderList();
  renderFooter();
}

function renderSubtitle() {
  const ts = scopeTodos();
  const left = ts.filter((t) => !t.done).length;
  let msg;
  if (!ts.length) msg = "Add your first task below";
  else if (!left) msg = "All done 🎉";
  else msg = `${left} task${left === 1 ? "" : "s"} left`;
  $("#subtitle").textContent = msg;
}

function renderToolbar() {
  const bar = $("#toolbar");
  bar.innerHTML = "";

  // Inline name input (adding or renaming a list).
  if (listMode) {
    const input = document.createElement("input");
    input.className = "list-name-input";
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = listMode === "add" ? "New list name…" : "Rename list…";
    if (listMode === "rename") {
      const l = state.lists.find((x) => x.id === state.settings.activeListId);
      input.value = l ? l.name : "";
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveListName(input.value);
      else if (e.key === "Escape") { listMode = null; render(); }
    });
    input.addEventListener("blur", () => { if (listMode) saveListName(input.value); });

    const ok = iconButton(SVG.check, "Save list", () => saveListName(input.value));
    bar.append(input, ok);
    requestAnimationFrame(() => { input.focus(); input.select(); });
    return;
  }

  // List dropdown.
  const select = document.createElement("select");
  select.className = "list-select";
  for (const l of state.lists) {
    const left = state.todos.filter((t) => t.listId === l.id && !t.done).length;
    select.append(option(l.id, left ? `${l.name} · ${left}` : l.name));
  }
  if (state.lists.length > 1) {
    const allLeft = activeCount(state);
    select.append(option("all", allLeft ? `All lists · ${allLeft}` : "All lists"));
  }
  select.value = state.settings.activeListId;
  select.addEventListener("change", () => selectList(select.value));

  const add = iconButton(SVG.plus, "New list", () => { listMode = "add"; menuOpen = false; render(); });
  const kebab = iconButton(SVG.kebab, "List options", () => { menuOpen = !menuOpen; confirmDeleteList = false; render(); });

  bar.append(select, add, kebab);

  if (menuOpen) bar.append(renderListMenu());
}

function renderListMenu() {
  const isAll = state.settings.activeListId === "all";
  const onlyList = state.lists.length <= 1;
  const menu = document.createElement("div");
  menu.className = "menu";

  const rename = document.createElement("button");
  rename.type = "button";
  rename.textContent = "Rename list";
  rename.disabled = isAll;
  rename.addEventListener("click", () => { listMode = "rename"; menuOpen = false; render(); });

  const del = document.createElement("button");
  del.type = "button";
  del.className = "danger";
  del.disabled = isAll || onlyList;
  const count = scopeTodos().length;
  del.textContent = confirmDeleteList
    ? (count ? `Delete list & ${count} task${count === 1 ? "" : "s"}?` : "Delete this list?")
    : "Delete list";
  del.addEventListener("click", () => {
    if (!confirmDeleteList) { confirmDeleteList = true; render(); }
    else deleteCurrentList();
  });

  menu.append(rename, del);
  return menu;
}

function renderFilters() {
  const box = $("#filters");
  box.innerHTML = "";
  const ts = scopeTodos();
  const counts = {
    all: ts.length,
    active: ts.filter((t) => !t.done).length,
    done: ts.filter((t) => t.done).length
  };
  for (const [key, label] of [["all", "All"], ["active", "Active"], ["done", "Done"]]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "filter" + (state.settings.filter === key ? " active" : "");
    b.innerHTML = `${label} <span class="n">${counts[key]}</span>`;
    b.addEventListener("click", () => setFilter(key));
    box.append(b);
  }
}

function renderList() {
  const ul = $("#todo-list");
  const empty = $("#empty");
  ul.innerHTML = "";

  const todos = visibleTodos();
  if (!todos.length) {
    ul.hidden = true;
    empty.hidden = false;
    const scoped = scopeTodos();
    if (!scoped.length) empty.textContent = "No tasks yet. Add one above ↑";
    else if (state.settings.filter === "active") empty.textContent = "Nothing left here — all done 🎉";
    else if (state.settings.filter === "done") empty.textContent = "No completed tasks yet.";
    else empty.textContent = "Nothing to show.";
    return;
  }
  ul.hidden = false;
  empty.hidden = true;
  for (const t of todos) ul.append(renderTodo(t));
}

function renderTodo(t) {
  const li = document.createElement("li");
  li.className = "todo" + (t.done ? " done" : "");
  li.dataset.id = t.id;

  const row = document.createElement("div");
  row.className = "todo-row";

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";
  check.setAttribute("aria-label", t.done ? "Mark not done" : "Mark done");
  check.innerHTML = t.done ? SVG.check : "";
  check.addEventListener("click", () => toggleDone(t.id));

  let textEl;
  if (editId === t.id) {
    textEl = document.createElement("input");
    textEl.className = "todo-edit";
    textEl.value = t.text;
    textEl.maxLength = 500;
    textEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commitEdit(t.id, textEl.value);
      else if (e.key === "Escape") { editId = null; render(); }
    });
    textEl.addEventListener("blur", () => { if (editId === t.id) commitEdit(t.id, textEl.value); });
    requestAnimationFrame(() => { textEl.focus(); textEl.select(); });
  } else {
    textEl = document.createElement("span");
    textEl.className = "todo-text";
    textEl.textContent = t.text;
    textEl.title = "Click to edit";
    textEl.addEventListener("click", () => { editId = t.id; remindId = null; render(); });
  }

  const actions = document.createElement("div");
  actions.className = "todo-actions";

  // Reminder: a chip when set (click to edit), otherwise a bell to add one.
  if (t.remindAt) {
    const chip = document.createElement("button");
    chip.type = "button";
    const overdue = !t.done && t.remindAt <= Date.now();
    chip.className = "remind-chip" + (overdue ? " overdue" : "");
    chip.innerHTML = SVG.bell + `<span>${fmtRemind(t.remindAt)}</span>`;
    chip.title = "Edit reminder";
    chip.addEventListener("click", () => { remindId = remindId === t.id ? null : t.id; editId = null; render(); });
    actions.append(chip);
  } else {
    const bell = document.createElement("button");
    bell.type = "button";
    bell.className = "row-btn remind";
    bell.innerHTML = SVG.bell;
    bell.title = "Set a reminder";
    bell.setAttribute("aria-label", "Set a reminder");
    bell.addEventListener("click", () => { remindId = remindId === t.id ? null : t.id; editId = null; render(); });
    actions.append(bell);
  }

  const del = document.createElement("button");
  del.type = "button";
  del.className = "row-btn delete";
  del.innerHTML = SVG.trash;
  del.title = "Delete task";
  del.setAttribute("aria-label", "Delete task");
  del.addEventListener("click", () => deleteTodo(t.id));
  actions.append(del);

  row.append(check, textEl, actions);
  li.append(row);

  if (remindId === t.id) li.append(renderRemindEditor(t));
  return li;
}

// Quick reminder choices, plus a "Custom…" option that reveals the exact date/time picker.
// Each preset's function is evaluated at Save time, so the offset is relative to *then*.
const REMIND_PRESETS = [
  ["30m", "In 30 minutes", presetIn30m],
  ["1h", "In 1 hour", presetIn1h],
  ["2h", "In 2 hours", presetIn2h],
  ["evening", "This evening (6 PM)", presetTonight],
  ["tomorrow", "Tomorrow (9 AM)", presetTomorrow],
  ["custom", "Custom…", null]
];

function renderRemindEditor(t) {
  const box = document.createElement("div");
  box.className = "remind-editor";

  const row = document.createElement("div");
  row.className = "remind-row";

  const select = document.createElement("select");
  select.className = "remind-select";
  select.setAttribute("aria-label", "When to remind");
  for (const [key, label] of REMIND_PRESETS) select.append(option(key, label));
  // Editing an existing future reminder defaults to Custom (showing its exact time); a fresh
  // reminder defaults to the first quick preset (30 minutes).
  const editingExisting = !!(t.remindAt && t.remindAt > Date.now());
  select.value = editingExisting ? "custom" : "30m";

  const when = document.createElement("span");
  when.className = "remind-when";

  const input = document.createElement("input");
  input.type = "datetime-local";
  input.className = "remind-input";
  input.required = true;                  // so an empty custom value is caught on Save
  input.min = toLocalInput(Date.now());   // and a past time is a range underflow
  input.value = toLocalInput(editingExisting ? t.remindAt : presetIn1h());

  const presetFn = (key) => (REMIND_PRESETS.find((p) => p[0] === key) || [])[2];

  // The timestamp the current selection resolves to (null if the custom field is empty/invalid).
  function resolvedTs() {
    if (select.value === "custom") {
      const ts = new Date(input.value).getTime();
      return isNaN(ts) ? null : ts;
    }
    const fn = presetFn(select.value);
    return fn ? fn() : null;
  }

  function sync() {
    const custom = select.value === "custom";
    input.hidden = !custom;
    const ts = resolvedTs();
    when.textContent = ts ? "→ " + fmtRemind(ts) : "";
  }

  select.addEventListener("change", () => {
    sync();
    if (select.value === "custom") requestAnimationFrame(() => input.focus());
  });
  input.addEventListener("input", sync);

  const actions = document.createElement("div");
  actions.className = "remind-actions";

  const save = document.createElement("button");
  save.type = "button";
  save.className = "btn primary";
  save.textContent = "Save";
  save.addEventListener("click", () => {
    // For a custom time, let the native datetime-local validation (required + min) surface an
    // empty or past value as a clear message, instead of Save silently doing nothing.
    if (select.value === "custom" && !input.reportValidity()) return;
    const ts = resolvedTs();
    if (ts !== null) setReminder(t.id, ts);
  });

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn ghost";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => { remindId = null; render(); });

  actions.append(save);
  if (t.remindAt) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "btn";
    clear.textContent = "Clear";
    clear.addEventListener("click", () => clearReminder(t.id));
    actions.append(clear);
  }
  const spacer = document.createElement("span");
  spacer.className = "spacer";
  actions.append(spacer, cancel);

  row.append(select, when);
  box.append(row, input, actions);
  sync();
  return box;
}

function renderFooter() {
  const lid = state.settings.activeListId;
  const doneCount = state.todos.filter((t) => t.done && (lid === "all" || t.listId === lid)).length;
  const btn = $("#clear-done");
  if (doneCount) {
    btn.hidden = false;
    btn.textContent = `Clear ${doneCount} completed`;
  } else {
    btn.hidden = true;
  }
}

/* ---------- small DOM helpers ---------- */

function iconButton(svg, label, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon-btn";
  b.innerHTML = svg;
  b.title = label;
  b.setAttribute("aria-label", label);
  b.addEventListener("click", onClick);
  return b;
}

function option(value, text) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = text;
  return o;
}

/* ---------- wiring ---------- */

$("#add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#add-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addTodo(text);
  input.focus();
});

$("#clear-done").addEventListener("click", clearDone);

// Close the list menu when clicking anywhere outside it.
document.addEventListener("click", (e) => {
  if (!menuOpen) return;
  if (e.target.closest(".menu") || e.target.closest(".icon-btn")) return;
  menuOpen = false; confirmDeleteList = false; render();
});

// Keep the popup live if a notification action (or another window) changes the data, but
// don't clobber an in-progress inline edit, and ignore the echo of our own writes.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORE_KEY]) return;
  const incoming = normalize(changes[STORE_KEY].newValue);
  const key = JSON.stringify(incoming);
  if (selfWrites.has(key)) { selfWrites.delete(key); return; } // echo of our own write
  state = incoming;
  if (!editId && !remindId && !listMode) render();
});

async function init() {
  state = await loadState();
  render();
  $("#add-input").focus();
}

init();
