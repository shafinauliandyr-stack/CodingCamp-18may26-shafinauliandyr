# Design Document: Todo List Dashboard

## Overview

The Todo List Dashboard is a single-page, client-side productivity application built with pure HTML, CSS, and Vanilla JavaScript. It runs entirely in the browser with no build step, no backend, and no external dependencies. All state is persisted in `localStorage` using JSON serialisation.

The application is composed of five functional panels rendered inside a single HTML page:

1. **Greeting Panel** — live clock, date, and time-of-day greeting
2. **Focus Timer** — 25-minute Pomodoro-style countdown
3. **Task Manager** — add, edit, complete, delete, and sort tasks
4. **Quick Links** — labelled URL shortcuts that open in a new tab
5. **Theme Toggle** — light/dark mode switch persisted across sessions

The design prioritises simplicity: no module bundler, no transpiler, no framework. The JavaScript is written as a single IIFE (Immediately Invoked Function Expression) module to avoid polluting the global scope while remaining compatible with direct `file://` loading.

---

## Architecture

### High-Level Structure

```
index.html          ← single HTML entry point; links css/style.css and js/app.js
css/
  style.css         ← all styles; CSS custom properties drive theming
js/
  app.js            ← all application logic in one IIFE
```

### Execution Model

The application follows a simple **state → render** cycle:

```
User Event
    │
    ▼
Event Handler (in app.js)
    │
    ├─► Mutate in-memory state object
    │
    ├─► Persist state to localStorage (try/catch)
    │
    └─► Re-render affected DOM section
```

There is no virtual DOM or diffing. Each logical section has a dedicated `render*()` function that rebuilds its DOM subtree from the current state. Because the data sets are small (≤ 500 tasks, ≤ 20 links), full re-renders are fast and keep the code straightforward.

### Module Boundaries (within app.js)

The single JavaScript file is organised into clearly separated sections:

| Section | Responsibility |
|---|---|
| `CONSTANTS` | Key names, limits, defaults |
| `STATE` | Single mutable state object |
| `STORAGE` | `load()` / `save()` wrappers around `localStorage` |
| `GREETING` | Clock tick, date formatting, greeting logic |
| `TIMER` | Countdown logic, `setInterval` management |
| `TASKS` | CRUD operations, sort logic, validation |
| `LINKS` | Quick-link CRUD, URL validation |
| `THEME` | Toggle, apply, persist |
| `RENDER` | One `render*()` function per panel |
| `INIT` | Bootstrap: load state, attach listeners, start clock |

---

## Components and Interfaces

### 1. Greeting Panel

**DOM structure:**
```html
<section id="greeting-panel">
  <p id="greeting-text">Good Morning</p>
  <p id="clock-display">14:32:07</p>
  <p id="date-display">Monday, July 14, 2025</p>
</section>
```

**Behaviour:**
- A `setInterval` fires every 1 000 ms and calls `tickClock()`.
- `tickClock()` reads `new Date()`, formats the time string, formats the date string, derives the greeting, and updates the three DOM text nodes.
- Greeting derivation is a pure function of the current hour (0–23).

**Greeting mapping:**

| Hour range | Greeting |
|---|---|
| 05–11 | Good Morning |
| 12–17 | Good Afternoon |
| 18–20 | Good Evening |
| 21–23, 00–04 | Good Night |

### 2. Focus Timer

**DOM structure:**
```html
<section id="timer-panel">
  <p id="timer-display">25:00</p>
  <div id="timer-controls">
    <button id="timer-start">Start</button>
    <button id="timer-stop">Stop</button>
    <button id="timer-reset">Reset</button>
  </div>
</section>
```

**State fields:**
```js
timer: {
  remainingSeconds: 1500,   // 25 * 60
  intervalId: null,         // setInterval handle or null
  running: false
}
```

**Behaviour:**
- `startTimer()` — guards against double-start; sets `running = true`; creates `setInterval` that decrements `remainingSeconds` each second; calls `renderTimer()` after each tick; auto-stops at 0.
- `stopTimer()` — clears interval, sets `running = false`, calls `renderTimer()`.
- `resetTimer()` — calls `stopTimer()`, resets `remainingSeconds` to 1 500, re-enables Start button, calls `renderTimer()`.
- `renderTimer()` — formats `remainingSeconds` as `MM:SS`, updates `#timer-display`; disables Start when `running === true` or `remainingSeconds === 0`; disables Stop when `running === false`.

