# Implementation Plan: Todo List Dashboard

## Overview

Implement a single-page productivity dashboard using plain HTML, CSS, and Vanilla JavaScript — no build step, no external dependencies. All logic lives in a single IIFE in `js/app.js`; all styles in `css/style.css`; the entry point is `index.html`. State is persisted to `localStorage` under `tdl_`-prefixed keys. The implementation proceeds section by section, each building on the last, and ends with full wiring and error handling.

## Tasks

- [x] 1. Project scaffold — file structure, HTML skeleton, IIFE shell, CONSTANTS, STATE, STORAGE
  - [x] 1.1 Create `index.html` with semantic HTML skeleton
    - Add `<!DOCTYPE html>`, `<html data-theme="light">`, `<head>` (charset, viewport, title, link to `css/style.css`), `<body>` with five `<section>` placeholders: `#greeting-panel`, `#timer-panel`, `#task-panel`, `#links-panel`, and a `<button id="theme-toggle">`
    - Add `<script src="js/app.js" defer></script>` at the bottom of `<body>`
    - _Requirements: 10.1, 10.3, 10.4_

  - [x] 1.2 Create `css/style.css` with CSS custom-property skeleton
    - Add `:root, [data-theme="light"]` block with all `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--accent`, `--border`, `--error`, `--shadow` variables
    - Add `[data-theme="dark"]` block overriding the same variables with dark-mode values
    - Add a minimal CSS reset (`box-sizing`, `margin`, `padding`) and `body` base styles using the custom properties
    - _Requirements: 9.1, 9.2, 10.1_

  - [x] 1.3 Create `js/app.js` with IIFE shell, CONSTANTS, STATE, and STORAGE module
    - Wrap all code in `(function () { 'use strict'; ... })();`
    - Define `KEYS` object: `{ TASKS: 'tdl_tasks', SORT_ORDER: 'tdl_sort_order', LINKS: 'tdl_links', THEME: 'tdl_theme' }`
    - Define `LIMITS` object: `{ MAX_TASK_LENGTH: 500, MAX_LABEL_LENGTH: 100, MAX_URL_LENGTH: 2048, MAX_LINKS: 20, TIMER_SECONDS: 1500 }`
    - Define `state` object with `tasks: []`, `sortOrder: 'incomplete-first'`, `links: []`, `theme: 'light'`, and `timer: { remainingSeconds: 1500, intervalId: null, running: false }`
    - Implement `saveKey(key, value)`: calls `localStorage.setItem(key, JSON.stringify(value))` inside `try/catch`; returns `true` on success, `false` on failure
    - Implement `loadKey(key, fallback)`: calls `localStorage.getItem` then `JSON.parse` inside `try/catch`; returns `fallback` on missing key or parse error
    - _Requirements: 7.2, 7.3, 7.4, 10.1, 10.2, 10.3_

- [ ] 2. Greeting Panel — clock, date, greeting logic
  - [-] 2.1 Implement `getGreeting(hour)` pure function and `formatTime(h, m, s)` pure function
    - `getGreeting(hour)`: returns `'Good Morning'` for hours 5–11, `'Good Afternoon'` for 12–17, `'Good Evening'` for 18–20, `'Good Night'` for 0–4 and 21–23
    - `formatTime(h, m, s)`: returns a string `HH:MM:SS` with each component zero-padded to two digits using `String.prototype.padStart(2, '0')`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [~] 2.2 Write property test for `getGreeting` (Property 1)
    - **Property 1: Greeting correctness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [~] 2.3 Write property test for `formatTime` (Property 2)
    - **Property 2: Time string formatting**
    - **Validates: Requirements 1.2**

  - [-] 2.4 Implement `formatDate(date)` pure function and `tickClock()` + `renderGreeting()`
    - `formatDate(date)`: returns a string matching `<DayName>, <MonthName> <DD>, <YYYY>` using `toLocaleDateString` with `{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }` or manual arrays — must produce the exact format from requirement 1.1
    - `renderGreeting()`: updates `#greeting-text`, `#clock-display`, `#date-display` text content from current `Date`
    - `tickClock()`: reads `new Date()`, calls `renderGreeting()` with derived values
    - Start `setInterval(tickClock, 1000)` in the `INIT` section (wired in task 9)
    - _Requirements: 1.1, 1.2_

  - [~] 2.5 Write property test for `formatDate` (Property 3)
    - **Property 3: Date string formatting**
    - **Validates: Requirements 1.1**

