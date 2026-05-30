// ===== State =====
let currentTab = 'notes'; // 'notes' | 'todos' | 'calendar'
let notes = [];
let todos = [];
let todoFilter = 'all'; // 'all' | 'active' | 'completed'
let currentView = 'month'; // 'month' | 'year'
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let selectedDate = null; // 'YYYY-MM-DD'
let editingNoteId = null;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ===== DOM References =====
const $ = (id) => document.getElementById(id);

const notesList = $('notes-list');
const notesSearch = $('notes-search');
const addNoteBtn = $('add-note-btn');

const calendarLabel = $('calendar-label');
const prevNav = $('prev-nav');
const nextNav = $('next-nav');
const monthViewBtn = $('month-view-btn');
const yearViewBtn = $('year-view-btn');
const monthView = $('month-view');
const yearView = $('year-view');
const daysGrid = $('days-grid');
const yearGrid = $('year-grid');

const dayDetail = $('day-detail');
const dayDetailDate = $('day-detail-date');
const dayDetailNotes = $('day-detail-notes');
const closeDayDetail = $('close-day-detail');

const modal = $('note-modal');
const modalTitle = $('modal-title');
const noteDate = $('note-date');
const noteTitle = $('note-title');
const noteContent = $('note-content');
const saveNoteBtn = $('save-note');
const cancelModal = $('cancel-modal');
const closeModal = $('close-modal');

const todayBadge = $('today-badge');

// ===== Todos DOM =====
const todoInput = $('todo-input');
const todoDate = $('todo-date');
const addTodoBtn = $('add-todo-btn');
const todoList = $('todo-list');
const todoFilters = $('todo-filters');
const todoStats = $('todo-stats');
const clearCompletedBtn = $('clear-completed-btn');

