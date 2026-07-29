/* ============================================
   DATA STORE
   Abstraction over persistence. Every method here is async
   on purpose — swapping the body for a fetch() call to a
   real REST API later requires zero changes anywhere else
   in the app.
   ============================================ */

const DB_KEY = 'pt_database_v1';

const STATUSES = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Blocked', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed'];

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function seedDatabase() {
  const members = [
    { id: 'u1', name: 'Ava Chen', initials: 'AC', color: 'blue' },
    { id: 'u2', name: 'Rohan Mehta', initials: 'RM', color: 'purple' },
    { id: 'u3', name: 'Liam O\u2019Connor', initials: 'LO', color: 'cyan' },
    { id: 'u4', name: 'Priya Nair', initials: 'PN', color: 'orange' },
    { id: 'u5', name: 'Sofia Rossi', initials: 'SR', color: 'green' },
    { id: 'u6', name: 'Daniel Kim', initials: 'DK', color: 'red' },
  ];

  const projects = [
    { id: 'PRJ-001', name: 'Nova Banking Portal', client: 'Meridian Financial', startDate: todayPlus(-60), endDate: todayPlus(35), status: 'Active', progress: 68, budget: 185000, priority: 'High', team: ['u1', 'u2', 'u4'] },
    { id: 'PRJ-002', name: 'Atlas Fleet Tracker', client: 'Northwind Logistics', startDate: todayPlus(-40), endDate: todayPlus(20), status: 'Active', progress: 42, budget: 96000, priority: 'Urgent', team: ['u3', 'u5'] },
    { id: 'PRJ-003', name: 'Horizon Health App', client: 'Cedar Health Group', startDate: todayPlus(-90), endDate: todayPlus(-5), status: 'On Hold', progress: 81, budget: 220000, priority: 'Medium', team: ['u2', 'u6', 'u1'] },
    { id: 'PRJ-004', name: 'Lumen Retail Dashboard', client: 'Bright Retail Co', startDate: todayPlus(-15), endDate: todayPlus(75), status: 'Planning', progress: 12, budget: 64000, priority: 'Medium', team: ['u4', 'u5'] },
    { id: 'PRJ-005', name: 'Pulse Marketing Site', client: 'Vantage Studios', startDate: todayPlus(-120), endDate: todayPlus(-30), status: 'Completed', progress: 100, budget: 38000, priority: 'Low', team: ['u6', 'u3'] },
  ];

  const taskSeeds = [
    ['Design onboarding flow', 'PRJ-001', 'Completed', 'High', 'u1', 12, 13, -20, -25, -24, -19],
    ['Build KYC verification API', 'PRJ-001', 'In Progress', 'Urgent', 'u2', 24, 16, -10, -12, -9, null],
    ['Set up transaction ledger schema', 'PRJ-001', 'In Review', 'High', 'u4', 18, 17, -6, -8, -5, null],
    ['Migrate auth to OAuth2', 'PRJ-001', 'Blocked', 'High', 'u1', 10, 4, -3, -4, -2, null],
    ['QA pass on statements module', 'PRJ-001', 'To Do', 'Medium', 'u2', 8, 0, 4, -1, null, null],
    ['GPS ingestion pipeline', 'PRJ-002', 'In Progress', 'Urgent', 'u3', 30, 21, -2, -14, -12, null],
    ['Driver mobile app crash fixes', 'PRJ-002', 'Blocked', 'Urgent', 'u5', 6, 5, -1, -3, -1, null],
    ['Route optimization algorithm', 'PRJ-002', 'To Do', 'High', 'u3', 20, 0, 9, -1, null, null],
    ['Fleet dashboard charts', 'PRJ-002', 'Backlog', 'Medium', 'u5', 14, 0, 16, null, null, null],
    ['Patient intake redesign', 'PRJ-003', 'Completed', 'Medium', 'u6', 16, 15, -30, -45, -44, -31],
    ['HIPAA compliance review', 'PRJ-003', 'In Review', 'Urgent', 'u2', 10, 9, -7, -9, -8, null],
    ['Appointment reminders service', 'PRJ-003', 'In Progress', 'Medium', 'u1', 12, 6, 2, -6, -4, null],
    ['Inventory sync service', 'PRJ-004', 'To Do', 'Medium', 'u4', 18, 0, 20, -2, null, null],
    ['Storefront visual refresh', 'PRJ-004', 'Backlog', 'Low', 'u5', 22, 0, 30, null, null, null],
    ['Vendor API research spike', 'PRJ-004', 'In Progress', 'Low', 'u4', 6, 3, 5, -3, -2, null],
    ['Launch campaign landing page', 'PRJ-005', 'Completed', 'High', 'u6', 14, 12, -32, -40, -39, -33],
    ['SEO + analytics setup', 'PRJ-005', 'Completed', 'Low', 'u3', 5, 4, -35, -42, -41, -36],
    ['Design system audit', 'PRJ-001', 'To Do', 'Low', 'u1', 9, 0, 12, -1, null, null],
    ['Notification center backend', 'PRJ-002', 'In Progress', 'Medium', 'u2', 16, 8, 1, -5, -3, null],
    ['Accessibility pass (WCAG AA)', 'PRJ-003', 'To Do', 'Medium', 'u6', 11, 0, 6, -2, null, null],
  ];

  const tasks = taskSeeds.map((t, i) => ({
    id: uid('TSK'),
    name: t[0],
    description: `Work item covering ${t[0].toLowerCase()} for the project timeline.`,
    project: t[1],
    status: t[2],
    priority: t[3],
    assignedTo: t[4],
    estimatedHours: t[5],
    actualHours: t[6],
    dueDate: todayPlus(t[7]),
    createdDate: todayPlus(t[8]),
    startedDate: t[9] !== null ? todayPlus(t[9]) : null,
    completedDate: t[10] !== null ? todayPlus(t[10]) : null,
  }));

  const activity = [
    { id: uid('ACT'), type: 'complete', actor: 'u1', text: 'completed "Design onboarding flow"', time: todayPlus(0) + 'T09:14' },
    { id: uid('ACT'), type: 'comment', actor: 'u2', text: 'commented on "Build KYC verification API"', time: todayPlus(0) + 'T08:40' },
    { id: uid('ACT'), type: 'status', actor: 'u3', text: 'moved "GPS ingestion pipeline" to In Progress', time: todayPlus(-1) + 'T17:02' },
    { id: uid('ACT'), type: 'create', actor: 'u4', text: 'created project "Lumen Retail Dashboard"', time: todayPlus(-1) + 'T14:20' },
    { id: uid('ACT'), type: 'block', actor: 'u5', text: 'flagged "Driver mobile app crash fixes" as blocked', time: todayPlus(-2) + 'T11:55' },
    { id: uid('ACT'), type: 'assign', actor: 'u6', text: 'was assigned "Accessibility pass (WCAG AA)"', time: todayPlus(-2) + 'T10:03' },
];

  return { members, projects, tasks, activity };
}

