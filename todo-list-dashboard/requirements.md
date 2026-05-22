# Requirements Document

## Introduction

The To-Do List Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It provides a personal productivity dashboard featuring a contextual greeting with live date/time, a Pomodoro-style focus timer, a task management list, a quick-links panel, and a light/dark mode toggle. All user data is persisted exclusively in the browser's Local Storage — no backend server is required. The application must run as a standalone web page or browser extension in all modern browsers.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Task**: A user-defined to-do item consisting of a text description and a completion status.
- **Task_List**: The collection of all Tasks stored and displayed by the Dashboard.
- **Focus_Timer**: The 25-minute countdown timer component of the Dashboard.
- **Quick_Links**: The collection of user-defined URL shortcuts displayed as clickable buttons.
- **Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Theme**: The active visual mode of the Dashboard, either Light or Dark.
- **Greeting_Panel**: The Dashboard component that displays the current time, date, and a time-of-day greeting message.
- **Duplicate_Task**: A Task whose text, after trimming leading and trailing whitespace and ignoring letter case, is identical to an existing Task in the Task_List.

---

## Requirements

### Requirement 1: Greeting Panel

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the Dashboard, so that I have immediate context about the time of day.

#### Acceptance Criteria

1. THE Greeting_Panel SHALL display the current date in the format "Day, Month DD, YYYY" (e.g., "Monday, July 14, 2025").
2. THE Greeting_Panel SHALL display the current time in HH:MM:SS 24-hour format, updated every second.
3. WHEN the current local hour is between 05:00 and 11:59 inclusive, THE Greeting_Panel SHALL display the greeting "Good Morning".
4. WHEN the current local hour is between 12:00 and 17:59 inclusive, THE Greeting_Panel SHALL display the greeting "Good Afternoon".
5. WHEN the current local hour is between 18:00 and 20:59 inclusive, THE Greeting_Panel SHALL display the greeting "Good Evening".
6. WHEN the current local hour is between 21:00 and 23:59 inclusive OR between 00:00 and 04:59 inclusive, THE Greeting_Panel SHALL display the greeting "Good Night".

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can time focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown value of 25 minutes and 00 seconds (25:00).
2. WHEN the user activates the Start control AND the Focus_Timer is not already counting down, THE Focus_Timer SHALL begin counting down one second at a time and SHALL display the remaining time in MM:SS format, updated every second.
3. WHEN the user activates the Stop control WHILE the Focus_Timer is actively counting down, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
4. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the displayed time to 25:00.
5. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, display 00:00, and the Start control SHALL remain disabled until the user activates the Reset control.

---

### Requirement 3: Task Management — Adding Tasks

**User Story:** As a user, I want to add new tasks to my to-do list, so that I can track things I need to do.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a text input field and a submission control for adding a new Task.
2. WHEN the user submits a new Task whose text, after trimming whitespace, is between 1 and 500 characters, THE Task_List SHALL add the Task with an initial completion status of incomplete.
3. WHEN a Task is successfully added, THE Dashboard SHALL clear the text input field.
4. IF the user submits an empty or whitespace-only string, THEN THE Dashboard SHALL reject the submission, SHALL NOT add a Task to the Task_List, and SHALL display a visible error message.
5. IF the user submits a Task whose text matches an existing Task case-insensitively (after trimming whitespace), THEN THE Dashboard SHALL reject the submission, SHALL NOT add the Task to the Task_List, and SHALL display a visible error message indicating the task already exists.
6. WHEN a Task is added, THE Storage SHALL persist the updated Task_List.
7. IF Storage fails when persisting the Task_List after an add, THEN THE Dashboard SHALL display a visible error message and SHALL revert the Task_List to its pre-submission state.

---

### Requirement 4: Task Management — Editing Tasks

