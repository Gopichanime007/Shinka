(async function () {
  const content = document.getElementById('pageContent');
  const { PROJECT_STATUSES, PRIORITIES } = window.PT_CONST;

  content.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h2>Projects</h2>
        <div class="sub">Track scope, budget, and progress across every engagement.</div>
      </div>
      <button class="btn btn-primary" id="newProjectBtn" data-tooltip="Create a new project"><i class="fa-solid fa-plus"></i>&nbsp; New Project</button>
    </div>

    <div class="toolbar fade-in">
      <div class="toolbar-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="projSearch" placeholder="Search projects or clients\u2026">
      </div>
      <select class="select" id="filterPStatus" data-tooltip="Filter by status"><option value="">All statuses</option></select>
      <select class="select" id="filterPPriority" data-tooltip="Filter by priority"><option value="">All priorities</option></select>
      <span class="toolbar-count" id="projCount"></span>
    </div>

    <div class="project-grid" id="projectGrid"></div>
    <div id="projEmptyState"></div>

    <!-- Project modal -->
    <div class="modal-overlay" id="projModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="projModalTitle">New Project</h3>
          <button class="icon-btn" id="projModalClose"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Project name</label><input class="input" id="p_name" placeholder="e.g. Nova Banking Portal"></div>
          <div class="field"><label>Client</label><input class="input" id="p_client" placeholder="e.g. Meridian Financial"></div>
          <div class="form-row">
            <div class="field"><label>Start date</label><input class="input" type="date" id="p_startDate"></div>
            <div class="field"><label>End date</label><input class="input" type="date" id="p_endDate"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Status</label><select class="select" id="p_status"></select></div>
            <div class="field"><label>Priority</label><select class="select" id="p_priority"></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Budget (USD)</label><input class="input" type="number" min="0" id="p_budget"></div>
            <div class="field"><label>Progress (%)</label><input class="input" type="number" min="0" max="100" id="p_progress"></div>
          </div>
          <div class="field"><label>Team members</label>
            <div id="p_team" class="flex gap-2" style="flex-wrap:wrap;"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="projModalCancel">Cancel</button>
          <button class="btn btn-primary" id="projModalSave"><i class="fa-solid fa-check"></i>&nbsp; Save Project</button>
        </div>
      </div>
    </div>
  `;

  let projects = await PT_STORE.getProjects();
  const tasks = await PT_STORE.getTasks();
  const members = await PT_STORE.getMembers();

  const filterStatus = document.getElementById('filterPStatus');
  const filterPriority = document.getElementById('filterPPriority');
  PROJECT_STATUSES.forEach(s => filterStatus.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
  PRIORITIES.forEach(p => filterPriority.insertAdjacentHTML('beforeend', `<option value="${p}">${p}</option>`));
  const searchInput = document.getElementById('projSearch');

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    return projects.filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q)) &&
      (!filterStatus.value || p.status === filterStatus.value) &&
      (!filterPriority.value || p.priority === filterPriority.value)
    );
  }

  function render() {
    const rows = applyFilters();
    document.getElementById('projCount').textContent = `${rows.length} of ${projects.length} projects`;
    const grid = document.getElementById('projectGrid');
    const empty = document.getElementById('projEmptyState');
    if (!rows.length) {
      grid.innerHTML = '';
      empty.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><h4>No projects match</h4><p>Try a different search or clear your filters.</p></div>`;
      return;
    }
    empty.innerHTML = '';
    grid.innerHTML = rows.map(p => {
      const taskCount = tasks.filter(t => t.project === p.id).length;
      const team = (p.team || []).map(id => members.find(m => m.id === id)).filter(Boolean);
      return `
      <div class="card project-card fade-in" data-id="${p.id}">
        <div class="project-card-top">
          <div>
            <div class="project-card-name">${p.name}</div>
            <div class="project-card-client">${p.client}</div>
          </div>
          <div class="cell-actions" style="opacity:1;">
            <button class="icon-btn btn-sm" data-edit="${p.id}" data-tooltip="Edit project"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn btn-sm" data-del="${p.id}" data-tooltip="Delete project"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
        <div class="flex gap-2 items-center">${PT_UI.statusBadge(p.status)}${PT_UI.priorityFlag(p.priority)}</div>
        <div>
          <div class="proj-bar-track"><div class="proj-bar-fill" style="width:${p.progress}%; background:var(--color-${PT_UI.STATUS_COLOR[p.status] || 'blue'})"></div></div>
          <div class="proj-pct">${p.progress}% complete</div>
        </div>
        <div class="project-card-meta">
          <span data-tooltip="Timeline">${PT_UI.fmtDateShort(p.startDate)} \u2192 ${PT_UI.fmtDateShort(p.endDate)}</span>
          <span data-tooltip="Tasks in this project">${taskCount} tasks</span>
        </div>
        <div class="project-card-footer">
          <div class="project-card-team">${team.map(m => PT_UI.memberAvatar(m)).join('') || '<span class="text-xs text-secondary">Unassigned</span>'}</div>
          <div class="project-card-budget">${PT_UI.fmtCurrency(p.budget)}</div>
        </div>
      </div>`;
    }).join('');
  }

  render();
  [searchInput, filterStatus, filterPriority].forEach(el =>
    el.addEventListener(el === searchInput ? 'input' : 'change', PT_UI.debounce(render, 150))
  );

  // ---------------- Modal ----------------
  const overlay = document.getElementById('projModalOverlay');
  const selStatus = document.getElementById('p_status');
  const selPriority = document.getElementById('p_priority');
  PROJECT_STATUSES.forEach(s => selStatus.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
  PRIORITIES.forEach(p => selPriority.insertAdjacentHTML('beforeend', `<option value="${p}">${p}</option>`));
  const teamWrap = document.getElementById('p_team');
  members.forEach(m => {
    teamWrap.insertAdjacentHTML('beforeend', `
      <label class="flex items-center gap-2 text-xs" style="cursor:pointer; border:1px solid var(--color-border); padding:5px 10px 5px 6px; border-radius: var(--radius-full);">
        <input type="checkbox" class="row-check" value="${m.id}" data-team-check> ${PT_UI.memberAvatar(m)} ${m.name}
      </label>`);
  });

  let editingId = null;
  function openModal(p = null) {
    editingId = p ? p.id : null;
    document.getElementById('projModalTitle').textContent = p ? 'Edit Project' : 'New Project';
    document.getElementById('p_name').value = p?.name || '';
    document.getElementById('p_client').value = p?.client || '';
    document.getElementById('p_startDate').value = p?.startDate || new Date().toISOString().slice(0, 10);
    document.getElementById('p_endDate').value = p?.endDate || '';
    selStatus.value = p?.status || 'Planning';
    selPriority.value = p?.priority || 'Medium';
    document.getElementById('p_budget').value = p?.budget ?? '';
    document.getElementById('p_progress').value = p?.progress ?? 0;
    teamWrap.querySelectorAll('[data-team-check]').forEach(cb => cb.checked = (p?.team || []).includes(cb.value));
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('p_name').focus(), 50);
  }
  function closeModal() { overlay.classList.remove('open'); }

  document.getElementById('newProjectBtn').addEventListener('click', () => openModal());
  document.getElementById('projModalClose').addEventListener('click', closeModal);
  document.getElementById('projModalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('projModalSave').addEventListener('click', async () => {
    const name = document.getElementById('p_name').value.trim();
    const client = document.getElementById('p_client').value.trim();
    if (!name || !client) { PT_UI.toast('error', 'Missing details', 'Project name and client are both required.'); return; }
    const team = [...teamWrap.querySelectorAll('[data-team-check]:checked')].map(cb => cb.value);
    const payload = {
      id: editingId,
      name, client,
      startDate: document.getElementById('p_startDate').value,
      endDate: document.getElementById('p_endDate').value,
      status: selStatus.value,
      priority: selPriority.value,
      budget: Number(document.getElementById('p_budget').value) || 0,
      progress: Math.min(100, Math.max(0, Number(document.getElementById('p_progress').value) || 0)),
      team,
    };
    await PT_STORE.saveProject(payload);
    projects = await PT_STORE.getProjects();
    closeModal();
    render();
    PT_UI.toast('success', editingId ? 'Project updated' : 'Project created', `\u201c${name}\u201d was saved.`);
  });

  document.getElementById('projectGrid').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if (editBtn) {
      openModal(projects.find(p => p.id === editBtn.dataset.edit));
    } else if (delBtn) {
      const p = projects.find(p => p.id === delBtn.dataset.del);
      const taskCount = tasks.filter(t => t.project === p.id).length;
      const ok = await PT_UI.confirmDialog({
        title: 'Delete this project?',
        message: `\u201c${p.name}\u201d and its ${taskCount} associated task${taskCount === 1 ? '' : 's'} will be permanently removed.`,
        confirmLabel: 'Delete project'
      });
      if (ok) {
        await PT_STORE.deleteProject(p.id);
        projects = await PT_STORE.getProjects();
        render();
        PT_UI.toast('success', 'Project deleted');
      }
    }
  });
})();
