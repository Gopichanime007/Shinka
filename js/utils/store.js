/* ============================================
   DATA STORE
   A lightweight local-store backend for tasks, projects,
   statuses, priorities, time entries, and user settings.
   ============================================ */

const DB_KEY = 'pt_database_v2';
const LEGACY_DB_KEY = 'pt_database_v1';
const CURRENT_VERSION = 4;

const DEFAULT_STATUSES = [
  { status_id: 'ST-01', label: 'Open', sort_order: 1, color: 'blue', is_default: true, is_terminal: false },
  { status_id: 'ST-02', label: 'In Progress', sort_order: 2, color: 'orange', is_default: false, is_terminal: false },
  { status_id: 'ST-03', label: 'UAT/User Testing', sort_order: 3, color: 'purple', is_default: false, is_terminal: true },
  { status_id: 'ST-04', label: 'Awaiting Client Response', sort_order: 4, color: 'red', is_default: false, is_terminal: true },
  { status_id: 'ST-05', label: 'Hold', sort_order: 5, color: 'slate', is_default: false, is_terminal: true },
  { status_id: 'ST-06', label: 'Completed', sort_order: 6, color: 'green', is_default: false, is_terminal: true },
];

const DEFAULT_PRIORITIES = [
  { priority_id: 'PR-01', label: 'Low', sort_order: 1 },
  { priority_id: 'PR-02', label: 'Medium', sort_order: 2 },
  { priority_id: 'PR-03', label: 'High', sort_order: 3 },
  { priority_id: 'PR-04', label: 'Urgent', sort_order: 4 },
];

const DEFAULT_ROLES = [
  { role_id: 'RL-01', label: 'Technical', sort_order: 1, is_default: true },
  { role_id: 'RL-02', label: 'Technical Lead', sort_order: 2, is_default: false },
];

const PROJECT_STATUS_OPTIONS = ['Planning', 'Active', 'On Hold', 'Completed'];

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function seedDatabase() {
  const defaultRole = DEFAULT_ROLES.find(r => r.is_default) || DEFAULT_ROLES[0];
  return {
    version: CURRENT_VERSION,
    members: [],
    projects: [],
    statuses: DEFAULT_STATUSES,
    priorities: DEFAULT_PRIORITIES,
    roles: DEFAULT_ROLES,
    tasks: [],
    time_entries: [],
    user_settings: { reminder_interval_minutes: 30, notifications_enabled: true, role_id: defaultRole.role_id },
    activity: [],
  };
}

const STATUS_ALIAS_MAP = {
  Backlog: 'Open',
  'To Do': 'Open',
  'In Progress': 'In Progress',
  'In Review': 'UAT/User Testing',
  Blocked: 'Hold',
  Completed: 'Completed',
};

function normalizeProject(project) {
  const project_id = project.project_id || project.id || uid('PRJ');
  return {
    ...project,
    project_id,
    id: project_id,
    project_name: project.project_name || project.name || project.title || project.project_name || '',
    external_pid: project.external_pid ?? project.externalPID ?? project.external_pid ?? '',
    is_active: project.is_active ?? project.active ?? project.is_active ?? true,
    client: project.client || '',
    status: project.status || project.status_label || 'Active',
    priority: project.priority || 'Medium',
    progress: project.progress ?? 0,
    budget: project.budget ?? 0,
    startDate: project.startDate || project.start_date || project.start || '',
    endDate: project.endDate || project.end_date || project.end || '',
    team: Array.isArray(project.team) ? project.team : project.team ? [project.team] : [],
  };
}

