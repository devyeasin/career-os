/* =====================================================
   CAREER OS — Main Application Logic
   All data stored in localStorage for offline use
   ===================================================== */

// -------------------- Helpers --------------------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem('careerOS_' + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function save(key, data) {
  localStorage.setItem('careerOS_' + key, JSON.stringify(data));
}

function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1600);
}

// -------------------- State --------------------
let entries = load('entries', {});
let tasks = load('tasks', []);
let ideas = load('ideas', []);
let study = load('study', []);
let skills = load('skills', null);
let quran = load('quran', []);
let milestones = load('milestones', []);
let plan = load('plan', { title: '', target: '', vision: '' });
let notes = load('notes', []);
let calNotes = load('calNotes', {});
let alarms = load('alarms', []);
let currentNoteId = null;
let selectedCalDate = todayStr();

const DEFAULT_SKILLS = [
  'HTML & CSS', 'JavaScript', 'TypeScript', 'Node.js',
  'React / Next.js', 'Python', 'AI / LLM APIs', 'Git & GitHub'
];

if (!skills) {
  skills = DEFAULT_SKILLS.map(t => ({ id: newId(), text: t, done: false }));
  save('skills', skills);
}

const PRAYERS = [
  { key: 'fajr', label: 'Fajr', mark: '☾' },
  { key: 'dhuhr', label: 'Dhuhr', mark: '☀' },
  { key: 'asr', label: 'Asr', mark: '☀' },
  { key: 'maghrib', label: 'Maghrib', mark: '☀' },
  { key: 'isha', label: 'Isha', mark: '☾' }
];

const QUOTES = [
  "The best of you are those who learn the Quran and teach it. — Prophet Muhammad ﷺ",
  "Success is the sum of small efforts repeated day in and day out.",
  "Code is like humor. When you have to explain it, it’s bad. — Cory House",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Discipline is the bridge between goals and accomplishment.",
  "Pray as if everything depends on Allah, and work as if everything depends on you.",
  "Small consistent actions beat occasional big efforts.",
  "Your future is created by what you do today, not tomorrow.",
  "The expert in anything was once a beginner.",
  "Focus on progress, not perfection."
];

const QURAN_VERSES = [
  "Indeed, with hardship comes ease. (94:6)",
  "And whoever puts their trust in Allah – then He is sufficient for them. (65:3)",
  "So remember Me; I will remember you. (2:152)",
  "Allah does not burden a soul beyond that it can bear. (2:286)",
  "And He found you lost and guided [you]. (93:7)",
  "Verily, in the remembrance of Allah do hearts find rest. (13:28)",
  "And seek help through patience and prayer. (2:45)",
  "My mercy encompasses all things. (7:156)",
  "Do not despair of the mercy of Allah. (39:53)",
  "And your Lord is going to give you, and you will be satisfied. (93:5)"
];

// -------------------- Clock --------------------
function updateClock() {
  const now = new Date();
  $('#liveClock').textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  $('#liveDate').textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
  });
}
setInterval(updateClock, 1000);
updateClock();

// -------------------- Theme --------------------
function initTheme() {
  const saved = localStorage.getItem('careerOS_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
$('#themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('careerOS_theme', next);
});
initTheme();

// -------------------- Navigation --------------------
function switchView(name) {
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  if (window.innerWidth < 860) $('#sidebar').classList.remove('open');
  if (name === 'calendar') renderCalendar();
  if (name === 'habits') renderHabits();
  if (name === 'dashboard') renderDashboard();
  if (name === 'notes') renderNotesList();
  if (name === 'deen') { renderPrayerGrid(); renderTasbih(); renderQuranList(); }
  if (name === 'work') { renderTaskList(); renderIdeaList(); }
  if (name === 'study') { renderStudyList(); renderSkillList(); }
  if (name === 'plan') { populatePlanForm(); renderMilestoneList(); renderPlanProgress(); }
  if (name === 'daily') { populateTodayForm(); renderRecent(); }
}

$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

$('#menuBtn').addEventListener('click', () => {
  $('#sidebar').classList.toggle('open');
});

// -------------------- Weather (Open-Meteo, no key) --------------------
async function loadWeather() {
  try {
    // Default: Dhaka, Bangladesh
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=23.81&longitude=90.41&current=temperature_2m,weather_code&timezone=Asia%2FDhaka');
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const desc = weatherDesc(code);
    $('#weatherMini').textContent = `${temp}°C · ${desc} · Dhaka`;
  } catch {
    $('#weatherMini').textContent = 'Weather unavailable';
  }
}
function weatherDesc(code) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Stormy';
}
loadWeather();