### 3. Task Manager

**DOM structure:**
```html
<section id="task-panel">
  <div id="task-add-form">
    <input id="task-input" type="text" maxlength="500" />
    <button id="task-add-btn">Add</button>
    <p id="task-error" role="alert" aria-live="polite"></p>
  </div>
  <div id="task-sort-controls">
    <select id="task-sort-select">
      <option value="incomplete-first">Incomplete First</option>
      <option value="az">Alphabetical (A–Z)</option>
      <option value="za">Alphabetical (Z–A)</option>
      <option value="complete-first">Complete First</option>
    </select>
  </div>
  <ul id="task-list"></ul>
</section>
```

Each task item rendered into `#task-list`:
```html
<li data-id="<uuid>">
  <input type="checkbox" class="task-complete-toggle" />
  <span class="task-text">Buy groceries</span>
  <button class="task-edit-btn">Edit</button>
  <button class="task-delete-btn">Delete</button>
</li>
```

During inline edit, the `<span>` is replaced with:
```html
<input type="text" class="task-edit-input" value="Buy groceries" maxlength="500" />
<button class="task-save-btn">Save</button>
<button class="task-cancel-btn">Cancel</button>
```

**State fields:**
```js
tasks: [
  { id: "<uuid>", text: "Buy groceries", completed: false }
]
sortOrder: "incomplete-first"   // persisted key
```

**Task ID generation:** `crypto.randomUUID()` (available in all target browsers). Falls back to a timestamp + random string if unavailable.

**Validation rules:**
- Trimmed length must be 1–500 characters.
- Case-insensitive duplicate check against all existing task texts (trimmed).

**Sort logic** (pure function, does not mutate state array):

| Sort key | Comparator |
|---|---|
| `az` | `a.text.localeCompare(b.text, undefined, { sensitivity: 'base' })` |
| `za` | Reverse of `az` |
| `incomplete-first` | Incomplete before complete; `az` within each group |
| `complete-first` | Complete before incomplete; `az` within each group |

### 4. Quick Links

**DOM structure:**
```html
<section id="links-panel">
  <div id="links-add-form">
    <input id="link-label-input" type="text" maxlength="100" placeholder="Label" />
    <input id="link-url-input" type="url" maxlength="2048" placeholder="https://..." />
    <button id="link-add-btn">Add Link</button>
    <p id="link-error" role="alert" aria-live="polite"></p>
  </div>
  <div id="links-list"></div>
</section>
```

Each link rendered into `#links-list`:
```html
<div class="link-item" data-id="<uuid>">
  <a href="<url>" target="_blank" rel="noopener noreferrer" class="link-btn"><label></a>
  <button class="link-delete-btn">Delete</button>
</div>
```

**State fields:**
```js
links: [
  { id: "<uuid>", label: "GitHub", url: "https://github.com" }
]
```

**Validation rules:**
- Label: trimmed length 1–100 characters.
- URL: trimmed length 1–2 048 characters; must start with `http://` or `https://` (case-insensitive prefix check).
- Collection cap: maximum 20 links.

### 5. Theme Toggle

**DOM structure:**
```html
<button id="theme-toggle" aria-label="Switch to dark mode">🌙</button>
```

**State fields:**
```js
theme: "light"   // "light" | "dark"
```

**Behaviour:**
- `applyTheme(theme)` — sets `data-theme="light"` or `data-theme="dark"` on `<html>`. CSS custom properties keyed on `[data-theme]` drive all colour changes.
- Toggle switches between `"light"` and `"dark"`, persists to `localStorage`, updates `aria-label` and button icon.
- If `localStorage` throws on write, the toggle is disabled for the session (requirement 9.6).

---

## Data Models

### localStorage Keys