function normalizeTask(task, statuses, priorities) {
  const task_id = task.task_id || task.id || uid('TSK');
  const ticket_id = task.ticket_id || task.ticketId || task.id || `TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const ticket_description = task.ticket_description || task.description || task.name || '';
  let statusLabel = task.status || task.status_label || 'Open';
  if (!statuses.some(s => s.label === statusLabel)) {
    statusLabel = STATUS_ALIAS_MAP[statusLabel] || statusLabel;
  }
  const priorityLabel = task.priority || task.priority_label || 'Medium';
  const status = statuses.find(s => s.status_id === task.status_id || s.label === statusLabel) || statuses[0];
  const priority = priorities.find(p => p.priority_id === task.priority_id || p.label === priorityLabel) || priorities[1];
  return {
    task_id,
    id: task_id,
    ticket_id,
    ticket_description,
    project_id: task.project_id || task.project || '',
    status_id: status.status_id,
    priority_id: priority.priority_id,
    created_at: task.created_at || task.created_at || task.createdDate || new Date().toISOString(),
    updated_at: task.updated_at || task.updated_at || task.createdDate || new Date().toISOString(),
    assignedTo: task.assignedTo || null,
    estimatedHours: task.estimatedHours ?? 0,
    actualHours: task.actualHours ?? 0,
    dueDate: task.dueDate || task.due_date || task.createdDate || '',
    note: task.note || '',
  };
}

function formatIsoDate(iso) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

class Store {
  constructor() {
    this._data = null;
  }

  async _load() {
    if (this._data) return this._data;
    let raw = localStorage.getItem(DB_KEY);
    let fromLegacy = false;
    if (!raw) {
      raw = localStorage.getItem(LEGACY_DB_KEY);
      fromLegacy = !!raw;
    }
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (!d.version || d.version < CURRENT_VERSION) {
          this._data = this._migrateFromLegacy(d);
          this._persist();
          if (fromLegacy) localStorage.removeItem(LEGACY_DB_KEY);
          return this._data;
        }
        this._data = d;
        if (fromLegacy) {
          this._persist();
          localStorage.removeItem(LEGACY_DB_KEY);
        }
        return this._data;
      } catch (e) {
        // ignored, will reseed
      }
    }
    this._data = seedDatabase();
    this._persist();
    return this._data;
  }

  _persist() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  }

  _looksLikeDemoData(oldData) {
    return Array.isArray(oldData.members) && oldData.members.some(m => m.name === 'Ava Chen') &&
      Array.isArray(oldData.projects) && oldData.projects.some(p => p.project_name === 'Nova Banking Portal') &&
      Array.isArray(oldData.tasks) && oldData.tasks.some(t => t.ticket_description === 'Design onboarding flow');
  }

  _migrateFromLegacy(oldData) {
    const statuses = Array.isArray(oldData.statuses) && oldData.statuses.length ? oldData.statuses : DEFAULT_STATUSES;
    const priorities = Array.isArray(oldData.priorities) && oldData.priorities.length ? oldData.priorities : DEFAULT_PRIORITIES;
    const roles = Array.isArray(oldData.roles) && oldData.roles.length ? oldData.roles : DEFAULT_ROLES;
    const defaultRole = roles.find(r => r.is_default) || roles[0];
    const user_settings = { ...{ reminder_interval_minutes: 30, notifications_enabled: true, role_id: defaultRole.role_id }, ...(oldData.user_settings || {}) };

    if (oldData.version === 2 && this._looksLikeDemoData(oldData)) {
      return {
        version: CURRENT_VERSION,
        members: [],
        projects: [],
        statuses,
        priorities,
        roles,
        tasks: [],
        time_entries: [],
        user_settings,
        activity: [],
      };
    }

    const members = oldData.members || [];
    const projects = (oldData.projects || []).map(p => normalizeProject(p));
    const tasks = (oldData.tasks || []).map(t => normalizeTask(t, statuses, priorities));
    const activity = oldData.activity || [];
    const time_entries = oldData.time_entries || [];

    return {
      version: CURRENT_VERSION,
      members,
      projects,
      statuses,
      priorities,
      roles,
      tasks,
      time_entries,
      user_settings,
      activity,
    };
  }

  _getStatusById(d, id) {
    return d.statuses.find(s => s.status_id === id) || d.statuses.find(s => s.label === id);
  }

  _getPriorityById(d, id) {
    return d.priorities.find(p => p.priority_id === id) || d.priorities.find(p => p.label === id);
  }

  _resolveStatusId(d, value) {
    if (!value) return d.statuses.find(s => s.is_default)?.status_id || d.statuses[0]?.status_id;
    const found = d.statuses.find(s => s.status_id === value || s.label === value);
    return found ? found.status_id : d.statuses[0]?.status_id;
  }

  _resolvePriorityId(d, value) {
    if (!value) return d.priorities[1]?.priority_id || d.priorities[0]?.priority_id;
    const found = d.priorities.find(p => p.priority_id === value || p.label === value);
    return found ? found.priority_id : d.priorities[1]?.priority_id || d.priorities[0]?.priority_id;
  }

  _attachTaskMeta(task, d) {
    const status = this._getStatusById(d, task.status_id);
    const priority = this._getPriorityById(d, task.priority_id);
    const project = d.projects.find(p => p.project_id === task.project_id);
    const activeEntry = d.time_entries.find(entry => entry.task_id === task.task_id && !entry.end_time);
    return {
      ...task,
      id: task.task_id,
      name: task.ticket_description,
      description: task.ticket_description,
      ticket_id: task.ticket_id,
      ticket_description: task.ticket_description,
      project: task.project_id,
      project_id: task.project_id,
      project_name: project?.project_name || task.project_id,
      status: status?.label || '',
      status_id: status?.status_id,
      priority: priority?.label || '',
      priority_id: priority?.priority_id,
      createdDate: formatIsoDate(task.created_at),
      updatedDate: formatIsoDate(task.updated_at),
      activeTimer: activeEntry ? { ...activeEntry } : null,
    };
  }

  async getMembers() { const d = await this._load(); return d.members; }
  async getMember(id) { const d = await this._load(); return d.members.find(m => m.id === id); }

  async getStatuses() { const d = await this._load(); return [...d.statuses].sort((a, b) => a.sort_order - b.sort_order); }
  async getStatus(id) { const d = await this._load(); return this._getStatusById(d, id); }
  async saveStatus(status) {
    const d = await this._load();
    if (status.status_id) {
      const idx = d.statuses.findIndex(s => s.status_id === status.status_id);
      if (idx > -1) { d.statuses[idx] = { ...d.statuses[idx], ...status }; this._persist(); return d.statuses[idx]; }
    }
    const status_id = status.status_id || uid('ST');
    const sort_order = status.sort_order ?? (d.statuses.length + 1);
    const newStatus = { status_id, label: status.label || 'New Status', sort_order, color: status.color || 'slate', is_default: !!status.is_default, is_terminal: !!status.is_terminal };
    if (newStatus.is_default) {
      d.statuses.forEach(s => s.is_default = false);
    }
    d.statuses.push(newStatus);
    this._persist();
    return newStatus;
  }

  async deleteStatus(status_id) {
    const d = await this._load();
    const status = this._getStatusById(d, status_id);
    if (!status || status.is_default) return false;
    d.statuses = d.statuses.filter(s => s.status_id !== status.status_id);
    const defaultStatus = d.statuses.find(s => s.is_default) || d.statuses[0];
    d.tasks.forEach(task => {
      if (task.status_id === status.status_id) task.status_id = defaultStatus.status_id;
    });
    this._persist();
    return true;
  }

  async reorderStatuses(order) {
    const d = await this._load();
    d.statuses = order.map(status_id => {
      const status = d.statuses.find(s => s.status_id === status_id);
      return status ? { ...status } : null;
    }).filter(Boolean).map((s, idx) => ({ ...s, sort_order: idx + 1 }));
    this._persist();
  }

  async getPriorities() { const d = await this._load(); return [...d.priorities].sort((a, b) => a.sort_order - b.sort_order); }
  async getPriority(id) { const d = await this._load(); return this._getPriorityById(d, id); }
  async savePriority(priority) {
    const d = await this._load();
    if (priority.priority_id) {
      const idx = d.priorities.findIndex(p => p.priority_id === priority.priority_id);
      if (idx > -1) { d.priorities[idx] = { ...d.priorities[idx], ...priority }; this._persist(); return d.priorities[idx]; }
    }
    const priority_id = priority.priority_id || uid('PR');
    const sort_order = priority.sort_order ?? (d.priorities.length + 1);
    const newPriority = { priority_id, label: priority.label || 'New Priority', sort_order };
    d.priorities.push(newPriority);
    this._persist();
    return newPriority;
  }

  async deletePriority(priority_id) {
    const d = await this._load();
    const priority = this._getPriorityById(d, priority_id);
    if (!priority) return false;
    d.priorities = d.priorities.filter(p => p.priority_id !== priority.priority_id);
    const fallback = d.priorities[0];
    d.tasks.forEach(task => {
      if (task.priority_id === priority.priority_id) task.priority_id = fallback?.priority_id || task.priority_id;
    });
    this._persist();
    return true;
  }

  async reorderPriorities(order) {
    const d = await this._load();
    d.priorities = order.map(priority_id => {
      const priority = d.priorities.find(p => p.priority_id === priority_id);
      return priority ? { ...priority } : null;
    }).filter(Boolean).map((p, idx) => ({ ...p, sort_order: idx + 1 }));
    this._persist();
  }

  async getRoles() { const d = await this._load(); return [...d.roles].sort((a, b) => a.sort_order - b.sort_order); }
  async getRole(id) { const d = await this._load(); return d.roles.find(r => r.role_id === id || r.label === id); }
  async saveRole(role) {
    const d = await this._load();
    if (role.role_id) {
      const idx = d.roles.findIndex(r => r.role_id === role.role_id);
      if (idx > -1) { d.roles[idx] = { ...d.roles[idx], ...role }; this._persist(); return d.roles[idx]; }
    }
    const role_id = role.role_id || uid('RL');
    const sort_order = role.sort_order ?? (d.roles.length + 1);
    const newRole = { role_id, label: role.label || 'New Role', sort_order, is_default: !!role.is_default };
    if (newRole.is_default) {
      d.roles.forEach(r => r.is_default = false);
    }
    d.roles.push(newRole);
    this._persist();
    return newRole;
  }

  async deleteRole(role_id) {
    const d = await this._load();
    const role = d.roles.find(r => r.role_id === role_id || r.label === role_id);
    if (!role || role.is_default) return false;
    d.roles = d.roles.filter(r => r.role_id !== role.role_id);
    const defaultRole = d.roles.find(r => r.is_default) || d.roles[0];
    if (!d.roles.some(r => r.is_default) && defaultRole) defaultRole.is_default = true;
    if (d.user_settings.role_id === role.role_id) {
      d.user_settings.role_id = defaultRole?.role_id || d.roles[0]?.role_id;
    }
    this._persist();
    return true;
  }

  async reorderRoles(order) {
    const d = await this._load();
    d.roles = order.map(role_id => {
      const role = d.roles.find(r => r.role_id === role_id);
      return role ? { ...role } : null;
    }).filter(Boolean).map((r, idx) => ({ ...r, sort_order: idx + 1 }));
    this._persist();
  }

  async getProjects() {
    const d = await this._load();
    return d.projects.map(p => ({ ...p, id: p.project_id, name: p.project_name }));
  }
  async getProject(id) { const d = await this._load(); return d.projects.find(p => p.project_id === id || p.id === id); }
  async saveProject(project) {
    const d = await this._load();
    const normalized = normalizeProject(project);
    if (normalized.project_id) {
      const idx = d.projects.findIndex(p => p.project_id === normalized.project_id);
      if (idx > -1) { d.projects[idx] = { ...d.projects[idx], ...normalized }; this._persist(); return d.projects[idx]; }
    }
    normalized.project_id = normalized.project_id || uid('PRJ');
    normalized.id = normalized.project_id;
    d.projects.unshift(normalized);
    this._persist();
    return normalized;
  }

  async deleteProject(id) {
    const d = await this._load();

    const taskIds = d.tasks
      .filter(task => task.project_id === id)
      .map(task => task.task_id);

    d.projects = d.projects.filter(
      project => project.project_id !== id && project.id !== id
    );

    d.tasks = d.tasks.filter(
      task => task.project_id !== id
    );

    d.time_entries = d.time_entries.filter(
      entry => !taskIds.includes(entry.task_id)
    );

    this._persist();
  }

  async getTasks() {
    const d = await this._load();
    return d.tasks.map(task => this._attachTaskMeta(task, d));
  }

  async getTask(id) {
    const d = await this._load();
    const task = d.tasks.find(t => t.task_id === id || t.id === id || t.ticket_id === id);
    return task ? this._attachTaskMeta(task, d) : null;
  }

  _handleTimerForStatus(d, task, statusId) {
    const status = this._getStatusById(d, statusId);
    if (!status) return;
    if (status.label === 'In Progress') {
      this._pauseRunningTimer(d);
      const active = d.time_entries.find(entry => !entry.end_time);
      if (!active || active.task_id !== task.task_id) {
        d.time_entries.unshift({
          entry_id: uid('ENT'),
          task_id: task.task_id,
          start_time: new Date().toISOString(),
          end_time: null,
          duration_seconds: 0,
          source: 'timer',
          note: '',
        });
      }
    } else if (status.is_terminal) {
      this._pauseRunningTimer(d);
    }
  }

  _pauseRunningTimer(d) {
    const activeEntry = d.time_entries.find(entry => !entry.end_time);
    if (!activeEntry) return;
    activeEntry.end_time = new Date().toISOString();
    activeEntry.duration_seconds = Math.round((new Date(activeEntry.end_time) - new Date(activeEntry.start_time)) / 1000);
  }

  async saveTask(task) {
    const d = await this._load();
    const normalized = normalizeTask(task, d.statuses, d.priorities);

    normalized.updated_at = new Date().toISOString();

    if (normalized.id) {
      const idx = d.tasks.findIndex(
        t => t.task_id === normalized.id || t.id === normalized.id
      );

      if (idx > -1) {
        const existingTask = d.tasks[idx];
        const previousStatusId = existingTask.status_id;
        const nextStatusId = normalized.status_id;

        d.tasks[idx] = {
          ...existingTask,
          ...normalized,
        };

        if (previousStatusId !== nextStatusId) {
          this._handleTimerForStatus(
            d,
            d.tasks[idx],
            nextStatusId
          );
        }

        this._persist();

        return this._attachTaskMeta(
          d.tasks[idx],
          d
        );
      }
    }

    normalized.task_id = normalized.task_id || uid('TSK');
    normalized.id = normalized.task_id;

    d.tasks.unshift(normalized);

    // Start the timer immediately when a new task
    // is created with the In Progress status.
    this._handleTimerForStatus(
      d,
      normalized,
      normalized.status_id
    );

    this._persist();

    return this._attachTaskMeta(
      normalized,
      d
    );
  }

  async updateTaskStatus(id, status) {
    const d = await this._load();
    const task = d.tasks.find(t => t.task_id === id || t.id === id);
    if (!task) return null;
    const status_id = this._resolveStatusId(d, status);
    task.status_id = status_id;
    task.updated_at = new Date().toISOString();
    this._handleTimerForStatus(d, task, status_id);
    this._persist();
    return this._attachTaskMeta(task, d);
  }

  async deleteTask(id) {
    const d = await this._load();

    const task = d.tasks.find(
      task => task.task_id === id || task.id === id
    );

    if (!task) return;

    const taskId = task.task_id;

    d.tasks = d.tasks.filter(
      task => task.task_id !== id && task.id !== id
    );

    d.time_entries = d.time_entries.filter(
      entry => entry.task_id !== taskId
    );

    this._persist();
  }

  async getTimeEntries(task_id) {
    const d = await this._load();
    return d.time_entries.filter(e => e.task_id === task_id).map(e => ({ ...e }));
  }

  async getActiveTimeEntry() {
    const d = await this._load();
    return d.time_entries.find(e => !e.end_time) || null;
  }

  async pauseTimer(task_id) {
    const d = await this._load();
    const entry = d.time_entries.find(e => e.task_id === task_id && !e.end_time);
    if (!entry) return null;
    entry.end_time = new Date().toISOString();
    entry.duration_seconds = Math.round((new Date(entry.end_time) - new Date(entry.start_time)) / 1000);
    this._persist();
    return { ...entry };
  }

  async resumeTimer(task_id) {
    const d = await this._load();
    this._pauseRunningTimer(d);
    const entry = {
      entry_id: uid('ENT'),
      task_id,
      start_time: new Date().toISOString(),
      end_time: null,
      duration_seconds: 0,
      source: 'timer',
      note: '',
    };
    d.time_entries.unshift(entry);
    this._persist();
    return entry;
  }

  async saveTimeEntry(entry) {
    const d = await this._load();
    const normalized = {
      entry_id: entry.entry_id || uid('ENT'),
      task_id: entry.task_id,
      start_time: entry.start_time || new Date().toISOString(),
      end_time: entry.end_time || null,
      source: entry.source || 'manual',
      note: entry.note || '',
      duration_seconds: 0,
    };
    if (normalized.end_time) {
      normalized.duration_seconds = Math.round((new Date(normalized.end_time) - new Date(normalized.start_time)) / 1000);
    } else if (entry.duration_seconds) {
      normalized.duration_seconds = entry.duration_seconds;
      normalized.end_time = new Date(new Date(normalized.start_time).getTime() + normalized.duration_seconds * 1000).toISOString();
    }

    const idx = d.time_entries.findIndex(e => e.entry_id === normalized.entry_id);
    if (idx > -1) {
      d.time_entries[idx] = { ...d.time_entries[idx], ...normalized };
    } else {
      d.time_entries.unshift(normalized);
    }
    this._persist();
    return normalized;
  }

  async getUserSettings() {
    const d = await this._load();
    return { ...d.user_settings };
  }

  async saveUserSettings(settings) {
    const d = await this._load();
    d.user_settings = { ...d.user_settings, ...settings };
    this._persist();
    return { ...d.user_settings };
  }

  async getCurrentRole() {
    const d = await this._load();
    return d.roles.find(r => r.role_id === d.user_settings.role_id) || d.roles.find(r => r.is_default) || d.roles[0];
  }

  async exportDatabase() {
    const d = await this._load();
    return JSON.parse(JSON.stringify(d));
  }

  async importDatabase(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid backup file');
    }
    let data = payload;
    if (data.version && data.version < CURRENT_VERSION) {
      data = this._migrateFromLegacy(data);
    }

    const base = seedDatabase();
    const statuses = Array.isArray(data.statuses) && data.statuses.length ? data.statuses : base.statuses;
    const priorities = Array.isArray(data.priorities) && data.priorities.length ? data.priorities : base.priorities;
    const roles = Array.isArray(data.roles) && data.roles.length ? data.roles : base.roles;
    const defaultRole = roles.find(r => r.is_default) || roles[0];

    const members = Array.isArray(data.members) ? data.members : base.members;
    const projects = Array.isArray(data.projects) ? data.projects.map(normalizeProject) : base.projects;
    const tasks = Array.isArray(data.tasks) ? data.tasks.map(t => normalizeTask(t, statuses, priorities)) : base.tasks;
    const activity = Array.isArray(data.activity) ? data.activity : base.activity;
    const time_entries = Array.isArray(data.time_entries) ? data.time_entries : base.time_entries;
    const user_settings = { ...base.user_settings, ...(data.user_settings || {}) };
    if (!roles.some(r => r.role_id === user_settings.role_id)) {
      user_settings.role_id = defaultRole.role_id;
    }

    const merged = {
      ...base,
      version: CURRENT_VERSION,
      members,
      projects,
      statuses,
      priorities,
      roles,
      tasks,
      activity,
      time_entries,
      user_settings,
    };

    this._data = merged;
    this._persist();
    return merged;
  }

  async getActivity(limit = 8) { const d = await this._load(); return d.activity.slice(0, limit); }
  async logActivity(entry) {
    const d = await this._load();
    d.activity.unshift({ id: uid('ACT'), time: new Date().toISOString().slice(0, 16), ...entry });
    this._persist();
  }

  async getStats() {
    const d = await this._load();
    const tasks = d.tasks;
    const byStatus = {};
    d.statuses.forEach(s => byStatus[s.label] = 0);
    let estTotal = 0, actTotal = 0;
    tasks.forEach(t => {
      const status = this._getStatusById(d, t.status_id);
      const label = status?.label || 'Unknown';
      byStatus[label] = (byStatus[label] || 0) + 1;
      estTotal += t.estimatedHours || 0;
      actTotal += t.actualHours || 0;
    });
    return {
      total: tasks.length,
      open: (byStatus['Open'] || 0) + (byStatus['To Do'] || 0),
      inProgress: byStatus['In Progress'] || 0,
      completed: byStatus['Completed'] || 0,
      blocked: byStatus['Hold'] || 0,
      projects: d.projects.length,
      estimatedHours: estTotal,
      actualHours: actTotal,
      byStatus,
    };
  }

  async resetToSeed() {
    this._data = seedDatabase();
    this._persist();
    return this._data;
  }

  async clearAllData() {
    const d = await this._load();
    d.projects = [];
    d.tasks = [];
    d.activity = [];
    d.time_entries = [];
    this._persist();
    return d;
  }
}

const store = new Store();
window.PT_STORE = store;
window.PT_CONST = {
  STATUSES: DEFAULT_STATUSES.map(s => s.label),
  PRIORITIES: DEFAULT_PRIORITIES.map(p => p.label),
  PROJECT_STATUSES: PROJECT_STATUS_OPTIONS,
};