// -------------------- Daily Quote & Quran --------------------
function setDailyInspiration() {
  const day = new Date().getDate();
  $('#dailyQuote').textContent = QUOTES[day % QUOTES.length];
  $('#dailyQuran').textContent = QURAN_VERSES[day % QURAN_VERSES.length];
}
setDailyInspiration();

// -------------------- Calendar --------------------
let calYear, calMonth;
function initCal() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
}
initCal();

function changeMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function goToday() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  selectedCalDate = todayStr();
  renderCalendar();
  loadCalNote();
}

function renderCalendar() {
  const title = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('#calTitle').textContent = title;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();

  let html = '';
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    html += `<div class="cal-day other">${d}</div>`;
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === todayStr();
    const isSelected = dateStr === selectedCalDate;
    const hasNote = !!calNotes[dateStr];
    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    if (hasNote) cls += ' has-note';
    html += `<div class="${cls}" data-date="${dateStr}" onclick="selectCalDay('${dateStr}')">${d}</div>`;
  }
  // Next month fill
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="cal-day other">${i}</div>`;
  }
  $('#calGrid').innerHTML = html;
  loadCalNote();
}

function selectCalDay(dateStr) {
  selectedCalDate = dateStr;
  renderCalendar();
}

function loadCalNote() {
  $('#calNoteInput').value = calNotes[selectedCalDate] || '';
}

function saveCalNote() {
  const text = $('#calNoteInput').value.trim();
  if (text) calNotes[selectedCalDate] = text;
  else delete calNotes[selectedCalDate];
  save('calNotes', calNotes);
  renderCalendar();
}

// -------------------- Calculator --------------------
let calcValue = '0';
let calcPrev = null;
let calcOp = null;
let calcReset = false;

function calcInput(key) {
  if (key === 'C') {
    calcValue = '0'; calcPrev = null; calcOp = null; calcReset = false;
  } else if (key === '±') {
    calcValue = String(parseFloat(calcValue) * -1);
  } else if (key === '%') {
    calcValue = String(parseFloat(calcValue) / 100);
  } else if (['+', '-', '*', '/'].includes(key)) {
    if (calcOp && !calcReset) calcEquals();
    calcPrev = parseFloat(calcValue);
    calcOp = key;
    calcReset = true;
  } else if (key === '=') {
    calcEquals();
  } else if (key === '.') {
    if (calcReset) { calcValue = '0.'; calcReset = false; }
    else if (!calcValue.includes('.')) calcValue += '.';
  } else {
    if (calcReset || calcValue === '0') { calcValue = key; calcReset = false; }
    else calcValue += key;
  }
  $('#calcDisplay').value = calcValue;
}

function calcEquals() {
  if (calcOp === null || calcPrev === null) return;
  const a = calcPrev;
  const b = parseFloat(calcValue);
  let result = 0;
  if (calcOp === '+') result = a + b;
  if (calcOp === '-') result = a - b;
  if (calcOp === '*') result = a * b;
  if (calcOp === '/') result = b !== 0 ? a / b : 0;
  calcValue = String(Math.round(result * 1e10) / 1e10);
  calcOp = null;
  calcPrev = null;
  calcReset = true;
  $('#calcDisplay').value = calcValue;
}

// -------------------- Currency --------------------
let rates = {};

async function loadRates() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD');
    const data = await res.json();
    rates = { USD: 1, ...data.rates };
    // Approximate BDT (Frankfurter may not have it; fallback)
    if (!rates.BDT) rates.BDT = 117; // approximate fallback
    convertCurrency();
  } catch {
    rates = { USD: 1, BDT: 117, EUR: 0.92, GBP: 0.79, INR: 83, SAR: 3.75 };
    convertCurrency();
  }
}

function convertCurrency() {
  const amount = parseFloat($('#curAmount').value) || 0;
  const from = $('#curFrom').value;
  const to = $('#curTo').value;
  if (!rates[from] || !rates[to]) {
    $('#curResult').value = '—';
    $('#curRate').textContent = 'Rates loading…';
    return;
  }
  const usd = amount / rates[from];
  const result = usd * rates[to];
  $('#curResult').value = result.toFixed(2);
  $('#curRate').textContent = `1 ${from} ≈ ${(rates[to] / rates[from]).toFixed(4)} ${to}`;
}

function swapCurrency() {
  const from = $('#curFrom').value;
  const to = $('#curTo').value;
  $('#curFrom').value = to;
  $('#curTo').value = from;
  convertCurrency();
}

$('#curAmount').addEventListener('input', convertCurrency);
$('#curFrom').addEventListener('change', convertCurrency);
$('#curTo').addEventListener('change', convertCurrency);
loadRates();

// -------------------- Stopwatch --------------------
let swRunning = false;
let swStart = 0;
let swElapsed = 0;
let swInterval = null;
let laps = [];

function toggleStopwatch() {
  if (swRunning) {
    clearInterval(swInterval);
    swElapsed += Date.now() - swStart;
    swRunning = false;
    $('#swStartBtn').textContent = 'Start';
  } else {
    swStart = Date.now();
    swInterval = setInterval(updateStopwatch, 50);
    swRunning = true;
    $('#swStartBtn').textContent = 'Pause';
  }
}

function updateStopwatch() {
  const total = swElapsed + (Date.now() - swStart);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = Math.floor((total % 1000) / 10);
  $('#stopwatchDisplay').textContent =
    String(h).padStart(2,'0') + ':' +
    String(m).padStart(2,'0') + ':' +
    String(s).padStart(2,'0');
}

function resetStopwatch() {
  clearInterval(swInterval);
  swRunning = false;
  swElapsed = 0;
  laps = [];
  $('#stopwatchDisplay').textContent = '00:00:00';
  $('#swStartBtn').textContent = 'Start';
  $('#lapsList').innerHTML = '';
}

function lapStopwatch() {
  if (!swRunning && swElapsed === 0) return;
  const total = swRunning ? swElapsed + (Date.now() - swStart) : swElapsed;
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const ms = Math.floor((total % 1000) / 10);
  laps.unshift(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`);
  $('#lapsList').innerHTML = laps.map((l,i) => `<li>Lap ${laps.length-i}: ${l}</li>`).join('');
}