class Store {
  constructor() {
    this._data = null;
  }

  async _load() {
    if (this._data) return this._data;
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try { this._data = JSON.parse(raw); return this._data; }
      catch (e) { /* fall through to reseed */ }
    }
    this._data = seedDatabase();
    this._persist();
    return this._data;
  }

  _persist() {
    localStorage.setItem(DB_KEY, JSON.stringify(this._data));
  }

  // ---------- Members ----------
  async getMembers() { const d = await this._load(); return d.members; }
  async getMember(id) { const d = await this._load(); return d.members.find(m => m.id === id); }

  // ---------- Projects ----------
  async getProjects() { const d = await this._load(); return [...d.projects]; }
  async getProject(id) { const d = await this._load(); return d.projects.find(p => p.id === id); }
  async saveProject(project) {
    const d = await this._load();
    if (project.id) {
      const idx = d.projects.findIndex(p => p.id === project.id);
      if (idx > -1) { d.projects[idx] = { ...d.projects[idx], ...project }; this._persist(); return d.projects[idx]; }
    }
    project.id = uid('PRJ');
    d.projects.unshift(project);
    this._persist();
    return project;
  }
  async deleteProject(id) {
    const d = await this._load();
    d.projects = d.projects.filter(p => p.id !== id);
    d.tasks = d.tasks.filter(t => t.project !== id);
    this._persist();
  }

  // ---------- Tasks ----------
  async getTasks() { const d = await this._load(); return [...d.tasks]; }
  async getTask(id) { const d = await this._load(); return d.tasks.find(t => t.id === id); }
  async saveTask(task) {
    const d = await this._load();
    if (task.id) {
      const idx = d.tasks.findIndex(t => t.id === task.id);
      if (idx > -1) { d.tasks[idx] = { ...d.tasks[idx], ...task }; this._persist(); return d.tasks[idx]; }
    }
    task.id = uid('TSK');
    task.createdDate = task.createdDate || new Date().toISOString().slice(0, 10);
    d.tasks.unshift(task);
    this._persist();
    return task;
  }
  async updateTaskStatus(id, status) {
    const d = await this._load();
    const t = d.tasks.find(t => t.id === id);
    if (!t) return null;
    t.status = status;
    if (status === 'Completed' && !t.completedDate) t.completedDate = new Date().toISOString().slice(0, 10);
    if (status === 'In Progress' && !t.startedDate) t.startedDate = new Date().toISOString().slice(0, 10);
    this._persist();
    return t;
  }
  async deleteTask(id) {
    const d = await this._load();
    d.tasks = d.tasks.filter(t => t.id !== id);
    this._persist();
  }

  // ---------- Activity ----------
  async getActivity(limit = 8) { const d = await this._load(); return d.activity.slice(0, limit); }
  async logActivity(entry) {
    const d = await this._load();
    d.activity.unshift({ id: uid('ACT'), time: new Date().toISOString().slice(0, 16), ...entry });
    this._persist();
  }

  // ---------- Derived / analytics ----------
  async getStats() {
    const d = await this._load();
    const tasks = d.tasks;
    const byStatus = {};
    STATUSES.forEach(s => byStatus[s] = 0);
    let estTotal = 0, actTotal = 0;
    tasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      estTotal += t.estimatedHours || 0;
      actTotal += t.actualHours || 0;
    });
    return {
      total: tasks.length,
      open: byStatus['To Do'] + byStatus['Backlog'],
      inProgress: byStatus['In Progress'] + byStatus['In Review'],
      completed: byStatus['Completed'],
      blocked: byStatus['Blocked'],
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
    this._persist();
    return d;
  }
}

const store = new Store();
window.PT_STORE = store;
window.PT_CONST = { STATUSES, PRIORITIES, PROJECT_STATUSES };