- [ ] 3. Focus Timer — countdown logic and button state
  - [-] 3.1 Implement `renderTimer()`, `startTimer()`, `stopTimer()`, `resetTimer()`
    - `renderTimer()`: formats `state.timer.remainingSeconds` as `MM:SS`, sets `#timer-display` text; disables `#timer-start` when `running === true` or `remainingSeconds === 0`; disables `#timer-stop` when `running === false`
    - `startTimer()`: guards with `if (state.timer.running) return`; sets `running = true`; creates `setInterval` that decrements `remainingSeconds`, calls `renderTimer()`, and auto-stops (calls `stopTimer()`) when `remainingSeconds` reaches 0
    - `stopTimer()`: calls `clearInterval(state.timer.intervalId)`, sets `intervalId = null`, sets `running = false`, calls `renderTimer()`
    - `resetTimer()`: calls `stopTimer()`, sets `remainingSeconds = 1500`, calls `renderTimer()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [~] 3.2 Write property test for `resetTimer` (Property 4)
    - **Property 4: Timer reset invariant**
    - **Validates: Requirements 2.4**

- [ ] 4. Task Manager — CRUD, validation, rendering
  - [-] 4.1 Implement `generateId()`, task validation helpers, and `renderTaskList()`
    - `generateId()`: returns `crypto.randomUUID()` if available; falls back to `` `${Date.now()}-${Math.random().toString(36).slice(2)}` ``
    - `isValidTaskText(text)`: returns `true` if trimmed length is 1–500
    - `isDuplicateTask(text, excludeId)`: case-insensitive comparison of trimmed `text` against all tasks (optionally excluding `excludeId` for edit validation)
    - `renderTaskList()`: clears `#task-list`, iterates `sortTasks(state.tasks, state.sortOrder)`, creates `<li data-id>` with checkbox, `<span class="task-text">`, edit button, delete button; applies `text-decoration: line-through` class when `completed === true`
    - _Requirements: 3.1, 5.1, 5.3, 5.4, 5.5, 6.1_

  - [~] 4.2 Implement `addTask(text)` and wire the add-task form
    - `addTask(text)`: trims input; validates with `isValidTaskText` and `isDuplicateTask`; on failure sets `#task-error` text and returns; on success pushes `{ id: generateId(), text, completed: false }` to `state.tasks`, calls `saveKey(KEYS.TASKS, state.tasks)` with revert-on-failure logic, clears `#task-input`, clears `#task-error`, calls `renderTaskList()`
    - Attach `click` listener on `#task-add-btn` and `keydown` (Enter) listener on `#task-input` to call `addTask`
    - Clear `#task-error` on `input` event of `#task-input`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [~] 4.3 Write property test for valid task addition (Property 5)
    - **Property 5: Valid task addition**
    - **Validates: Requirements 3.2, 3.3**

  - [~] 4.4 Write property test for whitespace input rejection (Property 6)
    - **Property 6: Whitespace input rejection**
    - **Validates: Requirements 3.4, 4.4, 8.4**

  - [~] 4.5 Write property test for duplicate task rejection (Property 7)
    - **Property 7: Duplicate task rejection**
    - **Validates: Requirements 3.5, 4.5**

  - [~] 4.6 Implement inline edit flow — `startEditTask(id)`, `saveEditTask(id, newText)`, `cancelEditTask(id)`
    - `startEditTask(id)`: replaces the task `<span>` with `<input class="task-edit-input">` pre-filled with current text, and swaps Edit button for Save + Cancel buttons
    - `saveEditTask(id, newText)`: validates trimmed text (length and duplicate, excluding current id); on failure shows inline error; on success updates `state.tasks`, persists with revert-on-failure, calls `renderTaskList()`
    - `cancelEditTask(id)`: calls `renderTaskList()` to restore original view
    - Wire `click` delegation on `#task-list` for `.task-edit-btn`, `.task-save-btn`, `.task-cancel-btn`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [~] 4.7 Implement `toggleTask(id)` and `deleteTask(id)` with persistence
    - `toggleTask(id)`: flips `completed` on the matching task, persists with revert-on-failure, calls `renderTaskList()`
    - `deleteTask(id)`: removes task by id, persists with revert-on-failure, calls `renderTaskList()`
    - Wire `click` delegation on `#task-list` for `.task-complete-toggle` (checkbox change) and `.task-delete-btn`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [~] 4.8 Write property test for completion toggle round-trip (Property 8)
    - **Property 8: Completion toggle round-trip**
    - **Validates: Requirements 5.2, 5.3, 5.4**

  - [~] 4.9 Write property test for task deletion (Property 9)
    - **Property 9: Task deletion removes task**
    - **Validates: Requirements 5.6**