// -------------------- Focus / Pomodoro --------------------
let focusMinutes = 25;
let focusSeconds = 0;
let focusRunning = false;
let focusInterval = null;
let focusTotalSeconds = 25 * 60;

function setFocusMode(min, btn) {
  if (focusRunning) return;
  focusMinutes = min;
  focusTotalSeconds = min * 60;
  focusSeconds = focusTotalSeconds;
  $$('.mode').forEach(m => m.classList.remove('active'));
  btn.classList.add('active');
  updateFocusDisplay();
  $('#focusStatus').textContent = min <= 5 ? 'Break time' : 'Ready to focus';
}

function updateFocusDisplay() {
  const m = Math.floor(focusSeconds / 60);
  const s = focusSeconds % 60;
  const text = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  $('#focusDisplay').textContent = text;
  $('#dashFocusTime').textContent = text;
}

function toggleFocus() {
  if (focusRunning) {
    clearInterval(focusInterval);
    focusRunning = false;
    $('#focusStartBtn').textContent = 'Start Focus';
    $('#focusStatus').textContent = 'Paused';
  } else {
    if (focusSeconds <= 0) focusSeconds = focusTotalSeconds;
    focusRunning = true;
    $('#focusStartBtn').textContent = 'Pause';
    $('#focusStatus').textContent = 'Focusing… stay locked in';
    focusInterval = setInterval(() => {
      focusSeconds--;
      updateFocusDisplay();
      if (focusSeconds <= 0) {
        clearInterval(focusInterval);
        focusRunning = false;
        $('#focusStartBtn').textContent = 'Start Focus';
        $('#focusStatus').textContent = 'Session complete! 🎉';
        if (Notification.permission === 'granted') {
          new Notification('Career OS', { body: 'Focus session finished. Great work!' });
        }
      }
    }, 1000);
  }
}