| Key | Type | Description |
|---|---|---|
| `tdl_tasks` | JSON string | Serialised `Task[]` array |
| `tdl_sort_order` | JSON string | Active sort order key string |
| `tdl_links` | JSON string | Serialised `Link[]` array |
| `tdl_theme` | JSON string | `"light"` or `"dark"` |

All keys are prefixed with `tdl_` to avoid collisions with other apps sharing the same origin.

### Task Object

```ts
interface Task {
  id: string;          // UUID v4
  text: string;        // 1–500 chars (trimmed)
  completed: boolean;
}
```

### Link Object

```ts
interface Link {
  id: string;          // UUID v4
  label: string;       // 1–100 chars (trimmed)
  url: string;         // 1–2048 chars, http(s) prefix
}
```

### In-Memory State Object

```js
const state = {
  tasks: [],           // Task[]
  sortOrder: "incomplete-first",
  links: [],           // Link[]
  theme: "light",
  timer: {
    remainingSeconds: 1500,
    intervalId: null,
    running: false
  }
};
```

The timer state is intentionally **not** persisted — the timer resets to 25:00 on every page load, which is the expected Pomodoro behaviour.

### JSON Serialisation / Deserialisation

The `STORAGE` module exposes:

```js
function saveKey(key, value) {
  // JSON.stringify(value), then localStorage.setItem
  // throws are caught; caller receives false on failure
}

function loadKey(key, fallback) {
  // localStorage.getItem, then JSON.parse
  // returns fallback on missing key or parse error
}
```

All callers check the return value and display an error banner when `saveKey` returns `false`.

### CSS Custom Properties (Theming)

```css
:root, [data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --accent: #4a90e2;
  --border: #dddddd;
  --error: #d32f2f;
  --shadow: rgba(0,0,0,0.08);
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --bg-secondary: #2d2d2d;
  --text-primary: #f0f0f0;
  --text-secondary: #aaaaaa;
  --accent: #64b5f6;
  --border: #444444;
  --error: #ef5350;
  --shadow: rgba(0,0,0,0.4);
}
```

Theme switching is instantaneous (a single attribute change on `<html>`) — well within the 100 ms requirement.

### Responsive Layout

The layout uses CSS Grid at the page level:

```
┌─────────────────────────────────────────┐
│           Greeting Panel (full width)   │
├──────────────────┬──────────────────────┤
│   Focus Timer    │    Quick Links       │
├──────────────────┴──────────────────────┤
│           Task Manager (full width)     │
└─────────────────────────────────────────┘
```

At narrow viewports (< 600 px) the grid collapses to a single column. At wide viewports (> 1 200 px) the task manager and quick links share a two-column row. All breakpoints use `min-width` media queries.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Greeting correctness

*For any* integer hour in the range 0–23, `getGreeting(hour)` SHALL return exactly one of the four greeting strings, and the returned string SHALL match the correct time-of-day range: hours 5–11 → "Good Morning", hours 12–17 → "Good Afternoon", hours 18–20 → "Good Evening", hours 0–4 and 21–23 → "Good Night".

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Time string formatting

*For any* triple (hour ∈ 0–23, minute ∈ 0–59, second ∈ 0–59), the time-formatting function SHALL produce a string of exactly the form `HH:MM:SS` where each component is zero-padded to two digits.

**Validates: Requirements 1.2**

---

### Property 3: Date string formatting

*For any* valid `Date` object, the date-formatting function SHALL produce a string that matches the pattern `<DayName>, <MonthName> <DD>, <YYYY>` where `<DayName>` is the full English day name, `<MonthName>` is the full English month name, `<DD>` is the numeric day of the month (1–31), and `<YYYY>` is the four-digit year.

**Validates: Requirements 1.1**

---

### Property 4: Timer reset invariant

*For any* timer state (any value of `remainingSeconds` between 0 and 1 500, and any value of `running`), calling `resetTimer()` SHALL always produce a state where `remainingSeconds === 1500` and `running === false`.

**Validates: Requirements 2.4**

---

### Property 5: Valid task addition

*For any* task list and *for any* non-empty, non-duplicate string of trimmed length 1–500 characters, adding that string as a new task SHALL increase the task list length by exactly one, and the newly added task SHALL have `completed === false` and `text` equal to the trimmed input string.

