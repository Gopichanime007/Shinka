/* ============================================
   APP SHELL (sidebar + topbar)
   Rendered into every page from one place so nav markup
   never drifts between pages.
   ============================================ */

const PT_NAV = [
  { section: 'Workspace', items: [
    { key: 'dashboard', href: 'index.html', icon: 'fa-gauge-high', label: 'Dashboard' },
    { key: 'projects', href: 'pages/projects.html', icon: 'fa-folder-open', label: 'Projects' },
    { key: 'tasks', href: 'pages/tasks.html', icon: 'fa-list-check', label: 'Tasks' },
    { key: 'kanban', href: 'pages/kanban.html', icon: 'fa-table-columns', label: 'Kanban Board' },
  ]},
];

function ptResolveHref(href, isRoot) {
  if (isRoot) return href;
  return href === 'index.html' ? '../index.html' : href.replace('pages/', '');
}

function renderShell({ active, title, isRoot = false }) {
  const navHtml = PT_NAV.map(section => `
    <div class="sidebar-section-label">${section.section}</div>
    ${section.items.map(item => `
      <a class="nav-item ${item.key === active ? 'active' : ''}" href="${ptResolveHref(item.href, isRoot)}" data-tooltip-pos="right" ${true ? '' : ''}>
        <i class="fa-solid ${item.icon}"></i><span>${item.label}</span>
      </a>`).join('')}
  `).join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="app-shell">
      <div class="sidebar-scrim"></div>
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">S</div>
          <span class="brand-name">Shinka</span>
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          <button class="sidebar-toggle" id="sidebarToggleBtn" data-tooltip-pos="right" data-tooltip="Toggle sidebar">
            <i class="fa-solid fa-angles-left"></i><span>Collapse</span>
          </button>
        </div>
      </aside>
      <div class="main-col">
        <header class="topbar">
          <button class="mobile-menu-btn icon-btn" id="mobileMenuBtn" data-tooltip="Menu"><i class="fa-solid fa-bars"></i></button>
          <h1 class="topbar-title">${title}</h1>
          <div class="topbar-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="globalSearch" placeholder="Search tasks, projects, people\u2026" autocomplete="off">
            <span class="kbd-hint">/</span>
          </div>
          <div class="topbar-actions">
            <button class="icon-btn" id="themeToggleBtn" data-tooltip="Toggle theme">
              <i class="fa-solid fa-moon" id="themeToggleIcon"></i>
            </button>
            <button class="icon-btn" data-tooltip="Notifications">
              <i class="fa-regular fa-bell"></i><span class="dot"></span>
            </button>
            <button class="icon-btn" id="settingsBtn" data-tooltip="Clear or reset workspace data">
              <i class="fa-solid fa-gear"></i>
            </button>
            <div class="avatar" data-tooltip="Ava Chen \u00b7 You">AC</div>
          </div>
        </header>
        <main class="page-content" id="pageContent"></main>
      </div>
    </div>
  `);

  PT_UI.initTheme();
  PT_UI.initSidebar();
  document.getElementById('themeToggleBtn').addEventListener('click', PT_UI.toggleTheme);
  document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

  // '/' focuses search, matching the visible kbd hint
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      document.getElementById('globalSearch').focus();
    }
  });
}

function openSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-header">
        <h3>Workspace Data</h3>
        <button class="icon-btn" data-act="close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p class="text-sm text-secondary">Everything here lives only in this browser's local storage \u2014 nothing is sent anywhere. Use these if the sample data is in your way.</p>
        <button class="btn btn-secondary w-full" data-act="clear" style="justify-content:flex-start;">
          <i class="fa-solid fa-broom"></i>&nbsp; Clear all projects &amp; tasks
        </button>
        <button class="btn btn-secondary w-full" data-act="reseed" style="justify-content:flex-start;">
          <i class="fa-solid fa-arrow-rotate-left"></i>&nbsp; Restore sample data
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  function close() { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-act="close"]').addEventListener('click', close);

  overlay.querySelector('[data-act="clear"]').addEventListener('click', async () => {
    const ok = await PT_UI.confirmDialog({
      title: 'Clear all projects & tasks?',
      message: 'This removes every project and task stored in this browser. Your team member list stays, so you can keep assigning new tasks. This can\u2019t be undone.',
      confirmLabel: 'Clear data',
    });
    if (ok) {
      await PT_STORE.clearAllData();
      close();
      PT_UI.toast('success', 'Workspace cleared', 'Reloading\u2026');
      setTimeout(() => location.reload(), 700);
    }
  });
  const roleSelect = overlay.querySelector('#settingsRole');
  roles.forEach(role => roleSelect.insertAdjacentHTML('beforeend', `<option value="${role.role_id}"${role.role_id === currentRole?.role_id ? ' selected' : ''}>${role.label}</option>`));

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  overlay.querySelector('[data-act="export"]').addEventListener('click', async () => {
    const data = await PT_STORE.exportDatabase();
    downloadJson(`shinka-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
    PT_UI.toast('success', 'Backup exported');
  });

  const fileInput = overlay.querySelector('#backupFileInput');
  overlay.querySelector('[data-act="import"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (err) {
      PT_UI.toast('error', 'Invalid backup file');
      return;
    }
    const ok = await PT_UI.confirmDialog({
      title: 'Import backup?',
      message: 'This replaces your current workspace data with the selected backup file.',
      confirmLabel: 'Import',
      tone: 'info',
    });
    if (!ok) return;
    try {
      await PT_STORE.importDatabase(payload);
      close();
      PT_UI.toast('success', 'Backup imported', 'Reloading…');
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      PT_UI.toast('error', 'Import failed', 'The file could not be loaded.');
    }
  });

  roleSelect.addEventListener('change', async (event) => {
    await PT_STORE.saveUserSettings({ role_id: event.target.value });
    PT_UI.toast('success', 'Workspace role updated');
  });
  overlay.querySelector('[data-act="reseed"]').addEventListener('click', async () => {
    const ok = await PT_UI.confirmDialog({
      title: 'Restore sample data?',
      message: 'This replaces everything currently in your workspace with the original demo projects and tasks.',
      confirmLabel: 'Restore',
      tone: 'info',
    });
    if (ok) {
      await PT_STORE.resetToSeed();
      close();
      PT_UI.toast('success', 'Sample data restored', 'Reloading\u2026');
      setTimeout(() => location.reload(), 700);
    }
  });
}

window.PT_SHELL = { renderShell };