function startFocus() { if (!focusRunning) toggleFocus(); }
function pauseFocus() { if (focusRunning) toggleFocus(); }

function resetFocus() {
  clearInterval(focusInterval);
  focusRunning = false;
  focusSeconds = focusTotalSeconds;
  updateFocusDisplay();
  $('#focusStartBtn').textContent = 'Start Focus';
  $('#focusStatus').textContent = 'Ready to focus';
}

// -------------------- Alarm --------------------
function setAlarm() {
  const time = $('#alarmTime').value;
  const label = $('#alarmLabel').value.trim() || 'Alarm';
  if (!time) return alert('Please set a time');
  const id = newId();
  alarms.push({ id, time, label, active: true });
  save('alarms', alarms);
  renderAlarms();
  $('#alarmTime').value = '';
  $('#alarmLabel').value = '';
  if (Notification.permission !== 'granted') Notification.requestPermission();
}

function renderAlarms() {
  const list = $('#alarmList');
  if (!alarms.length) {
    list.innerHTML = '<li class="empty">No alarms set</li>';
    return;
  }
  list.innerHTML = alarms.map(a => `
    <li>
      <span><b>${a.time}</b> — ${escapeHtml(a.label)}</span>
      <button class="del" onclick="deleteAlarm('${a.id}')">×</button>
    </li>
  `).join('');
}

function deleteAlarm(id) {
  alarms = alarms.filter(a => a.id !== id);
  save('alarms', alarms);
  renderAlarms();
}

function checkAlarms() {
  const now = new Date();
  const current = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  alarms.forEach(a => {
    if (a.active && a.time === current) {
      a.active = false;
      save('alarms', alarms);
      if (Notification.permission === 'granted') {
        new Notification('Career OS Alarm', { body: a.label });
      } else {
        alert('Alarm: ' + a.label);
      }
      renderAlarms();
    }
  });
}
setInterval(checkAlarms, 15000);

// -------------------- YouTube Lofi --------------------
function loadYoutube() {
  const link = $('#ytLink').value.trim();
  if (!link) return;
  let id = '';
  const match = link.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) id = match[1];
  else if (link.length === 11) id = link;
  if (!id) return alert('Could not find YouTube video ID');
  $('#ytPlayer').innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}

// -------------------- Notes --------------------
function renderNotesList() {
  const list = $('#notesList');
  if (!notes.length) {
    list.innerHTML = '<li class="empty">No notes yet</li>';
    return;
  }
  list.innerHTML = notes.map(n => `
    <li class="${n.id === currentNoteId ? 'active' : ''}" onclick="openNote('${n.id}')">
      ${escapeHtml(n.title || 'Untitled')}
    </li>
  `).join('');
}

function newNote() {
  const note = { id: newId(), title: '', body: '', updated: Date.now() };
  notes.unshift(note);
  save('notes', notes);
  openNote(note.id);
}

function openNote(id) {
  currentNoteId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;
  $('#noteTitle').value = note.title;
  $('#noteBody').value = note.body;
  $('#noteMeta').textContent = 'Updated ' + new Date(note.updated).toLocaleString();
  renderNotesList();
}

function saveNote() {
  if (!currentNoteId) return;
  const note = notes.find(n => n.id === currentNoteId);
  if (!note) return;
  note.title = $('#noteTitle').value.trim() || 'Untitled';
  note.body = $('#noteBody').value;
  note.updated = Date.now();
  save('notes', notes);
  renderNotesList();
  $('#noteMeta').textContent = 'Saved · ' + new Date().toLocaleTimeString();
}