**Validates: Requirements 3.2, 3.3**

---

### Property 6: Whitespace input rejection

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to add it as a task text or as a Quick Link label or URL SHALL leave the respective collection unchanged and SHALL produce a visible error indication.

**Validates: Requirements 3.4, 4.4, 8.4**

---

### Property 7: Duplicate task rejection

*For any* task list containing at least one task, and *for any* string that is equal to an existing task's text after trimming whitespace and lowercasing, attempting to add or edit-to that string SHALL be rejected, the task list SHALL remain unchanged, and a visible error message SHALL be produced.

**Validates: Requirements 3.5, 4.5**

---

### Property 8: Completion toggle round-trip

*For any* task with any initial `completed` value, toggling the completion status twice SHALL restore the task to its original `completed` value, and the rendered task element SHALL reflect the correct strikethrough state after each toggle.

**Validates: Requirements 5.2, 5.3, 5.4**

---

### Property 9: Task deletion removes task

*For any* task list containing at least one task, and *for any* task `T` in that list, deleting `T` SHALL result in a task list that does not contain any task with the same `id` as `T`, and the list length SHALL decrease by exactly one.

**Validates: Requirements 5.6**

---

### Property 10: Sort order invariant

*For any* non-empty task list and *for any* sort key in `{az, za, incomplete-first, complete-first}`, the sorted result SHALL satisfy the following invariants:
- `az`: for every adjacent pair `(a, b)`, `a.text.toLowerCase() <= b.text.toLowerCase()`
- `za`: for every adjacent pair `(a, b)`, `a.text.toLowerCase() >= b.text.toLowerCase()`
- `incomplete-first`: all tasks with `completed === false` appear before all tasks with `completed === true`; within each group the `az` invariant holds
- `complete-first`: all tasks with `completed === true` appear before all tasks with `completed === false`; within each group the `az` invariant holds

**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

---

### Property 11: Serialisation round-trip

*For any* valid application state value (task list, link list, sort order string, or theme string), serialising the value with `JSON.stringify` and then deserialising with `JSON.parse` SHALL produce a value that is deeply equal to the original.

**Validates: Requirements 7.2, 3.6, 4.6, 5.7, 5.8, 6.6, 6.7, 7.1, 8.8, 8.9, 9.3, 9.4**

---

### Property 12: URL protocol validation

*For any* string that does not begin with `http://` or `https://` (case-insensitive), attempting to add it as a Quick Link URL SHALL be rejected, the Quick Links collection SHALL remain unchanged, and a visible error message SHALL be produced.

**Validates: Requirements 8.5**

---

### Property 13: Quick Links capacity invariant

*For any* Quick Links collection that already contains exactly 20 links, attempting to add one more link SHALL be rejected, the collection size SHALL remain 20, and a visible error message SHALL be produced.

**Validates: Requirements 8.10**

---

### Property 14: Theme toggle correctness

*For any* current theme value in `{"light", "dark"}`, activating the theme toggle SHALL switch the active theme to the other value (`"light"` → `"dark"`, `"dark"` → `"light"`), and the `data-theme` attribute on `<html>` SHALL reflect the new value.

**Validates: Requirements 9.2**

---

## Error Handling

### Strategy

All error handling follows a consistent pattern:

1. **Try the operation** in a `try/catch` block.
2. **On failure**, revert in-memory state to its pre-operation snapshot.
3. **Display an error banner** or inline error message to the user.
4. **Log** the error to `console.error` for debugging.

### localStorage Failures

`localStorage` can throw in two scenarios: storage quota exceeded, or the browser is in a private/incognito mode with storage disabled. The `saveKey()` wrapper catches all exceptions and returns `false`. Callers check this return value:

```js
const saved = saveKey(KEYS.TASKS, state.tasks);
if (!saved) {
  state.tasks = snapshot;   // revert
  showError('Could not save tasks. Changes may not persist.');
}
```

### Malformed Data on Load

`loadKey()` wraps `JSON.parse` in a `try/catch`. If parsing fails, it returns the provided `fallback` value (typically `null` or `[]`). The caller then initialises from the fallback and shows a non-blocking warning banner.

