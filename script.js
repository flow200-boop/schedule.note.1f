// ===== State =====
let notes = [];
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

// ===== Initialization =====
function init() {
  loadNotes();
  updateTodayBadge();
  renderMonth();
  renderYearView();
  renderNotes();

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
  const dateObj = new Date(dateStr + 'T12:00:00');
  const display = dateObj.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  dayDetailDate.textContent = `📅 ${display}`;


  // Remove any existing add-btn before adding a new one (to avoid duplicates)
  const oldBtn = document.querySelector('.day-detail-add-btn');
  if (oldBtn) oldBtn.remove();
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-primary day-detail-add-btn';
  addBtn.textContent = '+ Note';
  addBtn.style.fontSize = '0.75rem';
  addBtn.style.padding = '4px 10px';
  addBtn.onclick = (e) => { e.stopPropagation(); openModal(); };
  dayDetailDate.parentNode.appendChild(addBtn);

  if (dateNotes.length === 0) {
    dayDetailNotes.innerHTML = '<p class="empty-state">No notes for this day. <a href="#" onclick="event.preventDefault(); openModal()" style="color:var(--accent);text-decoration:underline;">Add one</a></p>';
  } else {
    dayDetailNotes.innerHTML = dateNotes.map(n => `
      <div class="day-detail-note">
        <div class="day-detail-note-title">${escapeHtml(n.title)}</div>
        <div class="day-detail-note-content">${escapeHtml(n.content)}</div>
      </div>
    `).join('');
  }

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
