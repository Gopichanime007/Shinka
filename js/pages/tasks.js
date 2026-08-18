(async function () {
  const content = document.getElementById('pageContent');
  const currentRole = await PT_STORE.getCurrentRole();
  const showAssignee = currentRole?.label !== 'Technical';

  content.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h2>Tasks</h2>
        <div class="sub">Every work item across your projects, in one place.</div>
      </div>
      <button class="btn btn-primary" id="newTaskBtn" data-tooltip="Create a new task"><i class="fa-solid fa-plus"></i>&nbsp; New Task</button>
    </div>

    <div class="toolbar fade-in">
      <div class="toolbar-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="taskSearch" placeholder="Search tasks\u2026">
      </div>
      <select class="select" id="filterStatus" data-tooltip="Filter by status"><option value="">All statuses</option></select>
      <select class="select" id="filterPriority" data-tooltip="Filter by priority"><option value="">All priorities</option></select>
      <select class="select" id="filterProject" data-tooltip="Filter by project"><option value="">All projects</option></select>
      <span class="toolbar-count" id="taskCount"></span>
    </div>

    <div class="card fade-in">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th></th>
              <th data-sort="name">Task <i class="fa-solid fa-sort"></i></th>
              <th data-sort="project">Project <i class="fa-solid fa-sort"></i></th>
              <th data-sort="status">Status <i class="fa-solid fa-sort"></i></th>
              <th data-sort="priority">Priority <i class="fa-solid fa-sort"></i></th>
              <th style="${showAssignee ? '' : 'display:none;'}">Assignee</th>
              <th data-sort="dueDate">Due <i class="fa-solid fa-sort"></i></th>
              <th>Hours (Est/Act)</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="taskTableBody"></tbody>
        </table>
      </div>
      <div id="taskEmptyState"></div>
    </div>

    <!-- Task modal -->
    <div class="modal-overlay" id="taskModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="taskModalTitle">New Task</h3>
          <button class="icon-btn" id="taskModalClose"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Task name</label><input class="input" id="f_name" placeholder="e.g. Design the settings page" data-tooltip="What needs to get done"></div>
          <div class="field"><label>Description</label><textarea class="textarea" id="f_description" placeholder="Add more detail (optional)"></textarea></div>
          <div class="form-row">
            <div class="field"><label>Project</label><select class="select" id="f_project"></select></div>
            <div class="field" style="${showAssignee ? '' : 'display:none;'}"><label>Assigned to</label><select class="select" id="f_assignedTo"></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Status</label><select class="select" id="f_status"></select></div>
            <div class="field"><label>Priority</label><select class="select" id="f_priority"></select></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Estimated hours</label><input class="input" type="number" min="0" id="f_estimatedHours" data-tooltip="Planned effort in hours"></div>
            <div class="field"><label>Actual hours</label><input class="input" type="number" min="0" id="f_actualHours" data-tooltip="Hours logged so far"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Due date</label><input class="input" type="date" id="f_dueDate"></div>
            <div class="field"><label>Created date</label><input class="input" type="date" id="f_createdDate"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="taskModalCancel">Cancel</button>
          <button class="btn btn-primary" id="taskModalSave"><i class="fa-solid fa-check"></i>&nbsp; Save Task</button>
        </div>
      </div>
    </div>
  `;

  let [tasks, projects, members, statuses, priorities] = await Promise.all([
    PT_STORE.getTasks(),
    PT_STORE.getProjects(),
    PT_STORE.getMembers(),
    PT_STORE.getStatuses(),
    PT_STORE.getPriorities(),
  ]);
  const defaultStatusLabel = statuses.find(s => s.is_default)?.label || statuses[0]?.label || 'Open';
  const defaultPriorityLabel = priorities.find(p => p.label.toLowerCase() === 'medium')?.label || priorities[0]?.label || 'Medium';

  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const filterProject = document.getElementById('filterProject');
  statuses.forEach(s => filterStatus.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(s.label)}">${PT_UI.escapeHtml(s.label)}</option>`
  ));
  priorities.forEach(p => filterPriority.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(p.label)}">${PT_UI.escapeHtml(p.label)}</option>`
  ));
  projects.forEach(p => filterProject.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(p.id)}">${PT_UI.escapeHtml(p.name)}</option>`
  ));

  // Prefill search from ?q= (dashboard search hand-off)
  const params = new URLSearchParams(window.location.search);
  const searchInput = document.getElementById('taskSearch');
  if (params.get('q')) searchInput.value = params.get('q');

  let sortKey = 'dueDate', sortDir = 1;

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    let out = tasks.filter(t =>
      (!q || t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)) &&
      (!filterStatus.value || t.status === filterStatus.value) &&
      (!filterPriority.value || t.priority === filterPriority.value) &&
      (!filterProject.value || t.project === filterProject.value)
    );
    out.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (typeof av === 'number') return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    return out;
  }

  function render() {
    const rows = applyFilters();
    document.getElementById('taskCount').textContent = `${rows.length} of ${tasks.length} tasks`;
    const body = document.getElementById('taskTableBody');
    const empty = document.getElementById('taskEmptyState');
    if (!rows.length) {
      body.innerHTML = '';
      empty.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox"></i><h4>No tasks match</h4><p>Try clearing filters or search to see more tasks.</p></div>`;
      return;
    }
    empty.innerHTML = '';
    body.innerHTML = rows.map(t => {
      const m = members.find(mm => mm.id === t.assignedTo);
      const proj = projects.find(p => p.id === t.project);
      const overActual = t.actualHours > t.estimatedHours;
      return `
      <tr data-id="${PT_UI.escapeHtml(t.id)}">
        <td><div class="task-check ${t.status === 'Completed' ? 'done' : ''}" data-quickcomplete="${PT_UI.escapeHtml(t.id)}" data-tooltip="${t.status === 'Completed' ? 'Completed' : 'Mark complete'}" style="cursor:pointer">${t.status === 'Completed' ? '<i class="fa-solid fa-check"></i>' : ''}</div></td>
        <td>
          <div class="cell-title" data-tooltip="${PT_UI.escapeHtml(t.name)}">${PT_UI.escapeHtml(t.name)}</div>
          <div class="cell-sub">${PT_UI.escapeHtml(t.id)}</div>
        </td>
        <td>${PT_UI.escapeHtml(proj ? proj.name : t.project)}</td>
        <td>${PT_UI.statusBadge(t.status)}</td>
        <td>${PT_UI.priorityFlag(t.priority)}</td>
        <td style="${showAssignee ? '' : 'display:none;'}">${PT_UI.memberAvatar(m)}</td>
        <td>${PT_UI.fmtDateShort(t.dueDate)}</td>
        <td class="hours-cell"><span class="${overActual ? 'over' : ''}">${t.actualHours ?? 0}</span> / ${t.estimatedHours ?? 0}h</td>
        <td>
          <div class="cell-actions">
            <button class="icon-btn btn-sm" data-edit="${PT_UI.escapeHtml(t.id)}" data-tooltip="Edit task"><i class="fa-solid fa-pen"></i></button>
            <button class="icon-btn btn-sm" data-del="${PT_UI.escapeHtml(t.id)}" data-tooltip="Delete task"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  render();
  [searchInput, filterStatus, filterPriority, filterProject].forEach(el =>
    el.addEventListener(el === searchInput ? 'input' : 'change', PT_UI.debounce(render, 150))
  );

  document.querySelectorAll('[data-sort]').forEach(th => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    sortDir = (sortKey === key) ? -sortDir : 1;
    sortKey = key;
    render();
  }));

  // ---------------- Modal ----------------
  const overlay = document.getElementById('taskModalOverlay');
  const selProject = document.getElementById('f_project');
  const selAssignee = document.getElementById('f_assignedTo');
  const selStatus = document.getElementById('f_status');
  const selPriority = document.getElementById('f_priority');
  projects.forEach(p => selProject.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(p.id)}">${PT_UI.escapeHtml(p.name)}</option>`
  ));
  members.forEach(m => selAssignee.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(m.id)}">${PT_UI.escapeHtml(m.name)}</option>`
  ));
  statuses.forEach(s => selStatus.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(s.label)}">${PT_UI.escapeHtml(s.label)}</option>`
  ));
  priorities.forEach(p => selPriority.insertAdjacentHTML(
    'beforeend',
    `<option value="${PT_UI.escapeHtml(p.label)}">${PT_UI.escapeHtml(p.label)}</option>`
  ));

  let editingId = null;
  function openModal(task = null) {
    editingId = task ? task.id : null;
    document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'New Task';
    document.getElementById('f_name').value = task?.name || '';
    document.getElementById('f_description').value = task?.description || '';
    selProject.value = task?.project || projects[0]?.id || '';
    selAssignee.value = task?.assignedTo || members[0]?.id || '';
    selStatus.value = task?.status || defaultStatusLabel;
    selPriority.value = task?.priority || defaultPriorityLabel;
    document.getElementById('f_estimatedHours').value = task?.estimatedHours ?? '';
    document.getElementById('f_actualHours').value = task?.actualHours ?? 0;
    document.getElementById('f_dueDate').value = task?.dueDate || '';
    document.getElementById('f_createdDate').value = task?.createdDate || new Date().toISOString().slice(0, 10);
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('f_name').focus(), 50);
  }
  function closeModal() { overlay.classList.remove('open'); }

  document.getElementById('newTaskBtn').addEventListener('click', () => openModal());
  document.getElementById('taskModalClose').addEventListener('click', closeModal);
  document.getElementById('taskModalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('taskModalSave').addEventListener('click', async () => {
    const name = document.getElementById('f_name').value.trim();
    if (!name) { PT_UI.toast('error', 'Task name is required', 'Give this task a short, clear name.'); return; }
    const payload = {
      id: editingId,
      name,
      description: document.getElementById('f_description').value.trim(),
      project: selProject.value,
      assignedTo: showAssignee ? selAssignee.value : null,
      status: selStatus.value,
      priority: selPriority.value,
      estimatedHours: Number(document.getElementById('f_estimatedHours').value) || 0,
      actualHours: Number(document.getElementById('f_actualHours').value) || 0,
      dueDate: document.getElementById('f_dueDate').value,
      createdDate: document.getElementById('f_createdDate').value,
    };
    await PT_STORE.saveTask(payload);
    tasks = await PT_STORE.getTasks();
    closeModal();
    render();
    PPT_UI.toast(
      'success',
      editingId ? 'Task updated' : 'Task created',
      `“${PT_UI.escapeHtml(name)}” was saved.`
    );
  });

  // ---------------- Row actions (delegated) ----------------
  document.getElementById('taskTableBody').addEventListener('click', async (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    const quick = e.target.closest('[data-quickcomplete]');
    if (editBtn) {
      const t = tasks.find(t => t.id === editBtn.dataset.edit);
      openModal(t);
    } else if (delBtn) {
      const t = tasks.find(t => t.id === delBtn.dataset.del);
      const ok = await PT_UI.confirmDialog({
        title: 'Delete this task?',
        message: `“${PT_UI.escapeHtml(t.name)}” will be permanently removed. This can't be undone.`,
        confirmLabel: 'Delete task'
      });
      if (ok) {
        await PT_STORE.deleteTask(t.id);
        tasks = await PT_STORE.getTasks();
        render();
        PT_UI.toast('success', 'Task deleted');
      }
    } else if (quick) {
      const t = tasks.find(t => t.id === quick.dataset.quickcomplete);
      const newStatus = t.status === 'Completed' ? defaultStatusLabel : 'Completed';
      await PT_STORE.updateTaskStatus(t.id, newStatus);
      tasks = await PT_STORE.getTasks();
      render();
      PT_UI.toast('success', newStatus === 'Completed' ? 'Task completed \u{1F389}' : 'Task reopened');
    }
  });
})();
