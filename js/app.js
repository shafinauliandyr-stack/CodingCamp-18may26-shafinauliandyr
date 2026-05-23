(function () {
  'use strict';

  // === CONSTANTS ===

  var KEYS = {
    TASKS:      'tdl_tasks',
    SORT_ORDER: 'tdl_sort_order',
    LINKS:      'tdl_links',
    THEME:      'tdl_theme'
  };

  var LIMITS = {
    MAX_TASK_LENGTH:  500,
    MAX_LABEL_LENGTH: 100,
    MAX_URL_LENGTH:   2048,
    MAX_LINKS:        20,
    TIMER_SECONDS:    1500
  };

  var VALID_SORT_ORDERS = ['az', 'za', 'incomplete-first', 'complete-first'];

  // === STATE ===

  var state = {
    tasks:     [],
    sortOrder: 'incomplete-first',
    links:     [],
    theme:     'light',
    timer: {
      remainingSeconds: 1500,
      intervalId:       null,
      running:          false
    }
  };

  // === STORAGE ===

  /**
   * Persist a value under the given localStorage key.
   * @param {string} key
   * @param {*} value  — will be JSON-serialised
   * @returns {boolean} true on success, false on any failure
   */
  function saveKey(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[saveKey] Failed to save key "' + key + '":', e);
      return false;
    }
  }

  /**
   * Load and JSON-parse a value from localStorage.
   * @param {string} key
   * @param {*} fallback  — returned when the key is absent or data is malformed
   * @returns {*} parsed value or fallback
   */
  function loadKey(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('[loadKey] Failed to load key "' + key + '":', e);
      return fallback;
    }
  }

  // === ERROR BANNERS ===

  /**
   * Creates or updates a persistent storage-error banner at the top of <body>.
   * @param {string} message
   */
  function showStorageBanner(message) {
    var banner = document.getElementById('storage-error-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'storage-error-banner';
      banner.className = 'storage-error-banner';
      banner.setAttribute('role', 'alert');
      banner.setAttribute('aria-live', 'assertive');
      document.body.insertBefore(banner, document.body.firstChild);
    }
    banner.textContent = message || 'Storage error: changes may not be saved.';
  }

  // Global error handler — requirement 7.4
  window.onerror = function (msg, src, line, col, err) {
    console.error('[onerror]', msg, src, line, col, err);
    showStorageBanner('An unexpected error occurred. Please reload the page.');
    return false;
  };

  // === GREETING ===

  /**
   * Returns a time-of-day greeting based on the given hour (0–23).
   * @param {number} hour
   * @returns {string}
   */
  function getGreeting(hour) {
    if (hour >= 5  && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 20) return 'Good Evening';
    return 'Good Night';
  }

  /**
   * Formats h/m/s as zero-padded HH:MM:SS.
   * @param {number} h @param {number} m @param {number} s
   * @returns {string}
   */
  function formatTime(h, m, s) {
    return (
      String(h).padStart(2, '0') + ':' +
      String(m).padStart(2, '0') + ':' +
      String(s).padStart(2, '0')
    );
  }

  /**
   * Formats a Date as "DayName, MonthName DD, YYYY".
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric'
    });
  }

  /** Updates #greeting-text, #clock-display, #date-display from current Date. */
  function renderGreeting() {
    var now = new Date();
    var greetingEl = document.getElementById('greeting-text');
    var clockEl    = document.getElementById('clock-display');
    var dateEl     = document.getElementById('date-display');
    if (greetingEl) greetingEl.textContent = getGreeting(now.getHours());
    if (clockEl)    clockEl.textContent    = formatTime(now.getHours(), now.getMinutes(), now.getSeconds());
    if (dateEl)     dateEl.textContent     = formatDate(now);
  }

  /** Called by setInterval every 1 000 ms. */
  function tickClock() {
    renderGreeting();
  }

  // === TIMER ===

  /** Formats remainingSeconds as MM:SS and updates the timer display + button states. */
  function renderTimer() {
    var mins = Math.floor(state.timer.remainingSeconds / 60);
    var secs = state.timer.remainingSeconds % 60;
    var display = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;

    var timerDisplay = document.getElementById('timer-display');
    var startBtn     = document.getElementById('timer-start');
    var stopBtn      = document.getElementById('timer-stop');

    if (timerDisplay) timerDisplay.textContent = display;
    if (startBtn)     startBtn.disabled  = state.timer.running || state.timer.remainingSeconds === 0;
    if (stopBtn)      stopBtn.disabled   = !state.timer.running;
  }

  /** Starts the countdown. Guards against double-start. */
  function startTimer() {
    if (state.timer.running) return;
    state.timer.running = true;
    state.timer.intervalId = setInterval(function () {
      state.timer.remainingSeconds -= 1;
      renderTimer();
      if (state.timer.remainingSeconds <= 0) stopTimer();
    }, 1000);
    renderTimer();
  }

  /** Pauses the countdown. */
  function stopTimer() {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    state.timer.running    = false;
    renderTimer();
  }

  /** Stops and resets to 25:00. */
  function resetTimer() {
    stopTimer();
    state.timer.remainingSeconds = LIMITS.TIMER_SECONDS;
    renderTimer();
  }

  // === TASKS ===

  /** Generates a unique ID. */
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now() + '-' + Math.random().toString(36).slice(2);
  }

  /** Returns true if trimmed text is 1–500 chars. */
  function isValidTaskText(text) {
    var t = text.trim();
    return t.length >= 1 && t.length <= LIMITS.MAX_TASK_LENGTH;
  }

  /** Returns true if a task with the same text (case-insensitive, trimmed) already exists. */
  function isDuplicateTask(text, excludeId) {
    var norm = text.trim().toLowerCase();
    return state.tasks.some(function (task) {
      if (excludeId && task.id === excludeId) return false;
      return task.text.trim().toLowerCase() === norm;
    });
  }

  /**
   * Returns a new sorted copy of tasks. Does NOT mutate the original.
   * @param {Array} tasks
   * @param {string} order  'az' | 'za' | 'incomplete-first' | 'complete-first'
   * @returns {Array}
   */
  function sortTasks(tasks, order) {
    var copy = tasks.slice();
    var az = function (a, b) {
      return a.text.localeCompare(b.text, undefined, { sensitivity: 'base' });
    };
    if (order === 'az') {
      copy.sort(az);
    } else if (order === 'za') {
      copy.sort(function (a, b) { return b.text.localeCompare(a.text, undefined, { sensitivity: 'base' }); });
    } else if (order === 'incomplete-first') {
      copy.sort(function (a, b) {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return az(a, b);
      });
    } else if (order === 'complete-first') {
      copy.sort(function (a, b) {
        if (a.completed !== b.completed) return a.completed ? -1 : 1;
        return az(a, b);
      });
    }
    return copy;
  }

  /** Clears and rebuilds #task-list from state. */
  function renderTaskList() {
    var list = document.getElementById('task-list');
    if (!list) return;
    list.innerHTML = '';

    sortTasks(state.tasks, state.sortOrder).forEach(function (task) {
      var li = document.createElement('li');
      li.setAttribute('data-id', task.id);

      var checkbox = document.createElement('input');
      checkbox.type      = 'checkbox';
      checkbox.className = 'task-complete-toggle';
      checkbox.checked   = task.completed === true;
      checkbox.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.completed ? 'incomplete' : 'complete'));

      var span = document.createElement('span');
      span.className = 'task-text' + (task.completed ? ' completed' : '');
      span.textContent = task.text;

      var editBtn = document.createElement('button');
      editBtn.className   = 'task-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task: ' + task.text);

      var deleteBtn = document.createElement('button');
      deleteBtn.className   = 'task-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.text);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  /** Adds a new task. Validates, persists, re-renders. */
  function addTask(text) {
    var taskError = document.getElementById('task-error');
    var taskInput = document.getElementById('task-input');

    if (!isValidTaskText(text)) {
      if (taskError) taskError.textContent = 'Task cannot be empty.';
      return;
    }
    if (isDuplicateTask(text)) {
      if (taskError) taskError.textContent = 'This task already exists.';
      return;
    }

    var snapshot = state.tasks.slice();
    state.tasks.push({ id: generateId(), text: text.trim(), completed: false });

    var saved = saveKey(KEYS.TASKS, state.tasks);
    if (!saved) {
      state.tasks = snapshot;
      showStorageBanner('Could not save tasks. Changes may not persist.');
      return;
    }

    if (taskInput) taskInput.value = '';
    if (taskError) taskError.textContent = '';
    renderTaskList();
  }

  /** Replaces the task row with an inline edit input. */
  function startEditTask(id) {
    var li = document.querySelector('#task-list li[data-id="' + id + '"]');
    if (!li) return;

    var task = state.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    li.innerHTML = '';

    var input = document.createElement('input');
    input.type      = 'text';
    input.className = 'task-edit-input';
    input.value     = task.text;
    input.maxLength = LIMITS.MAX_TASK_LENGTH;

    var errorSpan = document.createElement('span');
    errorSpan.className = 'task-inline-error';
    errorSpan.setAttribute('role', 'alert');

    var saveBtn = document.createElement('button');
    saveBtn.className   = 'task-save-btn';
    saveBtn.textContent = 'Save';

    var cancelBtn = document.createElement('button');
    cancelBtn.className   = 'task-cancel-btn';
    cancelBtn.textContent = 'Cancel';

    input.addEventListener('input', function () { errorSpan.textContent = ''; });

    saveBtn.addEventListener('click', function () { saveEditTask(id, input.value); });
    cancelBtn.addEventListener('click', function () { cancelEditTask(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter')  saveEditTask(id, input.value);
      if (e.key === 'Escape') cancelEditTask();
    });

    li.appendChild(input);
    li.appendChild(errorSpan);
    li.appendChild(saveBtn);
    li.appendChild(cancelBtn);
    input.focus();
  }

  /** Saves the edited task text. */
  function saveEditTask(id, newText) {
    var li = document.querySelector('#task-list li[data-id="' + id + '"]');
    var errorSpan = li ? li.querySelector('.task-inline-error') : null;

    if (!isValidTaskText(newText)) {
      if (errorSpan) errorSpan.textContent = 'Task cannot be empty.';
      return;
    }
    if (isDuplicateTask(newText, id)) {
      if (errorSpan) errorSpan.textContent = 'This task already exists.';
      return;
    }

    var snapshot = state.tasks.slice();
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    state.tasks[idx] = { id: state.tasks[idx].id, text: newText.trim(), completed: state.tasks[idx].completed };

    var saved = saveKey(KEYS.TASKS, state.tasks);
    if (!saved) {
      state.tasks = snapshot;
      showStorageBanner('Could not save task edit. Changes may not persist.');
      return;
    }
    renderTaskList();
  }

  /** Cancels an in-progress edit and restores the list. */
  function cancelEditTask() {
    renderTaskList();
  }

  /** Toggles the completed state of a task. */
  function toggleTask(id) {
    var snapshot = state.tasks.slice();
    var idx = state.tasks.findIndex(function (t) { return t.id === id; });
    if (idx === -1) return;

    state.tasks[idx] = {
      id:        state.tasks[idx].id,
      text:      state.tasks[idx].text,
      completed: !state.tasks[idx].completed
    };

    var saved = saveKey(KEYS.TASKS, state.tasks);
    if (!saved) {
      state.tasks = snapshot;
      showStorageBanner('Could not save task status. Changes may not persist.');
      return;
    }
    renderTaskList();
  }

  /** Permanently removes a task. */
  function deleteTask(id) {
    var snapshot = state.tasks.slice();
    state.tasks = state.tasks.filter(function (t) { return t.id !== id; });

    var saved = saveKey(KEYS.TASKS, state.tasks);
    if (!saved) {
      state.tasks = snapshot;
      showStorageBanner('Could not delete task. Changes may not persist.');
      return;
    }
    renderTaskList();
  }

  // === LINKS ===

  /** Returns true if url starts with http:// or https:// and is within length limits. */
  function isValidUrl(url) {
    var t = url.trim();
    if (t.length < 1 || t.length > LIMITS.MAX_URL_LENGTH) return false;
    var lower = t.toLowerCase();
    return lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0;
  }

  /** Clears and rebuilds #links-list from state. */
  function renderLinks() {
    var list = document.getElementById('links-list');
    if (!list) return;
    list.innerHTML = '';

    state.links.forEach(function (link) {
      var item = document.createElement('div');
      item.className = 'link-item';
      item.setAttribute('data-id', link.id);

      var anchor = document.createElement('a');
      anchor.href      = link.url;
      anchor.target    = '_blank';
      anchor.rel       = 'noopener noreferrer';
      anchor.className = 'link-btn';
      anchor.textContent = link.label;

      var deleteBtn = document.createElement('button');
      deleteBtn.className   = 'link-delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', 'Delete link: ' + link.label);

      item.appendChild(anchor);
      item.appendChild(deleteBtn);
      list.appendChild(item);
    });
  }

  /** Validates and adds a new quick link. */
  function addLink(label, url) {
    var linkError = document.getElementById('link-error');
    var trimmedLabel = label.trim();
    var trimmedUrl   = url.trim();

    if (trimmedLabel.length < 1 || trimmedLabel.length > LIMITS.MAX_LABEL_LENGTH) {
      if (linkError) linkError.textContent = 'Label must be 1–100 characters.';
      return;
    }
    if (!isValidUrl(url)) {
      if (linkError) linkError.textContent = trimmedUrl.length === 0
        ? 'URL is required.'
        : 'URL must start with http:// or https://.';
      return;
    }
    if (state.links.length >= LIMITS.MAX_LINKS) {
      if (linkError) linkError.textContent = 'Maximum of 20 links reached.';
      return;
    }

    var snapshot = state.links.slice();
    state.links.push({ id: generateId(), label: trimmedLabel, url: trimmedUrl });

    var saved = saveKey(KEYS.LINKS, state.links);
    if (!saved) {
      state.links = snapshot;
      showStorageBanner('Could not save links. Changes may not persist.');
      return;
    }

    var labelInput = document.getElementById('link-label-input');
    var urlInput   = document.getElementById('link-url-input');
    if (labelInput) labelInput.value = '';
    if (urlInput)   urlInput.value   = '';
    if (linkError)  linkError.textContent = '';
    renderLinks();
  }

  /** Removes a quick link by id. */
  function deleteLink(id) {
    var snapshot = state.links.slice();
    state.links = state.links.filter(function (l) { return l.id !== id; });

    var saved = saveKey(KEYS.LINKS, state.links);
    if (!saved) {
      state.links = snapshot;
      showStorageBanner('Could not delete link. Changes may not persist.');
      return;
    }
    renderLinks();
  }

  // === THEME ===

  /** Sets data-theme on <html> and updates the toggle button. */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'light') {
      btn.setAttribute('aria-label', 'Switch to dark mode');
      btn.textContent = '🌙';
    } else {
      btn.setAttribute('aria-label', 'Switch to light mode');
      btn.textContent = '☀️';
    }
  }

  /** Flips the theme, persists, disables button if storage fails. */
  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(state.theme);
    var saved = saveKey(KEYS.THEME, state.theme);
    if (!saved) {
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.disabled = true;
        btn.setAttribute('aria-label', 'Theme persistence unavailable');
      }
    }
  }

  // === INIT ===

  function init() {
    // --- Load persisted state ---

    var rawTasks = loadKey(KEYS.TASKS, []);
    if (Array.isArray(rawTasks)) {
      state.tasks = rawTasks;
    } else {
      state.tasks = [];
      showStorageBanner('Saved task data was unreadable and has been reset.');
    }

    var rawSort = loadKey(KEYS.SORT_ORDER, 'incomplete-first');
    state.sortOrder = VALID_SORT_ORDERS.indexOf(rawSort) !== -1 ? rawSort : 'incomplete-first';

    var rawLinks = loadKey(KEYS.LINKS, []);
    if (Array.isArray(rawLinks)) {
      state.links = rawLinks;
    } else {
      state.links = [];
      showStorageBanner('Saved links data was unreadable and has been reset.');
    }

    var rawTheme = loadKey(KEYS.THEME, 'light');
    state.theme = (rawTheme === 'light' || rawTheme === 'dark') ? rawTheme : 'light';

    // --- Initial renders ---
    applyTheme(state.theme);
    renderGreeting();
    renderTimer();
    renderTaskList();
    renderLinks();

    // Restore sort select value
    var sortSelect = document.getElementById('task-sort-select');
    if (sortSelect) sortSelect.value = state.sortOrder;

    // --- Start clock ---
    setInterval(tickClock, 1000);

    // --- Wire timer buttons ---
    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-stop').addEventListener('click', stopTimer);
    document.getElementById('timer-reset').addEventListener('click', resetTimer);

    // --- Wire theme toggle ---
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // --- Wire task add form ---
    var taskInput  = document.getElementById('task-input');
    var taskAddBtn = document.getElementById('task-add-btn');
    var taskError  = document.getElementById('task-error');

    taskAddBtn.addEventListener('click', function () {
      addTask(taskInput.value);
    });
    taskInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTask(taskInput.value);
    });
    taskInput.addEventListener('input', function () {
      if (taskError) taskError.textContent = '';
    });

    // --- Wire task list (event delegation) ---
    var taskList = document.getElementById('task-list');
    taskList.addEventListener('change', function (e) {
      if (e.target.classList.contains('task-complete-toggle')) {
        var li = e.target.closest('li[data-id]');
        if (li) toggleTask(li.getAttribute('data-id'));
      }
    });
    taskList.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-id]');
      if (!li) return;
      var id = li.getAttribute('data-id');
      if (e.target.classList.contains('task-edit-btn'))   startEditTask(id);
      if (e.target.classList.contains('task-delete-btn')) deleteTask(id);
      if (e.target.classList.contains('task-save-btn'))   saveEditTask(id, li.querySelector('.task-edit-input').value);
      if (e.target.classList.contains('task-cancel-btn')) cancelEditTask();
    });

    // --- Wire sort control ---
    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        state.sortOrder = sortSelect.value;
        saveKey(KEYS.SORT_ORDER, state.sortOrder);
        renderTaskList();
      });
    }

    // --- Wire links form ---
    var linkLabelInput = document.getElementById('link-label-input');
    var linkUrlInput   = document.getElementById('link-url-input');
    var linkError      = document.getElementById('link-error');
    var linkAddBtn     = document.getElementById('link-add-btn');

    linkAddBtn.addEventListener('click', function () {
      addLink(linkLabelInput.value, linkUrlInput.value);
    });
    linkLabelInput.addEventListener('input', function () {
      if (linkError) linkError.textContent = '';
    });
    linkUrlInput.addEventListener('input', function () {
      if (linkError) linkError.textContent = '';
    });

    // --- Wire links list (event delegation) ---
    var linksList = document.getElementById('links-list');
    linksList.addEventListener('click', function (e) {
      if (e.target.classList.contains('link-delete-btn')) {
        var item = e.target.closest('.link-item[data-id]');
        if (item) deleteLink(item.getAttribute('data-id'));
      }
    });
  }

  // Run after DOM is ready (script has defer attribute)
  init();

})();