function deleteNote() {
  if (!currentNoteId) return;
  if (!confirm('Delete this note?')) return;
  notes = notes.filter(n => n.id !== currentNoteId);
  save('notes', notes);
  currentNoteId = null;
  $('#noteTitle').value = '';
  $('#noteBody').value = '';
  $('#noteMeta').textContent = '';
  renderNotesList();
}

// -------------------- Deen / Prayers --------------------
function todayEntry() {
  if (!entries[todayStr()]) entries[todayStr()] = {};
  return entries[todayStr()];
}

function renderPrayerGrid() {
  const t = entries[todayStr()] || {};
  $('#prayerGrid').innerHTML = PRAYERS.map(p => `
    <button class="prayer-btn ${t[p.key] ? 'on' : ''}" onclick="togglePrayer('${p.key}')">
      <span class="mark">${p.mark}</span>${p.label}
    </button>
  `).join('');
  const streak = prayerStreakDays();
  const done = [t.fajr, t.dhuhr, t.asr, t.maghrib, t.isha].filter(Boolean).length;
  $('#prayerStreak').textContent = `${streak} day streak · ${done}/5 today`;
}

function togglePrayer(key) {
  const t = todayEntry();
  t[key] = !t[key];
  save('entries', entries);
  renderPrayerGrid();
  renderHabits();
  renderDashboard();
}

