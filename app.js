'use strict';

/* ---------------------------------------------------------------------
   Storage
--------------------------------------------------------------------- */
const LS_ENTRIES = 'worklog.entries.v1';
const LS_TAGS = 'worklog.tags.v1';
const LS_SETTINGS = 'worklog.settings.v1';

const DEFAULT_TAGS = [
  { name: 'Work', color: '#2563eb' },
  { name: 'Learning', color: '#7c3aed' },
  { name: 'Chores', color: '#d97706' },
  { name: 'Health', color: '#16a34a' },
  { name: 'Social', color: '#db2777' },
  { name: 'Other', color: '#64748b' },
];

const MOODS = ['😄', '🙂', '😐', '😫', '🔥'];

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

let entries = load(LS_ENTRIES, []);
let tags = load(LS_TAGS, DEFAULT_TAGS);
let settings = load(LS_SETTINGS, { theme: 'auto', layout: 'layout-auto' });

function persistEntries() { save(LS_ENTRIES, entries); }
function persistTags() { save(LS_TAGS, tags); }
function persistSettings() { save(LS_SETTINGS, settings); }

/* ---------------------------------------------------------------------
   Date utils
--------------------------------------------------------------------- */
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function todayISO() { return toISO(new Date()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function mondayOf(d) {
  const r = new Date(d);
  const dow = (r.getDay() + 6) % 7; // 0 = Monday
  r.setDate(r.getDate() - dow);
  r.setHours(0, 0, 0, 0);
  return r;
}
function isSameDate(a, b) { return toISO(a) === toISO(b); }
function fmtDateLabel(d) { return `${DAY_NAMES_FULL[(d.getDay() + 6) % 7]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`; }
function fmtShort(d) { return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`; }

/* ---------------------------------------------------------------------
   Entry helpers
--------------------------------------------------------------------- */
function entriesOn(dateISO) {
  return entries.filter(e => e.date === dateISO).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
function tagByName(name) { return tags.find(t => t.name === name); }
function tagColor(name) { const t = tagByName(name); return t ? t.color : '#64748b'; }

function addEntry({ date, text, tag, mood }) {
  entries.push({
    id: 'e' + Date.now() + Math.random().toString(36).slice(2, 7),
    date, text: text.trim(), tag: tag || '', mood: mood || '',
    createdAt: new Date().toISOString(),
  });
  persistEntries();
}
function deleteEntry(id) {
  entries = entries.filter(e => e.id !== id);
  persistEntries();
}

/* Unique sorted dates that have >=1 entry */
function activeDatesSet() {
  return new Set(entries.map(e => e.date));
}

function currentStreak() {
  const set = activeDatesSet();
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!set.has(toISO(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (set.has(toISO(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function longestStreak() {
  const dates = Array.from(activeDatesSet()).sort();
  if (!dates.length) return 0;
  let longest = 1, run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = fromISO(dates[i - 1]);
    const cur = fromISO(dates[i]);
    if (isSameDate(addDays(prev, 1), cur)) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
  }
  return longest;
}

/* ---------------------------------------------------------------------
   Theme / layout
--------------------------------------------------------------------- */
function applyTheme() {
  document.body.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  document.body.classList.add('theme-' + settings.theme);
  document.documentElement.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  document.documentElement.classList.add('theme-' + settings.theme);
}
function applyLayout() {
  document.body.classList.remove('layout-auto', 'layout-mobile', 'layout-desktop');
  document.body.classList.add(settings.layout);
  document.getElementById('layoutToggle').value = settings.layout;
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const order = ['auto', 'light', 'dark'];
  settings.theme = order[(order.indexOf(settings.theme) + 1) % order.length];
  persistSettings();
  applyTheme();
  toast(`Theme: ${settings.theme}`);
});
document.getElementById('layoutToggle').addEventListener('change', (e) => {
  settings.layout = e.target.value;
  persistSettings();
  applyLayout();
});

/* ---------------------------------------------------------------------
   Tabs
--------------------------------------------------------------------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
  if (name === 'week') renderWeek();
  if (name === 'history') renderHistory();
  if (name === 'calendar') renderCalendar();
  if (name === 'stats') renderStats();
  if (name === 'settings') renderSettings();
}

/* ---------------------------------------------------------------------
   Toast
--------------------------------------------------------------------- */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.getElementById('toastRoot').appendChild(t);
  setTimeout(() => t.remove(), 2700);
}

/* ---------------------------------------------------------------------
   Confetti (milestone celebration)
--------------------------------------------------------------------- */
function confetti() {
  const colors = ['#FF6B6B', '#FFD93D', '#C4B5FD', '#FFFFFF'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    p.style.borderRadius = Math.random() > 0.7 ? '50%' : '0';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

/* ---------------------------------------------------------------------
   Modal: log / edit day
--------------------------------------------------------------------- */
function quickAddSuggestions() {
  const freq = {};
  entries.forEach(e => { freq[e.text] = (freq[e.text] || 0) + 1; });
  return Object.entries(freq)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([text]) => text);
}

function openLogModal(dateISO) {
  const root = document.getElementById('modalRoot');
  const d = fromISO(dateISO);
  const suggestions = quickAddSuggestions();

  let selectedTag = '';
  let selectedMood = '';
  const pending = []; // tasks added this session, not yet saved: {text, tag, mood}

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>${fmtDateLabel(d)}</h2>
      <div id="modalExisting"></div>

      <label>Add a task / thing you did</label>
      <div class="task-input-row">
        <input type="text" id="modalTaskInput" placeholder="e.g. Fixed the login bug" autofocus>
        <button class="btn-add-task" id="modalAddTaskBtn">+ Add</button>
      </div>
      ${suggestions.length ? `<div class="chip-row" id="modalChips">${suggestions.map(s => `<button class="chip" data-text="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}</div>` : ''}

      <label>Tag (optional, applies to next task added)</label>
      <div class="chip-row" id="modalTags">
        ${tags.map(t => `<button class="chip" data-tag="${escapeAttr(t.name)}" style="--chip-color:${t.color}">${escapeHtml(t.name)}</button>`).join('')}
      </div>
      <label>Mood (optional)</label>
      <div class="mood-picker" id="modalMood">
        ${MOODS.map(m => `<button data-mood="${m}">${m}</button>`).join('')}
      </div>

      <label>This session</label>
      <div id="modalPending" class="pending-list"></div>

      <label>Date</label>
      <input type="date" id="modalDate" value="${dateISO}">
      <div class="modal-actions">
        <button class="btn-plain" id="modalCancel">Cancel</button>
        <button class="btn-primary" id="modalSave">Save</button>
      </div>
    </div>
  `;
  root.appendChild(overlay);

  function renderExisting() {
    const box = document.getElementById('modalExisting');
    const list = entriesOn(document.getElementById('modalDate').value);
    box.innerHTML = list.length
      ? `<label>Already logged</label><div class="already-logged">${list.map(e => entryRowHTML(e, true)).join('')}</div>`
      : '';
    box.querySelectorAll('.entry-del').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteEntry(btn.dataset.id);
        renderExisting();
        refreshCurrentTab();
      });
    });
  }
  renderExisting();

  function renderPending() {
    const box = document.getElementById('modalPending');
    box.innerHTML = pending.length
      ? pending.map((p, i) => pendingRowHTML(p, i)).join('')
      : `<p class="settings-hint">Nothing added yet — type a task above and hit + Add (or Enter).</p>`;
    box.querySelectorAll('.pending-del').forEach(btn => {
      btn.addEventListener('click', () => { pending.splice(Number(btn.dataset.idx), 1); renderPending(); });
    });
  }
  renderPending();

  function addFromInput() {
    const input = document.getElementById('modalTaskInput');
    const text = input.value.trim();
    if (!text) return false;
    pending.push({ text, tag: selectedTag, mood: selectedMood });
    input.value = '';
    renderPending();
    input.focus();
    return true;
  }

  document.getElementById('modalAddTaskBtn').addEventListener('click', addFromInput);
  document.getElementById('modalTaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addFromInput(); }
  });

  overlay.querySelectorAll('#modalChips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('modalTaskInput').value = chip.dataset.text;
      document.getElementById('modalTaskInput').focus();
    });
  });
  overlay.querySelectorAll('#modalTags .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      selectedTag = selectedTag === chip.dataset.tag ? '' : chip.dataset.tag;
      overlay.querySelectorAll('#modalTags .chip').forEach(c => {
        c.classList.toggle('chip-selected', c.dataset.tag === selectedTag);
      });
    });
  });
  overlay.querySelectorAll('#modalMood button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMood = selectedMood === btn.dataset.mood ? '' : btn.dataset.mood;
      overlay.querySelectorAll('#modalMood button').forEach(b => b.classList.toggle('selected', b.dataset.mood === selectedMood));
    });
  });
  document.getElementById('modalDate').addEventListener('change', renderExisting);

  overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#modalSave').addEventListener('click', () => {
    addFromInput(); // catch anything left typed but not yet added
    if (!pending.length) { toast('Add at least one thing first.'); return; }
    const useDate = document.getElementById('modalDate').value || dateISO;
    const wasActiveBefore = activeDatesSet().has(useDate);
    pending.forEach(p => addEntry({ date: useDate, text: p.text, tag: p.tag, mood: p.mood }));
    const count = pending.length;
    overlay.remove();
    toast(`Logged ${count} thing${count > 1 ? 's' : ''}.`);
    checkMilestones(wasActiveBefore);
    refreshCurrentTab();
  });
}

function entryRowHTML(e, small) {
  const t = tagByName(e.tag);
  const time = new Date(e.createdAt);
  return `
    <div class="entry-row">
      <span class="entry-tag-dot" style="background:${t ? t.color : 'transparent'}"></span>
      <div class="entry-body">
        <div class="entry-text">${e.mood ? e.mood + ' ' : ''}${escapeHtml(e.text)}</div>
        <div class="entry-meta">${e.tag ? escapeHtml(e.tag) + ' · ' : ''}${pad(time.getHours())}:${pad(time.getMinutes())}</div>
      </div>
      ${small ? `<button class="entry-del" data-id="${e.id}">✕</button>` : ''}
    </div>
  `;
}

function pendingRowHTML(p, idx) {
  const t = tagByName(p.tag);
  return `
    <div class="entry-row pending-row">
      <span class="entry-tag-dot" style="background:${t ? t.color : 'transparent'}"></span>
      <div class="entry-body">
        <div class="entry-text">${p.mood ? p.mood + ' ' : ''}${escapeHtml(p.text)}</div>
        <div class="entry-meta">${p.tag ? escapeHtml(p.tag) : 'Not yet saved'}</div>
      </div>
      <button class="entry-del pending-del" data-idx="${idx}">✕</button>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

document.getElementById('logTodayBtn').addEventListener('click', () => openLogModal(todayISO()));

/* ---------------------------------------------------------------------
   Week tab
--------------------------------------------------------------------- */
let weekStart = mondayOf(new Date());

document.getElementById('prevWeek').addEventListener('click', () => { weekStart = addDays(weekStart, -7); renderWeek(); });
document.getElementById('nextWeek').addEventListener('click', () => { weekStart = addDays(weekStart, 7); renderWeek(); });
document.getElementById('jumpThisWeek').addEventListener('click', () => { weekStart = mondayOf(new Date()); renderWeek(); });

function renderOnThisDay() {
  const box = document.getElementById('onThisDayCard');
  const offsets = [7, 14, 21, 28, 365];
  for (const off of offsets) {
    const d = addDays(new Date(), -off);
    const list = entriesOn(toISO(d));
    if (list.length) {
      const unit = off === 365 ? '1 year' : `${off / 7} week${off > 7 ? 's' : ''}`;
      box.classList.remove('hidden');
      box.innerHTML = `<b>${unit} ago</b> (${fmtShort(d)}) you did: ${escapeHtml(list[0].text)}${list.length > 1 ? ` <i>+${list.length - 1} more</i>` : ''}`;
      return;
    }
  }
  box.classList.add('hidden');
}

function renderWeek() {
  const label = document.getElementById('weekLabel');
  const end = addDays(weekStart, 6);
  label.textContent = `${fmtShort(weekStart)} – ${fmtShort(end)}, ${end.getFullYear()}`;

  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  const todayStr = todayISO();

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const iso = toISO(d);
    const list = entriesOn(iso);
    const card = document.createElement('div');
    card.className = 'day-card' + (iso === todayStr ? ' today' : '') + (list.length === 0 ? ' empty' : '');
    card.innerHTML = `
      <div class="day-card-head">
        <span class="day-card-name">${DAY_NAMES_FULL[i]}${iso === todayStr ? ' · Today' : ''}</span>
        <span class="day-card-date">${fmtShort(d)}</span>
      </div>
      ${list.length ? `<span class="day-card-count">${list.length}</span>` : ''}
      <ul class="day-card-items">
        ${list.slice(0, 3).map(e => `<li>${e.mood ? e.mood + ' ' : ''}${escapeHtml(e.text)}</li>`).join('')}
      </ul>
      ${list.length > 3 ? `<div class="day-card-more">+${list.length - 3} more</div>` : ''}
      ${list.length === 0 ? `<div class="day-card-more">Nothing logged</div>` : ''}
    `;
    card.addEventListener('click', () => openLogModal(iso));
    grid.appendChild(card);
  }

  renderOnThisDay();
  renderStreakPill();
}

function renderStreakPill() {
  const pill = document.getElementById('streakPill');
  const s = currentStreak();
  if (s > 0) {
    pill.classList.remove('hidden');
    pill.textContent = `🔥 ${s} day${s > 1 ? 's' : ''}`;
  } else {
    pill.classList.add('hidden');
  }
}

/* ---------------------------------------------------------------------
   History tab
--------------------------------------------------------------------- */
function populateTagFilter() {
  const sel = document.getElementById('historyTagFilter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All tags</option>' + tags.map(t => `<option value="${escapeAttr(t.name)}">${escapeHtml(t.name)}</option>`).join('');
  sel.value = cur;
}

document.getElementById('historySearch').addEventListener('input', renderHistory);
document.getElementById('historyTagFilter').addEventListener('change', renderHistory);
document.getElementById('surpriseBtn').addEventListener('click', () => {
  if (!entries.length) { toast('No entries yet — log something first!'); return; }
  const e = entries[Math.floor(Math.random() * entries.length)];
  toast(`On ${e.date}: ${e.text}`);
});

function renderHistory() {
  populateTagFilter();
  const search = document.getElementById('historySearch').value.toLowerCase();
  const tagFilter = document.getElementById('historyTagFilter').value;

  const filtered = entries
    .filter(e => (!search || e.text.toLowerCase().includes(search)) && (!tagFilter || e.tag === tagFilter))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const grouped = {};
  filtered.forEach(e => { (grouped[e.date] = grouped[e.date] || []).push(e); });

  const box = document.getElementById('historyList');
  const dates = Object.keys(grouped).sort().reverse();
  if (!dates.length) {
    box.innerHTML = `<p class="settings-hint">Nothing found.</p>`;
    return;
  }
  box.innerHTML = dates.map(date => `
    <div class="history-group">
      <div class="history-group-date">${fmtDateLabel(fromISO(date))}</div>
      ${grouped[date].map(e => entryRowHTML(e, true)).join('')}
    </div>
  `).join('');
  box.querySelectorAll('.entry-del').forEach(btn => {
    btn.addEventListener('click', () => { deleteEntry(btn.dataset.id); renderHistory(); });
  });
}

/* ---------------------------------------------------------------------
   Calendar / heatmap tab
--------------------------------------------------------------------- */
let calYear = new Date().getFullYear();
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calMode = 'year'; // 'year' | 'month'

document.getElementById('calViewYear').addEventListener('click', () => { calMode = 'year'; updateCalViewToggle(); renderCalendar(); });
document.getElementById('calViewMonth').addEventListener('click', () => { calMode = 'month'; updateCalViewToggle(); renderCalendar(); });

document.getElementById('calPrev').addEventListener('click', () => {
  if (calMode === 'year') calYear--;
  else calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  if (calMode === 'year') calYear++;
  else calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
  renderCalendar();
});

function updateCalViewToggle() {
  document.getElementById('calViewYear').classList.toggle('active', calMode === 'year');
  document.getElementById('calViewMonth').classList.toggle('active', calMode === 'month');
  document.getElementById('heatmapYearView').classList.toggle('hidden', calMode !== 'year');
  document.getElementById('heatmapMonthView').classList.toggle('hidden', calMode !== 'month');
}

function levelFor(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function renderCalendar() {
  document.getElementById('calDayDetail').innerHTML = '';
  if (calMode === 'year') {
    document.getElementById('calLabel').textContent = calYear;
    renderYearHeatmap();
  } else {
    document.getElementById('calLabel').textContent = `${MONTH_NAMES[calMonth.getMonth()]} ${calMonth.getFullYear()}`;
    renderMonthHeatmap();
  }
}

function renderYearHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = '';

  const start = mondayOf(new Date(calYear, 0, 1));
  const end = new Date(calYear, 11, 31);
  const counts = {};
  entries.forEach(e => { counts[e.date] = (counts[e.date] || 0) + 1; });

  let d = new Date(start);
  while (d <= end || d.getDay() !== 1) {
    if (d > addDays(end, 6)) break;
    const iso = toISO(d);
    const inYear = d.getFullYear() === calYear;
    const cell = document.createElement('div');
    const c = counts[iso] || 0;
    cell.className = 'hm-cell lvl' + (inYear ? levelFor(c) : 0);
    cell.title = `${iso}: ${c} entr${c === 1 ? 'y' : 'ies'}`;
    if (!inYear) cell.style.visibility = 'hidden';
    cell.addEventListener('click', () => showDayDetail(iso));
    grid.appendChild(cell);
    d = addDays(d, 1);
  }
}

function renderMonthHeatmap() {
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';

  const counts = {};
  entries.forEach(e => { counts[e.date] = (counts[e.date] || 0) + 1; });

  const firstOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  const gridStart = mondayOf(firstOfMonth);
  const todayStr = todayISO();

  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    const iso = toISO(d);
    const inMonth = d.getMonth() === calMonth.getMonth();
    const c = counts[iso] || 0;
    const cell = document.createElement('div');
    cell.className = 'month-cell lvl' + (inMonth ? levelFor(c) : 0) + (inMonth ? '' : ' outside') + (iso === todayStr ? ' is-today' : '');
    cell.innerHTML = `<span class="month-cell-num">${d.getDate()}</span>${c ? `<span class="month-cell-count">${c}</span>` : ''}`;
    cell.title = `${iso}: ${c} entr${c === 1 ? 'y' : 'ies'}`;
    cell.addEventListener('click', () => showDayDetail(iso));
    grid.appendChild(cell);
    if (i >= 34 && d.getDay() === 0 && addDays(d, 1).getMonth() !== calMonth.getMonth()) break;
  }
}

function showDayDetail(iso) {
  const box = document.getElementById('calDayDetail');
  const list = entriesOn(iso);
  box.innerHTML = `
    <div class="stat-card">
      <h3>${fmtDateLabel(fromISO(iso))}</h3>
      ${list.length ? list.map(e => entryRowHTML(e, false)).join('') : '<p class="settings-hint">Nothing logged.</p>'}
      <button class="btn-secondary" id="calAddBtn" style="margin-top:10px">+ Log for this day</button>
    </div>
  `;
  document.getElementById('calAddBtn').addEventListener('click', () => openLogModal(iso));
}

/* ---------------------------------------------------------------------
   Stats tab — hand-rolled SVG bar charts
--------------------------------------------------------------------- */
function svgBarChart(data, opts = {}) {
  const w = opts.width || 320, h = opts.height || 170;
  const padL = 28, padB = 26, padT = 16, padR = 10;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const max = Math.max(1, ...data.map(d => d.value));
  const barW = innerW / data.length;
  let bars = '', labels = '';
  data.forEach((d, i) => {
    const bh = (d.value / max) * innerH;
    const x = padL + i * barW + barW * 0.15;
    const bw = barW * 0.7;
    const y = padT + innerH - bh;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(bh, 1).toFixed(1)}" fill="${d.color || 'var(--accent)'}" stroke="var(--ink)" stroke-width="2.5"></rect>`;
    if (d.value > 0) bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="11" font-weight="900" text-anchor="middle" fill="var(--ink)">${d.value}</text>`;
    labels += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 8}" font-size="9.5" font-weight="700" text-anchor="middle" fill="var(--ink)">${escapeHtml(d.label.toUpperCase())}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padL}" y1="${padT + innerH}" x2="${w - padR}" y2="${padT + innerH}" stroke="var(--ink)" stroke-width="3" />
    ${bars}${labels}
  </svg>`;
}

function renderStatTiles() {
  const total = entries.length;
  const activeDays = activeDatesSet().size;
  const avg = activeDays ? (total / activeDays).toFixed(1) : '0';
  const tiles = [
    { val: total, label: 'Total things logged' },
    { val: activeDays, label: 'Active days' },
    { val: currentStreak(), label: 'Current streak' },
    { val: longestStreak(), label: 'Longest streak' },
  ];
  document.getElementById('statTiles').innerHTML = tiles.map(t => `
    <div class="stat-tile"><div class="stat-tile-val">${t.val}</div><div class="stat-tile-label">${t.label}</div></div>
  `).join('') + `<div class="stat-tile"><div class="stat-tile-val">${avg}</div><div class="stat-tile-label">Avg per active day</div></div>`;
}

function renderWeekdayChart() {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  entries.forEach(e => { counts[(fromISO(e.date).getDay() + 6) % 7]++; });
  const data = DAY_NAMES.map((name, i) => ({ label: name, value: counts[i] }));
  document.getElementById('weekdayChart').innerHTML = svgBarChart(data);
}

function renderWeeklyTrendChart() {
  const weeks = [];
  let cursor = mondayOf(new Date());
  for (let i = 11; i >= 0; i--) {
    const ws = addDays(cursor, -7 * i);
    const we = addDays(ws, 6);
    const count = entries.filter(e => {
      const d = fromISO(e.date);
      return d >= ws && d <= we;
    }).length;
    weeks.push({ label: `${ws.getDate()}/${ws.getMonth() + 1}`, value: count });
  }
  document.getElementById('weeklyTrendChart').innerHTML = svgBarChart(weeks, { width: 360 });
}

function renderTagChart() {
  const counts = {};
  tags.forEach(t => counts[t.name] = 0);
  let untagged = 0;
  entries.forEach(e => { if (e.tag && counts.hasOwnProperty(e.tag)) counts[e.tag]++; else if (!e.tag) untagged++; });
  const data = tags.map(t => ({ label: t.name, value: counts[t.name], color: t.color }));
  if (untagged) data.push({ label: 'None', value: untagged, color: '#9aa1b0' });
  document.getElementById('tagChart').innerHTML = svgBarChart(data, { width: 360 });
}

const STOPWORDS = new Set(['the','and','for','with','that','this','from','have','was','were','are','you','your','about','into','then','than','just','some','more','also','been','still','over','out','got','get','did','doing','a','an','to','of','in','on','at','is','it','i','my','me','we','our','today','day']);

function renderWordCloud() {
  const freq = {};
  entries.forEach(e => {
    e.text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).forEach(w => {
      if (w.length < 3 || STOPWORDS.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
  });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 24);
  const box = document.getElementById('wordCloud');
  if (!top.length) { box.innerHTML = '<p class="settings-hint">Log a few things to see your word cloud.</p>'; return; }
  const maxC = top[0][1];
  const bgCycle = ['var(--secondary)', 'var(--accent)', 'var(--muted)'];
  const rotCycle = ['rotate(-2deg)', 'rotate(1.5deg)', 'rotate(-1deg)', 'rotate(2deg)'];
  box.innerHTML = top.map(([w, c], i) => {
    const size = 11 + (c / maxC) * 14;
    const style = `font-size:${size.toFixed(0)}px;background:${bgCycle[i % bgCycle.length]};transform:${rotCycle[i % rotCycle.length]}`;
    return `<span class="cloud-chip" style="${style}">${escapeHtml(w)}</span>`;
  }).join('');
}

const BADGES = [
  { id: 'first', icon: '🌱', name: 'First entry', check: () => entries.length >= 1 },
  { id: 'streak7', icon: '🔥', name: '7-day streak', check: () => longestStreak() >= 7 },
  { id: 'streak30', icon: '💪', name: '30-day streak', check: () => longestStreak() >= 30 },
  { id: 'e50', icon: '📚', name: '50 things', check: () => entries.length >= 50 },
  { id: 'e100', icon: '🏆', name: '100 things', check: () => entries.length >= 100 },
  { id: 'e500', icon: '👑', name: '500 things', check: () => entries.length >= 500 },
  { id: 'nightowl', icon: '🦉', name: 'Night owl', check: () => entries.some(e => { const h = new Date(e.createdAt).getHours(); return h >= 23 || h < 4; }) },
  { id: 'earlybird', icon: '🐦', name: 'Early bird', check: () => entries.some(e => new Date(e.createdAt).getHours() < 7) },
  { id: 'weekend', icon: '🎉', name: 'Weekend warrior', check: () => {
    const set = activeDatesSet();
    return Array.from(set).some(iso => {
      const d = fromISO(iso);
      if (d.getDay() !== 6) return false;
      return set.has(toISO(addDays(d, 1)));
    });
  }},
  { id: 'fullweek', icon: '📅', name: 'Full week', check: () => {
    const set = activeDatesSet();
    let cursor = mondayOf(new Date());
    for (let w = 0; w < 20; w++) {
      const ws = addDays(cursor, -7 * w);
      let all = true;
      for (let i = 0; i < 7; i++) if (!set.has(toISO(addDays(ws, i)))) { all = false; break; }
      if (all) return true;
    }
    return false;
  }},
  { id: 'alltags', icon: '🎨', name: 'Tag explorer', check: () => {
    const used = new Set(entries.map(e => e.tag).filter(Boolean));
    return tags.length > 0 && tags.every(t => used.has(t.name));
  }},
];

function renderBadges() {
  document.getElementById('badgeGrid').innerHTML = BADGES.map(b => {
    const unlocked = b.check();
    return `<div class="badge${unlocked ? ' unlocked' : ''}"><div class="badge-icon">${b.icon}</div><div class="badge-name">${b.name}</div></div>`;
  }).join('');
}

function renderStats() {
  renderStatTiles();
  renderWeekdayChart();
  renderWeeklyTrendChart();
  renderTagChart();
  renderWordCloud();
  renderBadges();
}

/* Detect newly-unlocked badges & streak milestones for celebration */
let unlockedBadgeIds = load('worklog.unlockedBadges.v1', []);
function checkMilestones(wasActiveBefore) {
  const newlyUnlocked = BADGES.filter(b => b.check() && !unlockedBadgeIds.includes(b.id));
  if (newlyUnlocked.length) {
    unlockedBadgeIds = Array.from(new Set([...unlockedBadgeIds, ...newlyUnlocked.map(b => b.id)]));
    save('worklog.unlockedBadges.v1', unlockedBadgeIds);
    confetti();
    toast(`Badge unlocked: ${newlyUnlocked[0].icon} ${newlyUnlocked[0].name}`);
  } else if (!wasActiveBefore) {
    const s = currentStreak();
    if (s > 1 && s % 7 === 0) { confetti(); toast(`🔥 ${s}-day streak!`); }
  }
}

/* ---------------------------------------------------------------------
   Settings tab
--------------------------------------------------------------------- */
function renderSettings() {
  const box = document.getElementById('tagEditor');
  box.innerHTML = tags.map((t, i) => `
    <div class="tag-row">
      <input type="color" class="tag-swatch" data-i="${i}" value="${t.color}">
      <input type="text" data-i="${i}" value="${escapeAttr(t.name)}">
      <button data-i="${i}" title="Remove">✕</button>
    </div>
  `).join('');
  box.querySelectorAll('input[type=color]').forEach(inp => {
    inp.addEventListener('change', () => { tags[inp.dataset.i].color = inp.value; persistTags(); });
  });
  box.querySelectorAll('input[type=text]').forEach(inp => {
    inp.addEventListener('change', () => {
      const oldName = tags[inp.dataset.i].name;
      const newName = inp.value.trim() || oldName;
      entries.forEach(e => { if (e.tag === oldName) e.tag = newName; });
      tags[inp.dataset.i].name = newName;
      persistTags(); persistEntries();
    });
  });
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      tags.splice(btn.dataset.i, 1);
      persistTags();
      renderSettings();
    });
  });
}

document.getElementById('addTagBtn').addEventListener('click', () => {
  const nameInp = document.getElementById('newTagName');
  const colorInp = document.getElementById('newTagColor');
  const name = nameInp.value.trim();
  if (!name) return;
  tags.push({ name, color: colorInp.value });
  persistTags();
  nameInp.value = '';
  renderSettings();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = { entries, tags, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `worklog-backup-${todayISO()}.json`;
  a.click();
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.entries)) throw new Error('bad file');
      entries = data.entries;
      tags = Array.isArray(data.tags) && data.tags.length ? data.tags : DEFAULT_TAGS;
      persistEntries(); persistTags();
      toast('Backup imported.');
      refreshCurrentTab();
    } catch (err) {
      toast('Could not read that file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('This deletes everything logged. Are you sure?')) return;
  entries = [];
  tags = DEFAULT_TAGS.slice();
  unlockedBadgeIds = [];
  persistEntries(); persistTags();
  save('worklog.unlockedBadges.v1', unlockedBadgeIds);
  toast('Everything reset.');
  refreshCurrentTab();
});

/* ---------------------------------------------------------------------
   Init
--------------------------------------------------------------------- */
function refreshCurrentTab() {
  const active = document.querySelector('.tab-btn.active');
  switchTab(active ? active.dataset.tab : 'week');
}

applyTheme();
applyLayout();
renderWeek();

/* Keyboard shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'l' || e.key === 'L') openLogModal(todayISO());
  if (e.key === '/') { switchTab('history'); setTimeout(() => document.getElementById('historySearch').focus(), 50); e.preventDefault(); }
});