### Theme Toggle Disable

If `saveKey(KEYS.THEME, ...)` returns `false`, the theme toggle button is disabled (`button.disabled = true`) and its `aria-label` is updated to indicate persistence is unavailable. The current theme remains active for the session.

### Input Validation Errors

Validation errors (empty input, duplicate task, invalid URL, capacity exceeded) are displayed as inline `<p role="alert" aria-live="polite">` elements adjacent to the relevant form. They are cleared when the user modifies the input or successfully submits.

### Timer Edge Cases

- Double-clicking Start is guarded by checking `state.timer.running` before creating a new interval.
- The auto-stop at 00:00 calls `clearInterval` before setting `running = false` to prevent any off-by-one tick.

### Unhandled Errors

A global `window.onerror` handler logs unexpected errors to `console.error` and displays a generic error banner, ensuring requirement 7.4 (no unhandled errors) is met.

---

## Testing Strategy

### Overview

The application uses a **dual testing approach**:

- **Unit / example-based tests** for specific behaviours, edge cases, and error conditions
- **Property-based tests** for universal correctness properties (Properties 1–14 above)

No test files are generated as part of this spec. The testing strategy below describes how tests should be structured when implemented.

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (JavaScript/TypeScript PBT library)

Each of the 14 correctness properties maps to exactly one property-based test. Tests are configured to run a minimum of **100 iterations** each.

**Tag format**: Each test is tagged with a comment:
```
// Feature: todo-list-dashboard, Property <N>: <property_text>
```

**Example property test structure (Property 1 — Greeting correctness):**
```js
// Feature: todo-list-dashboard, Property 1: Greeting correctness
fc.assert(
  fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
    const greeting = getGreeting(hour);
    if (hour >= 5 && hour <= 11) return greeting === 'Good Morning';
    if (hour >= 12 && hour <= 17) return greeting === 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return greeting === 'Good Evening';
    return greeting === 'Good Night';
  }),
  { numRuns: 100 }
);
```

**Example property test structure (Property 10 — Sort order invariant):**
```js
// Feature: todo-list-dashboard, Property 10: Sort order invariant
const taskArb = fc.record({
  id: fc.uuid(),
  text: fc.string({ minLength: 1, maxLength: 500 }),
  completed: fc.boolean()
});
fc.assert(
  fc.property(fc.array(taskArb, { minLength: 1 }), (tasks) => {
    const sorted = sortTasks(tasks, 'az');
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].text.toLowerCase() > sorted[i+1].text.toLowerCase()) return false;
    }
    return true;
  }),
  { numRuns: 100 }
);
```

### Unit / Example-Based Tests

Unit tests cover:

| Area | Test cases |
|---|---|
| Timer | Initialises to 25:00; Start begins countdown; Stop pauses; auto-stop at 00:00 |
| Task validation | Accepts 1-char and 500-char inputs; rejects 0-char and 501-char inputs |
| Duplicate detection | Case-insensitive match; leading/trailing whitespace ignored |
| localStorage error recovery | Revert on save failure; empty list on malformed data |
| Quick Links | URL with `http://` accepted; `ftp://` rejected; `https://` accepted |
| Theme | Default is `"light"` when no persisted value; unrecognised value falls back to `"light"` |
| Timer edge cases | Double-start guard; Reset from running state; Reset from 00:00 state |

### Integration / Smoke Tests

Manual verification checklist:

- [ ] Open `index.html` directly in Chrome, Firefox, Edge, Safari — no console errors
- [ ] All features functional in each browser
- [ ] Responsive layout at 320 px, 768 px, 1 280 px, 2 560 px
- [ ] localStorage data persists across page reloads
- [ ] No external network requests in DevTools Network tab
- [ ] Theme persists across reloads
- [ ] Sort order persists across reloads

### Test File Organisation (when implemented)

```
tests/
  unit/
    greeting.test.js
    timer.test.js
    tasks.test.js
    links.test.js
    theme.test.js
    storage.test.js
  property/
    greeting.property.test.js
    timer.property.test.js
    tasks.property.test.js
    links.property.test.js
    theme.property.test.js
    storage.property.test.js
```
