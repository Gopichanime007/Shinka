(async function () {
  const content = document.getElementById('pageContent');
  const currentRole = await PT_STORE.getCurrentRole();
  const showAssignee = currentRole?.label !== 'Technical';

  content.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h2>Kanban Board</h2>
        <div class="sub">Drag cards across columns to update status.</div>
      </div>
      <button class="btn btn-primary" id="newTaskBtn"><i class="fa-solid fa-plus"></i>&nbsp; New Task</button>
    </div>

    <div class="toolbar fade-in">
      <select class="select" id="filterKProject" data-tooltip="Filter by project"><option value="">All projects</option></select>
      <select class="select" id="filterKAssignee" data-tooltip="Filter by assignee" style="${showAssignee ? '' : 'display:none;'}"><option value="">Everyone</option></select>
      <span class="toolbar-count" id="kanbanCount"></span>
    </div>

    <div class="kanban-board fade-in" id="kanbanBoard"></div>

    <!-- Task modal (shared shape with Tasks page) -->
    <div class="modal-overlay" id="taskModalOverlay">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 id="taskModalTitle">New Task</h3>
          <button class="icon-btn" id="taskModalClose"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Task name</label><input class="input" id="f_name" placeholder="e.g. Design the settings page"></div>
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
            <div class="field"><label>Estimated hours</label><input class="input" type="number" min="0" id="f_estimatedHours"></div>
            <div class="field"><label>Actual hours</label><input class="input" type="number" min="0" id="f_actualHours"></div>
          </div>
          <div class="field"><label>Due date</label><input class="input" type="date" id="f_dueDate"></div>
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

  const filterProject = document.getElementById('filterKProject');
  const filterAssignee = document.getElementById('filterKAssignee');
  projects.forEach(p => filterProject.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`));
  members.forEach(m => filterAssignee.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.name}</option>`));

  function filteredTasks() {
    return tasks.filter(t =>
      (!filterProject.value || t.project === filterProject.value) &&
      (showAssignee ? (!filterAssignee.value || t.assignedTo === filterAssignee.value) : true)
    );
  }

  function dueClass(t) {
    if (t.status === 'Completed' || !t.dueDate) return '';
    const d = PT_UI.daysUntil(t.dueDate);
    if (d < 0) return 'overdue';
    if (d <= 3) return 'soon';
    return '';
  }
  function dueLabel(t) {
    if (!t.dueDate) return 'No due date';
    const d = PT_UI.daysUntil(t.dueDate);
    if (t.status === 'Completed') return PT_UI.fmtDateShort(t.dueDate);
    if (d < 0) return `${Math.abs(d)}d overdue`;
    if (d === 0) return 'Due today';
    return PT_UI.fmtDateShort(t.dueDate);
  }

  function renderBoard() {
    const rows = filteredTasks();
    document.getElementById('kanbanCount').textContent = `${rows.length} of ${tasks.length} tasks`;
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = statuses.map(statusObj => {
      const status = statusObj.label;
      const colTasks = rows.filter(t => t.status === status);
      const color = PT_UI.STATUS_COLOR[status] || 'slate';
      return `
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-dot" style="background:var(--color-${color})"></span>
          <span class="kanban-col-title">${status}</span>
          <span class="kanban-col-count">${colTasks.length}</span>
          <button class="kanban-col-add" data-addto="${status}" data-tooltip="Add task to ${status}"><i class="fa-solid fa-plus"></i></button>
        </div>
        <div class="kanban-col-body" data-status="${status}">
          ${colTasks.length ? colTasks.map(t => cardHtml(t)).join('') : `<div class="kanban-empty-col">No tasks here</div>`}
        </div>
      </div>`;
    }).join('');
    wireDragAndDrop();
    wireCardClicks();
  }

  function cardHtml(t) {
    const m = members.find(mm => mm.id === t.assignedTo);
    const proj = projects.find(p => p.id === t.project);
    return `
    <div class="kanban-card" draggable="true" data-id="${t.id}">
      <div class="kanban-card-project">${proj ? proj.name : t.project}</div>
      <div class="kanban-card-title">${t.name}</div>
      <div class="flex items-center gap-2">${PT_UI.priorityFlag(t.priority)}</div>
      <div class="kanban-card-footer">
        <span class="kanban-due-pill ${dueClass(t)}">${dueLabel(t)}</span>
        ${showAssignee ? PT_UI.memberAvatar(m) : ''}
      </div>
    </div>`;
  }

  function wireDragAndDrop() {
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
    document.querySelectorAll('.kanban-col-body').forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const newStatus = col.dataset.status;
        const t = tasks.find(t => t.id === id);
        if (!t || t.status === newStatus) return;
        await PT_STORE.updateTaskStatus(id, newStatus);
        tasks = await PT_STORE.getTasks();
        renderBoard();
        PT_UI.toast('success', 'Task moved', `\u201c${t.name}\u201d is now in ${newStatus}.`);
      });
    });
  }

  function wireCardClicks() {
    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => openModal(tasks.find(t => t.id === card.dataset.id)));
    });
  }

  document.getElementById('kanbanBoard').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-addto]');
    if (addBtn) openModal(null, addBtn.dataset.addto);
  });

  [filterProject, filterAssignee].forEach(el => el.addEventListener('change', renderBoard));

  // ---------------- Modal (shared pattern with tasks.js) ----------------
  const overlay = document.getElementById('taskModalOverlay');
  const selProject = document.getElementById('f_project');
  const selAssignee = document.getElementById('f_assignedTo');
  const selStatus = document.getElementById('f_status');
  const selPriority = document.getElementById('f_priority');
  projects.forEach(p => selProject.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`));
  members.forEach(m => selAssignee.insertAdjacentHTML('beforeend', `<option value="${m.id}">${m.name}</option>`));
  statuses.forEach(s => selStatus.insertAdjacentHTML('beforeend', `<option value="${s.label}">${s.label}</option>`));
  priorities.forEach(p => selPriority.insertAdjacentHTML('beforeend', `<option value="${p.label}">${p.label}</option>`));

  let editingId = null;
  function openModal(task, defaultStatus) {
    editingId = task ? task.id : null;
    document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'New Task';
    document.getElementById('f_name').value = task?.name || '';
    document.getElementById('f_description').value = task?.description || '';
    selProject.value = task?.project || projects[0]?.id || '';
    selAssignee.value = task?.assignedTo || members[0]?.id || '';
    selStatus.value = task?.status || defaultStatus || defaultStatusLabel;
    selPriority.value = task?.priority || 'Medium';
    document.getElementById('f_estimatedHours').value = task?.estimatedHours ?? '';
    document.getElementById('f_actualHours').value = task?.actualHours ?? 0;
    document.getElementById('f_dueDate').value = task?.dueDate || '';
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('f_name').focus(), 50);
  }
  function closeModal() { overlay.classList.remove('open'); }
  document.getElementById('newTaskBtn').addEventListener('click', () => openModal(null));
  document.getElementById('taskModalClose').addEventListener('click', closeModal);
  document.getElementById('taskModalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('taskModalSave').addEventListener('click', async () => {
    const name = document.getElementById('f_name').value.trim();
    if (!name) { PT_UI.toast('error', 'Task name is required'); return; }
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
    };
    await PT_STORE.saveTask(payload);
    tasks = await PT_STORE.getTasks();
    closeModal();
    renderBoard();
    PT_UI.toast('success', editingId ? 'Task updated' : 'Task created', `\u201c${name}\u201d was saved.`);
  });

  renderBoard();
})();