- [ ] 5. Sort functionality — `sortTasks()` pure function and sort control
  - [-] 5.1 Implement `sortTasks(tasks, order)` pure function and wire sort control
    - `sortTasks(tasks, order)`: returns a new sorted array (does not mutate `tasks`); implements all four comparators: `az`, `za`, `incomplete-first` (incomplete before complete, `az` within each group), `complete-first` (complete before incomplete, `az` within each group)
    - Attach `change` listener on `#task-sort-select`: updates `state.sortOrder`, calls `saveKey(KEYS.SORT_ORDER, state.sortOrder)` (no revert needed per requirement 6.8), calls `renderTaskList()`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [~] 5.2 Write property test for sort order invariant (Property 10)
    - **Property 10: Sort order invariant**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [~] 6. Checkpoint — core features complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Quick Links — add/delete links, URL validation, rendering
  - [-] 7.1 Implement `isValidUrl(url)`, `renderLinks()`, and `addLink(label, url)`
    - `isValidUrl(url)`: returns `true` if trimmed url starts with `http://` or `https://` (case-insensitive) and trimmed length is 1–2048
    - `renderLinks()`: clears `#links-list`, iterates `state.links`, creates `.link-item` divs each containing an `<a href target="_blank" rel="noopener noreferrer" class="link-btn">` and a `.link-delete-btn` button
    - `addLink(label, url)`: validates label (trimmed 1–100), url (`isValidUrl`), and cap (≤ 20); on failure sets `#link-error`; on success pushes `{ id: generateId(), label: label.trim(), url: url.trim() }`, persists with revert-on-failure, clears inputs and error, calls `renderLinks()`
    - Wire `click` on `#link-add-btn`; clear `#link-error` on `input` events of both link inputs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.8, 8.9, 8.10_

  - [~] 7.2 Write property test for URL protocol validation (Property 12)
    - **Property 12: URL protocol validation**
    - **Validates: Requirements 8.5**

  - [~] 7.3 Write property test for Quick Links capacity invariant (Property 13)
    - **Property 13: Quick Links capacity invariant**
    - **Validates: Requirements 8.10**

  - [~] 7.4 Implement `deleteLink(id)` and wire delete controls
    - `deleteLink(id)`: removes link by id, persists with revert-on-failure, calls `renderLinks()`
    - Wire `click` delegation on `#links-list` for `.link-delete-btn`
    - _Requirements: 8.6, 8.7, 8.8_

  - [~] 7.5 Write property test for whitespace link rejection (Property 6 — link branch)
    - **Property 6: Whitespace input rejection (Quick Links)**
    - **Validates: Requirements 8.4**

- [ ] 8. Theme Toggle — `applyTheme()`, toggle handler, persist/restore
  - [-] 8.1 Implement `applyTheme(theme)`, `toggleTheme()`, and theme persistence
    - `applyTheme(theme)`: sets `document.documentElement.setAttribute('data-theme', theme)`; updates `#theme-toggle` `aria-label` (`'Switch to dark mode'` when light, `'Switch to light mode'` when dark) and button icon (`🌙` / `☀️`)
    - `toggleTheme()`: flips `state.theme` between `'light'` and `'dark'`; calls `applyTheme`; calls `saveKey(KEYS.THEME, state.theme)`; if `saveKey` returns `false`, disables `#theme-toggle` (`button.disabled = true`) and updates `aria-label` to indicate persistence is unavailable
    - Wire `click` on `#theme-toggle` to call `toggleTheme()`
    - _Requirements: 9.1, 9.2, 9.3, 9.6_

  - [~] 8.2 Write property test for theme toggle correctness (Property 14)
    - **Property 14: Theme toggle correctness**
    - **Validates: Requirements 9.2**