// ===== Tab Switcher =====
function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab-${tab}`);
  if (panel) panel.classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  // Refresh content when switching to a tab
  if (tab === 'calendar') {
    renderMonth();
  } else if (tab === 'notes') {
    renderNotes();
  } else if (tab === 'todos') {
    renderTodos();
    todoInput.focus();
  }
}

// ===== Initialization =====
function init() {
  loadNotes();
  loadTodos();
  updateTodayBadge();
  renderMonth();
  renderYearView();
  renderNotes();
  renderTodos();

  // Set today's date in the new note form
  noteDate.value = formatDateInput(new Date());

  // Event listeners
  addNoteBtn.addEventListener('click', () => openModal());
  cancelModal.addEventListener('click', closeModalFn);
  closeModal.addEventListener('click', closeModalFn);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModalFn(); });
  saveNoteBtn.addEventListener('click', saveNote);

  prevNav.addEventListener('click', navigatePrev);
  nextNav.addEventListener('click', navigateNext);

  monthViewBtn.addEventListener('click', () => switchView('month'));
  yearViewBtn.addEventListener('click', () => switchView('year'));

  notesSearch.addEventListener('input', renderNotes);
  closeDayDetail.addEventListener('click', () => hideDayDetail());

  // Tab navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Set default todo date to today
  todoDate.value = formatDateInput(new Date());

  // Todos event listeners
  addTodoBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTodo(); });
  clearCompletedBtn.addEventListener('click', clearCompleted);

  todoFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    todoFilter = btn.dataset.filter;
    todoFilters.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTodos();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!modal.classList.contains('hidden')) closeModalFn();
      else hideDayDetail();
    }
  });
}

// ===== Notes: CRUD =====

function loadNotes() {
  try {
    const stored = localStorage.getItem('notes_app_notes');
    notes = stored ? JSON.parse(stored) : [];
  } catch {
    notes = [];
  }
}

function saveNotesToStorage() {
  localStorage.setItem('notes_app_notes', JSON.stringify(notes));
}

function createNote(title, content, dateStr) {
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title.trim(),
    content: content.trim(),
    date: dateStr, // 'YYYY-MM-DD'
    createdAt: new Date().toISOString()
  };
  notes.unshift(note);
  saveNotesToStorage();
  renderNotes();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
  return note;
}

function updateNote(id, title, content, dateStr) {
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], title: title.trim(), content: content.trim(), date: dateStr };
  saveNotesToStorage();
  renderNotes();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
}

function deleteNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  if (!confirm(`Delete "${note.title || 'Untitled'}"?`)) return;
  notes = notes.filter(n => n.id !== id);
  saveNotesToStorage();
  renderNotes();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
}

function getNotesForDate(dateStr) {
  return notes.filter(n => n.date === dateStr);
}

function getDatesWithNotes() {
  const set = new Set();
  notes.forEach(n => set.add(n.date));
  todos.forEach(t => set.add(t.date));
  return set;
}

function getFilteredNotes() {
  const query = notesSearch.value.trim().toLowerCase();
  if (!query) return notes;
  return notes.filter(n =>
    n.title.toLowerCase().includes(query) ||
    n.content.toLowerCase().includes(query)
  );
}

// ===== Notes: Rendering =====

function renderNotes() {
  const filtered = getFilteredNotes();
  if (filtered.length === 0) {
    notesList.innerHTML = '<p class="empty-state">No notes yet. Click "+ New Note" to get started.</p>';
    return;
  }
  notesList.innerHTML = filtered.map(note => renderNoteCard(note)).join('');
}

function renderNoteCard(note) {
  const dateDisplay = formatDateDisplay(note.date);
  const preview = note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content;
  return `
    <div class="note-card note-card-enter" data-id="${note.id}" onclick="openModal('${note.id}')">
      <div class="note-card-header">
        <span class="note-card-title">${escapeHtml(note.title || 'Untitled')}</span>
        <span class="note-card-date">${dateDisplay}</span>
      </div>
      <div class="note-card-preview">${escapeHtml(preview || 'No content')}</div>
      <div class="note-card-actions" onclick="event.stopPropagation()">
        <button class="note-card-action-btn" onclick="openModal('${note.id}')" title="Edit">✎</button>
        <button class="note-card-action-btn delete" onclick="deleteNote('${note.id}')" title="Delete">✕</button>
      </div>
    </div>
  `;
}

// ===== Notes: Modal =====

function openModal(noteId) {
  editingNoteId = noteId || null;
  modalTitle.textContent = noteId ? 'Edit Note' : 'New Note';

  if (noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      noteDate.value = note.date;
      noteTitle.value = note.title;
      noteContent.value = note.content;
    }
  } else {
    noteDate.value = selectedDate || formatDateInput(new Date());
    noteTitle.value = '';
    noteContent.value = '';
  }

  modal.classList.remove('hidden');
  setTimeout(() => noteTitle.focus(), 100);
}

function closeModalFn() {
  modal.classList.add('hidden');
  editingNoteId = null;
}

function saveNote() {
  const date = noteDate.value;
  const title = noteTitle.value.trim() || 'Untitled';
  const content = noteContent.value.trim();

  if (!date) {
    noteDate.focus();
    return;
  }

  if (editingNoteId) {
    updateNote(editingNoteId, title, content, date);
  } else {
    createNote(title, content, date);
  }
  closeModalFn();
}

// ===== Todos: CRUD =====

function getTodosForDate(dateStr) {
  return todos.filter(t => t.date === dateStr);
}

function getDatesWithTodos() {
  const set = new Set();
  todos.forEach(t => set.add(t.date));
  return set;
}

function loadTodos() {
  try {
    const stored = localStorage.getItem('notes_app_todos');
    todos = stored ? JSON.parse(stored) : [];
  } catch {
    todos = [];
  }
}

function saveTodosToStorage() {
  localStorage.setItem('notes_app_todos', JSON.stringify(todos));
}

function addTodo() {
  const text = todoInput.value.trim();
  if (!text) return;

  const date = todoDate.value || formatDateInput(new Date());

  const todo = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    text: text,
    date: date,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.unshift(todo);
  saveTodosToStorage();
  todoInput.value = '';
  todoInput.focus();
  renderTodos();
  renderMonth();
  renderYearView();
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  saveTodosToStorage();
  renderTodos();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodosToStorage();
  renderTodos();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
}

function clearCompleted() {
  const completed = todos.filter(t => t.completed).length;
  if (completed === 0) return;
  if (!confirm(`Delete ${completed} completed task${completed > 1 ? 's' : ''}?`)) return;
  todos = todos.filter(t => !t.completed);
  saveTodosToStorage();
  renderTodos();
  renderMonth();
  renderYearView();
  if (selectedDate) showDayDetail(selectedDate);
}

function getFilteredTodos() {
  if (todoFilter === 'active') return todos.filter(t => !t.completed);
  if (todoFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
}

// ===== Todos: Rendering =====

function renderTodos() {
  const filtered = getFilteredTodos();

  if (todos.length === 0) {
    todoList.innerHTML = '<div class="todo-empty">No tasks yet. Add one above!</div>';
  } else if (filtered.length === 0) {
    const msg = todoFilter === 'active' ? 'No active tasks!' : 'No completed tasks!';
    todoList.innerHTML = `<div class="todo-empty">${msg}</div>`;
  } else {
    todoList.innerHTML = filtered.map(todo => `
      <div class="todo-item">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}
               onchange="toggleTodo('${todo.id}')" />
        <span class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHtml(todo.text)}</span>
        <span class="todo-date-label">${formatDateDisplay(todo.date)}</span>
        <button class="todo-delete-btn" onclick="deleteTodo('${todo.id}')" title="Delete">✕</button>
      </div>
    `).join('');
  }

  // Update stats
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  todoStats.textContent = `${active} active / ${total} total`;
}

// ===== Calendar: Month View =====

function renderMonth() {
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0=Sun
  const lastMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const today = new Date();
  const todayStr = formatDateInput(today);
  const datesWithNotes = getDatesWithNotes();

  let html = '';

  // Previous month's trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = lastMonthDays - i;
    const dateObj = new Date(currentYear, currentMonth - 1, day);
    const dateStr = formatDateInput(dateObj);
    html += `<div class="cal-day other-month ${datesWithNotes.has(dateStr) ? 'has-notes' : ''}"
                 onclick="switchToDate('${dateStr}')" tabindex="0" role="button"
                 onkeydown="if(event.key==='Enter'||event.key===' ')switchToDate('${dateStr}')">${day}</div>`;
  }

  // Current month's days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    const dateStr = formatDateInput(dateObj);
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const hasNotes = datesWithNotes.has(dateStr);
    const classes = [
      'cal-day',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      hasNotes ? 'has-notes' : ''
    ].filter(Boolean).join(' ');
    html += `<div class="${classes}" onclick="switchToDate('${dateStr}')" tabindex="0" role="button"
                 onkeydown="if(event.key==='Enter'||event.key===' ')switchToDate('${dateStr}')">${d}</div>`;
  }

  // Next month's leading days
  const totalCells = startDayOfWeek + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(currentYear, currentMonth + 1, d);
    const dateStr = formatDateInput(dateObj);
    html += `<div class="cal-day other-month ${datesWithNotes.has(dateStr) ? 'has-notes' : ''}"
                 onclick="switchToDate('${dateStr}')" tabindex="0" role="button"
                 onkeydown="if(event.key==='Enter'||event.key===' ')switchToDate('${dateStr}')">${d}</div>`;
  }

  daysGrid.innerHTML = html;
  updateCalendarLabel();
}

// ===== Calendar: Year View =====

function renderYearView() {
  const today = new Date();
  const todayStr = formatDateInput(today);
  const datesWithNotes = getDatesWithNotes();

  let html = '';
  for (let m = 0; m < 12; m++) {
    const firstDay = new Date(currentYear, m, 1);
    const lastDay = new Date(currentYear, m + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const lastMonthDays = new Date(currentYear, m, 0).getDate();

    let daysHtml = '';

    // Previous month trailing
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysHtml += `<span class="year-month-day other-month">${lastMonthDays - i}</span>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDateInput(new Date(currentYear, m, d));
      const isToday = dateStr === todayStr;
      const hasNotes = datesWithNotes.has(dateStr);
      const classes = [
        'year-month-day',
        isToday ? 'today' : '',
        hasNotes ? 'has-notes' : ''
      ].filter(Boolean).join(' ');
      daysHtml += `<span class="${classes}">${d}</span>`;
    }

    html += `
      <div class="year-month" onclick="switchToMonth(${m})" tabindex="0" role="button"
           onkeydown="if(event.key==='Enter'||event.key===' ')switchToMonth(${m})">
        <div class="year-month-title">${MONTHS_SHORT[m]}</div>
        <div class="year-month-grid">${daysHtml}</div>
      </div>
    `;
  }
  yearGrid.innerHTML = html;
}