**User Story:** As a user, I want to edit the text of an existing task, so that I can correct or update it without deleting and re-adding it.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an edit control for each Task in the Task_List.
2. WHEN the user activates the edit control for a Task, THE Dashboard SHALL present the Task's current text in an editable field; IF the user cancels the edit, THE Dashboard SHALL discard the changes and restore the original text.
3. WHEN the user confirms an edit whose text, after trimming whitespace, is between 1 and 500 characters, THE Task_List SHALL update the Task's text to the new value.
4. IF the user confirms an edit with an empty or whitespace-only string, THEN THE Dashboard SHALL reject the edit and SHALL retain the Task's original text.
5. IF the user confirms an edit that would create a Duplicate_Task, THEN THE Dashboard SHALL reject the edit and SHALL display a visible error message indicating the task already exists; the error message SHALL persist until the user modifies the input or cancels the edit.
6. WHEN a Task is successfully edited, THE Storage SHALL persist the updated Task_List.
7. IF Storage fails when persisting the Task_List after an edit, THEN THE Dashboard SHALL display a visible error message and SHALL retain the Task's pre-edit text.

---

### Requirement 5: Task Management — Completing and Deleting Tasks

**User Story:** As a user, I want to mark tasks as done and delete tasks I no longer need, so that I can keep my list current.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a completion toggle control for each Task in the Task_List.
2. WHEN the user activates the completion toggle for an incomplete Task, THE Task_List SHALL update that Task's completion status to complete.
3. WHEN a Task's completion status is set to complete, THE Dashboard SHALL render the Task's title with strikethrough text.
4. WHEN the user activates the completion toggle for a complete Task, THE Task_List SHALL update that Task's completion status to incomplete and THE Dashboard SHALL remove the strikethrough from the Task's title.
5. THE Dashboard SHALL provide a delete control for each Task in the Task_List.
6. WHEN the user activates the delete control for a Task, THE Task_List SHALL remove that Task permanently and THE Dashboard SHALL no longer display that Task.
7. WHEN a Task's completion status is changed, THE Storage SHALL persist the updated Task_List within 2 seconds.
8. WHEN a Task is deleted, THE Storage SHALL persist the updated Task_List within 2 seconds.
9. IF Storage fails when persisting the Task_List after a completion or deletion change, THEN THE Dashboard SHALL display a visible error message and SHALL revert the Task_List to its pre-action state.

---

### Requirement 6: Task Management — Sorting Tasks

**User Story:** As a user, I want to sort my task list, so that I can view tasks in a meaningful order.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a sort control that allows the user to select a sort order.
2. WHEN the user selects the sort order "Alphabetical (A–Z)", THE Task_List SHALL display Tasks sorted by their text in ascending alphabetical order, case-insensitively.
3. WHEN the user selects the sort order "Alphabetical (Z–A)", THE Task_List SHALL display Tasks sorted by their text in descending alphabetical order, case-insensitively.
4. WHEN the user selects the sort order "Incomplete First", THE Task_List SHALL display all incomplete Tasks before all complete Tasks, with Tasks within each group sorted alphabetically (A–Z) case-insensitively as a secondary sort.
5. WHEN the user selects the sort order "Complete First", THE Task_List SHALL display all complete Tasks before all incomplete Tasks, with Tasks within each group sorted alphabetically (A–Z) case-insensitively as a secondary sort.
6. WHEN the user selects a sort order, THE Storage SHALL persist the selected sort order.
7. WHEN the Dashboard loads, THE Dashboard SHALL restore the previously persisted sort order and apply it to the Task_List display and the sort control; IF no sort order has been previously persisted, THE Dashboard SHALL default to "Incomplete First".
8. IF Storage is unavailable when persisting the sort order, THEN THE Dashboard SHALL apply the selected sort order for the current session without persisting it.

---

### Requirement 7: Data Persistence — Task List

**User Story:** As a user, I want my tasks to be saved automatically, so that they are still present when I reopen the Dashboard.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Task_List SHALL restore all Tasks previously persisted in Storage.
2. THE Storage SHALL represent the Task_List as a serialised JSON array where each element contains the task text and completion status.
3. IF Storage contains no previously saved Task_List data, THEN THE Dashboard SHALL initialise with an empty Task_List.
4. IF Storage contains malformed or unparseable Task_List data, THEN THE Dashboard SHALL initialise with an empty Task_List, SHALL display an error indication to the user, and SHALL NOT throw an unhandled error.
5. WHEN the Task_List changes (task added, completed, or deleted), THE Storage SHALL be updated to reflect the current Task_List.

---

### Requirement 8: Quick Links