- [ ] 9. CSS styling — layout grid, responsive breakpoints, task states, error styles
  - [ ] 9.1 Implement CSS Grid page layout and panel base styles
    - Define `.dashboard` (or `body`) as a CSS Grid container; place `#greeting-panel` full-width in row 1; place `#timer-panel` and `#links-panel` side-by-side in row 2; place `#task-panel` full-width in row 3; place `#theme-toggle` in a fixed or top-right position
    - Style each panel with `background: var(--bg-secondary)`, `border: 1px solid var(--border)`, `box-shadow: 0 2px 8px var(--shadow)`, padding, and border-radius
    - _Requirements: 12.4, 10.1_

  - [~] 9.2 Add responsive breakpoints and task/link component styles
    - Add `@media (max-width: 599px)` rule collapsing the grid to a single column
    - Add `@media (min-width: 1200px)` rule placing task manager and quick links in a two-column row
    - Style task list items: `text-decoration: line-through` on `.task-text.completed`; style edit input, save/cancel buttons
    - Style link items: `.link-btn` as a styled anchor button; `.link-delete-btn` as a small icon button
    - Style `#timer-display` with a large monospace font
    - _Requirements: 12.4, 5.3, 5.4_

  - [~] 9.3 Add error state styles and accessibility styles
    - Style `[role="alert"]` / `.error-message` elements using `color: var(--error)` and `font-size: smaller`
    - Add `:focus-visible` outlines using `var(--accent)` for all interactive elements
    - Add `.storage-error-banner` styles for the global storage failure banner
    - Ensure sufficient colour contrast between `--text-primary` and `--bg-primary` in both themes
    - _Requirements: 3.4, 3.5, 4.4, 4.5, 8.4, 8.5, 8.10_

- [ ] 10. INIT, error handling, and full wiring
  - [~] 10.1 Implement `INIT` — load persisted state, attach all listeners, start clock
    - Load `state.tasks` from `loadKey(KEYS.TASKS, [])`, validate it is an array (fall back to `[]` and show warning banner if not)
    - Load `state.sortOrder` from `loadKey(KEYS.SORT_ORDER, 'incomplete-first')`; validate it is one of the four known keys; fall back to `'incomplete-first'`
    - Load `state.links` from `loadKey(KEYS.LINKS, [])`, validate it is an array
    - Load `state.theme` from `loadKey(KEYS.THEME, 'light')`; validate it is `'light'` or `'dark'`; fall back to `'light'`
    - Call `applyTheme(state.theme)`, `renderGreeting()`, `renderTimer()`, `renderTaskList()`, `renderLinks()`
    - Set `#task-sort-select` value to `state.sortOrder`
    - Start `setInterval(tickClock, 1000)`
    - _Requirements: 6.7, 7.1, 7.3, 7.4, 8.9, 9.4, 9.5_

  - [~] 10.2 Implement global error handling and storage failure banners
    - Add `window.onerror` handler that logs to `console.error` and displays a generic error banner in the DOM (appended to `<body>`)
    - Implement `showStorageBanner(message)`: creates or updates a `<div class="storage-error-banner" role="alert" aria-live="assertive">` at the top of `<body>` with the given message
    - Ensure all `saveKey` failure paths call `showStorageBanner` with a descriptive message
    - Ensure malformed-data load paths call `showStorageBanner` with a descriptive warning
    - _Requirements: 7.4, 3.7, 4.7, 5.9, 8.8_

  - [~] 10.3 Write property test for serialisation round-trip (Property 11)
    - **Property 11: Serialisation round-trip**
    - **Validates: Requirements 7.2, 3.6, 4.6, 5.7, 5.8, 6.6, 6.7, 7.1, 8.8, 8.9, 9.3, 9.4**

- [~] 11. Final checkpoint — verify full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- The three output files are exactly `index.html`, `css/style.css`, and `js/app.js` — no others
- Timer state is never persisted; it always resets to 25:00 on page load
- All `saveKey` callers must snapshot state before mutation and revert on `false` return
- `sortTasks` must be a pure function — it must not mutate `state.tasks`
- `crypto.randomUUID()` is used for IDs with a timestamp+random fallback for older environments
- Property tests reference the fast-check library; they are optional sub-tasks and will not be auto-implemented
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.4", "3.1", "4.1", "5.1", "7.1", "8.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5", "3.2", "4.2", "4.6", "4.7", "7.4", "9.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5", "4.8", "4.9", "5.2", "7.2", "7.3", "7.5", "8.2", "9.3"] },
    { "id": 4, "tasks": ["10.1"] },
    { "id": 5, "tasks": ["10.2", "10.3"] }
  ]
}
```