// ===== Calendar: Navigation & View Switching =====

function updateCalendarLabel() {
  calendarLabel.textContent = `${MONTHS[currentMonth]} ${currentYear}`;
}

function navigatePrev() {
  if (currentView === 'month') {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderMonth();
  } else {
    currentYear--;
    renderYearView();
    updateYearLabel();
  }
}

function navigateNext() {
  if (currentView === 'month') {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderMonth();
  } else {
    currentYear++;
    renderYearView();
    updateYearLabel();
  }
}

function switchView(view) {
  currentView = view;
  if (view === 'month') {
    monthView.classList.remove('hidden');
    yearView.classList.add('hidden');
    monthViewBtn.classList.add('active');
    yearViewBtn.classList.remove('active');
    renderMonth();
  } else {
    monthView.classList.add('hidden');
    yearView.classList.remove('hidden');
    yearViewBtn.classList.add('active');
    monthViewBtn.classList.remove('active');
    renderYearView();
    updateYearLabel();
  }
}

function updateYearLabel() {
  calendarLabel.textContent = `${currentYear}`;
}

function switchToDate(dateStr) {
  selectedDate = dateStr;

  const parts = dateStr.split('-').map(Number);
  currentYear = parts[0];
  currentMonth = parts[1] - 1;

  // Switch to month view if currently in year view
  if (currentView === 'year') {
    switchView('month');
  } else {
    renderMonth();
  }
  showDayDetail(dateStr);
}

