/* ════════════════════════════════════════════
   TaskFlow — script.js
════════════════════════════════════════════ */

let allTasks     = [];
let activeFilter = 'all';

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

async function loadTasks() {
  try {
    const res = await fetch('/api/tasks');
    allTasks  = await res.json();
    renderTasks();
    updateStats();
  } catch { showToast('⚠ Could not load tasks.'); }
}

function renderTasks() {
  const list    = document.getElementById('taskList');
  const emptyEl = document.getElementById('emptyState');

  const filtered = allTasks.filter(t => {
    if (activeFilter === 'todo') return !t.completed;
    if (activeFilter === 'done') return  t.completed;
    return true;
  });

  [...list.querySelectorAll('.task-card')].forEach(c => c.remove());

  if (filtered.length === 0) { emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  filtered.forEach((task, i) => list.appendChild(createCard(task, i)));
}

function createCard(task, index) {
  const card = document.createElement('div');
  card.className = `task-card${task.completed ? ' done-card' : ''}`;
  card.dataset.id = task.id;
  card.style.animationDelay = `${index * 0.05}s`;

  card.innerHTML = `
    <div class="checkbox-wrap">
      <div class="checkbox ${task.completed ? 'checked' : ''}"
           onclick="toggleTask(${task.id})"
           title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
        <svg class="checkmark" viewBox="0 0 12 12" fill="none">
          <path d="M1.5 6l3 3 6-6" stroke="white" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="task-body">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-date">${task.created_at}</div>
    </div>
    <div class="task-actions">
      <button class="icon-btn" onclick="openEditModal(${task.id})" title="Edit">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M10.586 1.586a2 2 0 0 1 2.828 2.828L4.828 13H2v-2.828l8.586-8.586z"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <button class="icon-btn del" onclick="deleteTask(${task.id})" title="Delete">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2 4h11M5 4V2h5v2M6 7v5M9 7v5M3 4l.8 9h7.4L12 4"
                stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>`;

  return card;
}

async function addTask() {
  const titleEl = document.getElementById('taskTitle');
  const descEl  = document.getElementById('taskDesc');
  const title   = titleEl.value.trim();
  const desc    = descEl.value.trim();

  if (!title) {
    titleEl.focus();
    titleEl.style.borderColor = 'var(--red)';
    titleEl.style.boxShadow   = '0 0 0 3px rgba(248,113,113,0.2)';
    setTimeout(() => { titleEl.style.borderColor = ''; titleEl.style.boxShadow = ''; }, 1400);
    return;
  }

  const btn = document.getElementById('addBtn');
  btn.disabled = true; btn.textContent = 'Adding…';

  try {
    const res  = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const task = await res.json();
    allTasks.unshift(task);
    titleEl.value = ''; descEl.value = '';
    renderTasks(); updateStats();
    showToast('✓ Task added');
  } catch { showToast('⚠ Failed to add task.'); }
  finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg> Add Task`;
  }
}

async function toggleTask(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  const newState = !task.completed;
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newState }),
    });
    Object.assign(task, await res.json());
    renderTasks(); updateStats();
    showToast(newState ? '✓ Marked complete' : '↺ Marked incomplete');
  } catch { showToast('⚠ Update failed.'); }
}

async function deleteTask(id) {
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) { card.style.transform = 'scale(0.93)'; card.style.opacity = '0'; card.style.transition = 'all 0.25s ease'; }
  await new Promise(r => setTimeout(r, 220));
  try {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    allTasks = allTasks.filter(t => t.id !== id);
    renderTasks(); updateStats();
    showToast('🗑 Task deleted');
  } catch { showToast('⚠ Delete failed.'); }
}

function openEditModal(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('editId').value    = id;
  document.getElementById('editTitle').value = task.title;
  document.getElementById('editDesc').value  = task.description || '';
  document.getElementById('modalBackdrop').classList.add('open');
  setTimeout(() => document.getElementById('editTitle').focus(), 100);
}

function closeModal() { document.getElementById('modalBackdrop').classList.remove('open'); }

async function saveEdit() {
  const id    = parseInt(document.getElementById('editId').value);
  const title = document.getElementById('editTitle').value.trim();
  const desc  = document.getElementById('editDesc').value.trim();
  if (!title) { document.getElementById('editTitle').focus(); return; }
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });
    const updated = await res.json();
    const idx = allTasks.findIndex(t => t.id === id);
    if (idx !== -1) allTasks[idx] = updated;
    closeModal(); renderTasks();
    showToast('✓ Task updated');
  } catch { showToast('⚠ Update failed.'); }
}

function setFilter(btn, filter) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function updateStats() {
  document.getElementById('cnt-total').textContent = allTasks.length;
  document.getElementById('cnt-done').textContent  = allTasks.filter(t => t.completed).length;
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && e.target.id === 'taskTitle') addTask();
  if ((e.key === 'Enter') && (e.ctrlKey || e.metaKey) &&
       document.getElementById('modalBackdrop').classList.contains('open')) saveEdit();
});

loadTasks();