**User Story:** As a user, I want to save and access my favourite website URLs as labelled buttons, so that I can open them quickly from the Dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a form for adding a new Quick Link consisting of a label (max 100 characters) and a URL (max 2048 characters).
2. WHEN the user submits a new Quick Link, THE Quick_Links SHALL add a button labelled with the provided label.
3. WHEN the user activates a Quick Link button, THE Dashboard SHALL open the associated URL in a new browser tab.
4. IF the user submits a Quick Link with an empty or whitespace-only label or an empty or whitespace-only URL, THEN THE Dashboard SHALL reject the submission, SHALL NOT add the Quick Link, and SHALL display a visible error message within the form.
5. IF the user submits a Quick Link with a URL that does not begin with "http://" or "https://", THEN THE Dashboard SHALL reject the submission and SHALL display an error message within the form indicating the URL format is invalid.
6. THE Dashboard SHALL provide a delete control for each Quick Link.
7. WHEN the user activates the delete control for a Quick Link, THE Quick_Links SHALL remove that Quick Link permanently.
8. WHEN a Quick Link is added or deleted, THE Storage SHALL persist the updated Quick_Links collection.
9. WHEN the Dashboard loads, THE Quick_Links SHALL restore all Quick Links previously persisted in Storage.
10. THE Quick_Links collection SHALL be capped at a maximum of 20 Quick Links; IF the user attempts to add a Quick Link when 20 already exist, THE Dashboard SHALL reject the submission and SHALL display a visible error message.

---

### Requirement 9: Light/Dark Mode Toggle

**User Story:** As a user, I want to switch between a light and a dark visual theme, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control for switching between the Light Theme and the Dark Theme.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL switch from the current Theme to the other Theme and apply the new Theme's styles to all visible components within 100 milliseconds.
3. THE Dashboard SHALL persist the user's selected Theme in persistent client-side storage.
4. WHEN the Dashboard loads, THE Dashboard SHALL restore the Theme previously persisted in persistent client-side storage.
5. IF no Theme has been previously persisted OR IF the persisted Theme value is unrecognized or corrupted, THEN THE Dashboard SHALL apply the Light Theme by default.
6. IF persistent client-side storage is unavailable or throws an error when persisting the Theme, THEN THE Dashboard SHALL disable the theme toggle and retain the current Theme for the remainder of the session.

---

### Requirement 10: File Structure and Code Organisation

**User Story:** As a developer, I want the project to follow a defined file structure, so that the codebase remains clean and maintainable.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using exactly one HTML file, exactly one CSS file located inside a `css/` directory, and exactly one JavaScript file located inside a `js/` directory.
2. THE Dashboard SHALL use only HTML, CSS, and Vanilla JavaScript. External frameworks (e.g., React, Vue, Angular), external libraries (e.g., jQuery, Lodash), and runtime remote resource loading (e.g., CDN scripts, remote stylesheets) are equally prohibited; no external dependencies of any kind are permitted.
3. THE Dashboard SHALL require no build step or backend server.
4. WHEN the Dashboard HTML file is opened directly in a browser as a local file or served as a static page, THE Dashboard SHALL render all features correctly and SHALL produce no dependency-related console errors.

---

### Requirement 11: Browser Compatibility

**User Story:** As a user, I want the Dashboard to work in any modern browser, so that I am not restricted to a specific browser.

#### Acceptance Criteria

1. THE Dashboard SHALL function correctly in the latest stable release of Chrome, Firefox, Edge, and Safari at time of deployment; WHERE "function correctly" means all features are operable, no layout breakage occurs, and no JavaScript errors block functionality.
2. THE Dashboard SHALL use only Web APIs that are natively available in all four browsers listed in criterion 1, such that all features operate without browser-specific workarounds.

---

### Requirement 12: Performance and Responsiveness

**User Story:** As a user, I want the Dashboard to load quickly and respond to my interactions without noticeable delay, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL complete its initial render and become interactive within 2 seconds on a machine with at least a dual-core 2 GHz CPU, 4 GB RAM, and an unthrottled local network connection.
2. WHERE system CPU utilization is at or below 80%, WHEN the user interacts with any Dashboard control (adding a task, toggling theme, starting the timer, etc.), THE Dashboard SHALL visually update to reflect the new state within 100 milliseconds.
3. IF system CPU utilization exceeds 80%, THEN THE Dashboard SHALL visually update to reflect the new state within 150 milliseconds.
4. THE Dashboard SHALL reflow content to fit viewport widths from 320px to 2560px without horizontal scrolling or overlapping elements.
