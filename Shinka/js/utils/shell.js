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
          <div class="brand-mark">P</div>
          <span class="brand-name">Pulseboard</span>
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

  // '/' focuses search, matching the visible kbd hint
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      document.getElementById('globalSearch').focus();
    }
  });
}

window.PT_SHELL = { renderShell };