function switchToMonth(month) {
  currentMonth = month;
  switchView('month');
  // Scroll to top of calendar on mobile
  document.querySelector('.calendar-panel').scrollIntoView({ behavior: 'smooth' });
}

// ===== Day Detail =====

function showDayDetail(dateStr) {
  const dateNotes = getNotesForDate(dateStr);
  const dateTodos = getTodosForDate(dateStr);
  const dateObj = new Date(dateStr + 'T12:00:00');
  const display = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  dayDetailDate.textContent = `📅 ${display}`;

  // Remove any existing buttons before adding new ones (to avoid duplicates)
  document.querySelectorAll('.day-detail-action-btn').forEach(el => el.remove());

  // + Note button
  const addNoteBtn = document.createElement('button');
  addNoteBtn.className = 'btn btn-primary day-detail-action-btn';
  addNoteBtn.textContent = '+ Note';
  addNoteBtn.style.fontSize = '0.75rem';
  addNoteBtn.style.padding = '4px 10px';
  addNoteBtn.onclick = (e) => { e.stopPropagation(); openModal(); };
  dayDetailDate.parentNode.appendChild(addNoteBtn);

  // + Task button
  const addTodoBtn = document.createElement('button');
  addTodoBtn.className = 'btn btn-secondary day-detail-action-btn';
  addTodoBtn.textContent = '+ Task';
  addTodoBtn.style.fontSize = '0.75rem';
  addTodoBtn.style.padding = '4px 10px';
  addTodoBtn.style.marginLeft = '6px';
  addTodoBtn.onclick = (e) => {
    e.stopPropagation();
    switchTab('todos');
    todoDate.value = dateStr;
    todoInput.focus();
  };
  dayDetailDate.parentNode.appendChild(addTodoBtn);
  let html = '';

  // Notes section
  if (dateNotes.length > 0) {
    html += `<div class="day-detail-section-title">📌 Notes</div>`;
    html += dateNotes.map(n => `
      <div class="day-detail-note">
        <div class="day-detail-note-title">${escapeHtml(n.title)}</div>
        <div class="day-detail-note-content">${escapeHtml(n.content)}</div>
      </div>
    `).join('');
  }

  // Todos section
  if (dateTodos.length > 0) {
    html += `<div class="day-detail-section-title" style="margin-top:${dateNotes.length > 0 ? '10' : '0'}px;">✅ Tasks</div>`;
    html += dateTodos.map(t => `
      <div class="day-detail-note">
        <div class="day-detail-note-content" style="${t.completed ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${escapeHtml(t.text)}</div>
      </div>
    `).join('');
  }

  if (!html) {
    html = '<p class="empty-state">Nothing for this day. <a href="#" onclick="event.preventDefault(); openModal()" style="color:var(--accent);text-decoration:underline;">Add a note</a> or <a href="#" onclick="event.preventDefault(); switchTab(\'todos\'); todoInput.focus();" style="color:var(--accent);text-decoration:underline;">add a task</a></p>';
  }

  dayDetailNotes.innerHTML = html;

  dayDetail.classList.remove('hidden');
}

function hideDayDetail() {
  dayDetail.classList.add('hidden');
  selectedDate = null;
  renderMonth();
}

// ===== Today Badge =====

function updateTodayBadge() {
  const now = new Date();
  const display = now.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
  });
  todayBadge.textContent = `🗓 ${display}`;
}

// ===== Utility Functions =====

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  // dateStr is YYYY-MM-DD, show as Mon DD, YYYY
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Start =====
document.addEventListener('DOMContentLoaded', init);