function prayerStreakDays() {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    const key = dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0');
    const t = entries[key];
    if (t && t.fajr && t.dhuhr && t.asr && t.maghrib && t.isha) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function renderTasbih() {
  const t = entries[todayStr()] || {};
  $('#tasbihBtn').textContent = t.zikr || 0;
}

function tapTasbih(n) {
  const t = todayEntry();
  t.zikr = (t.zikr || 0) + n;
  save('entries', entries);
  renderTasbih();
  if ($('#d_zikr')) $('#d_zikr').value = t.zikr;
}

function resetTasbih() {
  const t = todayEntry();
  t.zikr = 0;
  save('entries', entries);
  renderTasbih();
  if ($('#d_zikr')) $('#d_zikr').value = 0;
}

function updateQuranQuick() {
  const t = todayEntry();
  t.quranPages = parseInt($('#q_pages').value) || 0;
  t.quranMinutes = parseInt($('#q_minutes').value) || 0;
  save('entries', entries);
  if ($('#d_quranPages')) $('#d_quranPages').value = t.quranPages;
  if ($('#d_quranMinutes')) $('#d_quranMinutes').value = t.quranMinutes;
}

function updateDuaQuick() {
  const t = todayEntry();
  t.duaRead = $('#q_dua').checked;
  save('entries', entries);
}

function renderQuranList() {
  renderList('quranList', quran, 'toggleQuran', 'deleteQuran');
}

function addQuranItem() {
  const text = $('#quranNew').value.trim();
  if (!text) return;
  quran.unshift({ id: newId(), text, tag: 'learning', done: false });
  $('#quranNew').value = '';
  save('quran', quran);
  renderQuranList();
}

function toggleQuran(id) {
  const item = quran.find(x => x.id === id);
  if (!item) return;
  item.done = !item.done;
  item.tag = item.done ? 'memorized' : 'learning';
  save('quran', quran);
  renderQuranList();
}

function deleteQuran(id) {
  quran = quran.filter(x => x.id !== id);
  save('quran', quran);
  renderQuranList();
}

// -------------------- Generic List Helper --------------------
function renderList(containerId, items, toggleFn, deleteFn) {
  const el = document.getElementById(containerId);
  if (!items.length) {
    el.innerHTML = '<div class="empty">Nothing here yet</div>';
    return;
  }
  el.innerHTML = items.map(item => `
    <li class="list-item">
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="${toggleFn}('${item.id}')" />
      <span class="txt ${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span>
      ${item.tag ? `<span class="tag">${escapeHtml(item.tag)}</span>` : ''}
      <button class="del" onclick="${deleteFn}('${item.id}')">×</button>
    </li>
  `).join('');
}

// -------------------- Work Tasks & Ideas --------------------
function renderTaskList() { renderList('taskList', tasks, 'toggleTask', 'deleteTask'); }
function addTask() {
  const text = $('#taskNew').value.trim();
  if (!text) return;
  tasks.unshift({ id: newId(), text, tag: $('#taskPlatform').value, done: false });
  $('#taskNew').value = '';
  save('tasks', tasks);
  renderTaskList();
}
function toggleTask(id) {
  const item = tasks.find(x => x.id === id);
  if (item) { item.done = !item.done; save('tasks', tasks); renderTaskList(); }
}
function deleteTask(id) {
  tasks = tasks.filter(x => x.id !== id);
  save('tasks', tasks);
  renderTaskList();
}

function renderIdeaList() { renderList('ideaList', ideas, 'toggleIdea', 'deleteIdea'); }
function addIdea() {
  const text = $('#ideaNew').value.trim();
  if (!text) return;
  ideas.unshift({ id: newId(), text, tag: $('#ideaTag').value, done: false });
  $('#ideaNew').value = '';
  save('ideas', ideas);
  renderIdeaList();
}
function toggleIdea(id) {
  const item = ideas.find(x => x.id === id);
  if (item) { item.done = !item.done; save('ideas', ideas); renderIdeaList(); }
}
function deleteIdea(id) {
  ideas = ideas.filter(x => x.id !== id);
  save('ideas', ideas);
  renderIdeaList();
}

// -------------------- Study & Skills --------------------
function renderStudyList() { renderList('studyList', study, 'toggleStudy', 'deleteStudy'); }
function addStudyItem() {
  const text = $('#studyNew').value.trim();
  if (!text) return;
  study.unshift({ id: newId(), text, done: false });
  $('#studyNew').value = '';
  save('study', study);
  renderStudyList();
}
function toggleStudy(id) {
  const item = study.find(x => x.id === id);
  if (item) { item.done = !item.done; save('study', study); renderStudyList(); }
}
function deleteStudy(id) {
  study = study.filter(x => x.id !== id);
  save('study', study);
  renderStudyList();
}

function renderSkillList() { renderList('skillList', skills, 'toggleSkill', 'deleteSkill'); }
function toggleSkill(id) {
  const item = skills.find(x => x.id === id);
  if (item) { item.done = !item.done; save('skills', skills); renderSkillList(); }
}
function deleteSkill(id) {
  skills = skills.filter(x => x.id !== id);
  save('skills', skills);
  renderSkillList();
}

// -------------------- 4-Month Plan --------------------
function populatePlanForm() {
  $('#plan_title').value = plan.title || '';
  $('#plan_target').value = plan.target || '';
  $('#plan_vision').value = plan.vision || '';
}

function savePlan() {
  plan = {
    title: $('#plan_title').value,
    target: $('#plan_target').value,
    vision: $('#plan_vision').value
  };
  save('plan', plan);
  renderPlanProgress();
  alert('Plan saved');
}

function renderMilestoneList() {
  const el = $('#milestoneList');
  if (!milestones.length) {
    el.innerHTML = '<div class="empty">No milestones yet</div>';
    return;
  }
  el.innerHTML = milestones.map(item => `
    <li class="list-item">
      <input type="checkbox" ${item.done ? 'checked' : ''} onchange="toggleMilestone('${item.id}')" />
      <span class="txt ${item.done ? 'done' : ''}">${escapeHtml(item.text)}</span>
      <span class="tag">Month ${item.month}</span>
      <button class="del" onclick="deleteMilestone('${item.id}')">×</button>
    </li>
  `).join('');
}

function addMilestone() {
  const text = $('#milestoneNew').value.trim();
  if (!text) return;
  milestones.push({ id: newId(), text, month: $('#milestoneMonth').value, done: false });
  $('#milestoneNew').value = '';
  save('milestones', milestones);
  renderMilestoneList();
  renderPlanProgress();
}

function toggleMilestone(id) {
  const item = milestones.find(x => x.id === id);
  if (item) { item.done = !item.done; save('milestones', milestones); renderMilestoneList(); renderPlanProgress(); }
}

function deleteMilestone(id) {
  milestones = milestones.filter(x => x.id !== id);
  save('milestones', milestones);
  renderMilestoneList();
  renderPlanProgress();
}

function renderPlanProgress() {
  const done = milestones.filter(x => x.done).length;
  const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
  $('#planProgressFill').style.width = pct + '%';
  $('#planProgressPct').textContent = pct + '%';
  if (plan.target) {
    const target = new Date(plan.target + 'T00:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = Math.ceil((target - now) / 86400000);
    $('#planCountdown').textContent = diff >= 0 ? `${diff} days left on this plan.` : `Target passed ${Math.abs(diff)} days ago.`;
  } else {
    $('#planCountdown').textContent = 'Set a target date to see countdown.';
  }
}

// -------------------- Daily Log --------------------
function populateTodayForm() {
  const t = entries[todayStr()] || {};
  $('#d_quranPages').value = t.quranPages || '';
  $('#d_quranMinutes').value = t.quranMinutes || '';
  $('#d_zikr').value = t.zikr || '';
  $('#d_duaRead').checked = !!t.duaRead;
  $('#d_study').value = t.study || '';
  $('#d_commits').value = t.commits || '';
  $('#d_proposals').value = t.proposals || '';
  $('#d_fiverrTouch').checked = !!t.fiverrTouch;
  $('#d_marketing').checked = !!t.marketing;
  $('#d_gov').value = t.gov || '';
  $('#d_english').value = t.english || '';
  $('#d_exercise').value = t.exercise || '';
  $('#d_income').value = t.income || '';
  $('#d_expenses').value = t.expenses || '';
}

function saveDaily() {
  const t = todayEntry();
  Object.assign(t, {
    quranPages: parseInt($('#d_quranPages').value) || 0,
    quranMinutes: parseInt($('#d_quranMinutes').value) || 0,
    zikr: parseInt($('#d_zikr').value) || 0,
    duaRead: $('#d_duaRead').checked,
    study: parseFloat($('#d_study').value) || 0,
    commits: parseInt($('#d_commits').value) || 0,
    proposals: parseInt($('#d_proposals').value) || 0,
    fiverrTouch: $('#d_fiverrTouch').checked,
    marketing: $('#d_marketing').checked,
    gov: parseFloat($('#d_gov').value) || 0,
    english: parseInt($('#d_english').value) || 0,
    exercise: parseInt($('#d_exercise').value) || 0,
    income: parseFloat($('#d_income').value) || 0,
    expenses: parseFloat($('#d_expenses').value) || 0
  });
  save('entries', entries);
  flash('savedMsg');
  renderRecent();
  renderHabits();
  renderDashboard();
}

function lastNDays(n) {
  const days = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() - i);
    days.push(dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0'));
  }
  return days.reverse();
}

function renderRecent() {
  const days = lastNDays(7).reverse();
  const withData = days.filter(k => entries[k]);
  const el = $('#recentLog');
  if (!withData.length) {
    el.innerHTML = '<div class="empty">No entries yet</div>';
    return;
  }
  let html = '<table class="log"><tr><th>Date</th><th>Study</th><th>Prayers</th><th>Income</th></tr>';
  withData.forEach(k => {
    const t = entries[k];
    const p = [t.fajr, t.dhuhr, t.asr, t.maghrib, t.isha].filter(Boolean).length;
    html += `<tr><td>${k.slice(5)}</td><td>${t.study||0}h</td><td>${p}/5</td><td>${t.income||0}</td></tr>`;
  });
  html += '</table>';
  el.innerHTML = html;
}

// -------------------- Habits --------------------
function allPrayers(k) {
  const t = entries[k];
  return !!(t && t.fajr && t.dhuhr && t.asr && t.maghrib && t.isha);
}

function renderHabits() {
  const days = lastNDays(30);
  const cols = [
    ['Study', k => entries[k] && entries[k].study > 0],
    ['Marketing', k => entries[k] && entries[k].marketing],
    ['Exercise', k => entries[k] && entries[k].exercise > 0],
    ['5 Prayers', k => allPrayers(k), true],
    ['Qur’an', k => entries[k] && (entries[k].quranMinutes > 0 || entries[k].quranPages > 0), true]
  ];
  let html = '';
  cols.forEach(([label, test, islamic]) => {
    html += `<div class="habit-col"><h4>${label}</h4><div class="habit-boxes">`;
    days.forEach(k => {
      html += `<div class="hb ${test(k) ? 'on' + (islamic ? ' islamic-on' : '') : ''}"></div>`;
    });
    html += '</div></div>';
  });
  $('#habitGrid').innerHTML = html;
}

// -------------------- Dashboard KPIs --------------------
function renderDashboard() {
  const t = entries[todayStr()] || {};
  const prayerDone = [t.fajr, t.dhuhr, t.asr, t.maghrib, t.isha].filter(Boolean).length;
  const openTasks = tasks.filter(x => !x.done).length;
  $('#dashKpis').innerHTML = `
    <div class="kpi"><div class="num">${prayerDone}/5</div><div class="lab">Prayers</div></div>
    <div class="kpi"><div class="num">${t.study || 0}h</div><div class="lab">Study</div></div>
    <div class="kpi"><div class="num">${openTasks}</div><div class="lab">Open tasks</div></div>
    <div class="kpi"><div class="num">${prayerStreakDays()}</div><div class="lab">Streak</div></div>
  `;
  updateFocusDisplay();
}

// -------------------- Command Palette --------------------
const COMMANDS = [
  { name: 'Dashboard', action: () => switchView('dashboard') },
  { name: 'Calendar', action: () => switchView('calendar') },
  { name: 'Tools', action: () => switchView('tools') },
  { name: 'Notes', action: () => switchView('notes') },
  { name: 'Deen / Prayers', action: () => switchView('deen') },
  { name: 'Work', action: () => switchView('work') },
  { name: 'Study', action: () => switchView('study') },
  { name: 'Habits', action: () => switchView('habits') },
  { name: '4-Month Plan', action: () => switchView('plan') },
  { name: 'Daily Log', action: () => switchView('daily') },
  { name: 'Toggle Theme', action: () => $('#themeToggle').click() },
  { name: 'New Note', action: () => { switchView('notes'); newNote(); } },
  { name: 'Start Focus Timer', action: () => { switchView('tools'); startFocus(); } }
];

function openCmd() {
  $('#cmdOverlay').classList.add('open');
  $('#cmdInput').value = '';
  $('#cmdInput').focus();
  renderCmdResults('');
}

function closeCmd() {
  $('#cmdOverlay').classList.remove('open');
}

function renderCmdResults(q) {
  const filtered = COMMANDS.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  $('#cmdResults').innerHTML = filtered.map((c, i) => `
    <li class="${i===0?'selected':''}" data-idx="${i}">${c.name}</li>
  `).join('');
  $('#cmdResults').querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const cmd = filtered[parseInt(li.dataset.idx)];
      if (cmd) { cmd.action(); closeCmd(); }
    });
  });
}

$('#cmdBtn').addEventListener('click', openCmd);
$('#cmdOverlay').addEventListener('click', (e) => {
  if (e.target === $('#cmdOverlay')) closeCmd();
});
$('#cmdInput').addEventListener('input', (e) => renderCmdResults(e.target.value));
$('#cmdInput').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCmd();
  if (e.key === 'Enter') {
    const first = $('#cmdResults li.selected') || $('#cmdResults li');
    if (first) first.click();
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openCmd();
  }
});

// -------------------- Sticky Notes (simple floating) --------------------
function addSticky(text) {
  const el = document.createElement('div');
  el.className = 'sticky';
  el.innerHTML = `<button class="close" onclick="this.parentElement.remove()">×</button>${escapeHtml(text)}`;
  $('#stickyContainer').appendChild(el);
  setTimeout(() => el.remove(), 12000);
}

// -------------------- Init --------------------
function init() {
  renderDashboard();
  renderAlarms();
  renderCalendar();
  // Request notification permission once
  if ('Notification' in window && Notification.permission === 'default') {
    // Don't force; user can allow when they set alarm
  }
  // Welcome sticky
  setTimeout(() => {
    addSticky('Welcome to Career OS! Press Ctrl+K for quick commands.');
  }, 800);
}

init();
