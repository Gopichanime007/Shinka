/* ============================================
   SHARED UI UTILITIES
   ============================================ */

const PT_UI = (() => {
  const STATUS_COLOR = {
    'Backlog': 'slate', 'To Do': 'blue', 'In Progress': 'orange',
    'In Review': 'purple', 'Blocked': 'red', 'Completed': 'green',
    'Planning': 'slate', 'Active': 'blue', 'On Hold': 'orange',
  };
  const STATUS_ICON = {
    'Backlog': 'fa-inbox', 'To Do': 'fa-circle', 'In Progress': 'fa-spinner',
    'In Review': 'fa-eye', 'Blocked': 'fa-ban', 'Completed': 'fa-circle-check',
    'Planning': 'fa-compass', 'Active': 'fa-bolt', 'On Hold': 'fa-pause',
  };
  const PRIORITY_ICON = { Urgent: 'fa-triangle-exclamation', High: 'fa-arrow-up', Medium: 'fa-minus', Low: 'fa-arrow-down' };

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem('pt_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pt_theme', next);
    updateThemeIcon(next);
  }
  function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleIcon');
    if (btn) btn.className = theme === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  }

  // ---------- Sidebar ----------
  function initSidebar() {
    const shell = document.querySelector('.app-shell');
    const collapsed = localStorage.getItem('pt_sidebar_collapsed') === '1';
    if (collapsed) shell.classList.add('sidebar-collapsed');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
      shell.classList.toggle('sidebar-collapsed');
      localStorage.setItem('pt_sidebar_collapsed', shell.classList.contains('sidebar-collapsed') ? '1' : '0');
    });
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) mobileBtn.addEventListener('click', () => shell.classList.toggle('mobile-nav-open'));
    const scrim = document.querySelector('.sidebar-scrim');
    if (scrim) scrim.addEventListener('click', () => shell.classList.remove('mobile-nav-open'));
  }

  // ---------- Toasts ----------
  function ensureToastStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }
  const TOAST_ICON = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' };
  function toast(type, title, msg = '', duration = 4200) {
    const stack = ensureToastStack();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${TOAST_ICON[type] || 'fa-info'}"></i></div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;
    stack.appendChild(el);
    const remove = () => { el.classList.add('leaving'); setTimeout(() => el.remove(), 220); };
    el.querySelector('.toast-close').addEventListener('click', remove);
    const timer = setTimeout(remove, duration);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  // ---------- Confirm dialog ----------
  function confirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'danger' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const iconBg = tone === 'danger' ? 'var(--color-red-soft)' : 'var(--color-blue-soft)';
      const iconColor = tone === 'danger' ? 'var(--color-red)' : 'var(--color-blue)';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-body" style="align-items:center; text-align:center; padding-top: 32px;">
            <div class="confirm-icon" style="background:${iconBg}; color:${iconColor};">
              <i class="fa-solid ${tone === 'danger' ? 'fa-trash-can' : 'fa-circle-question'}"></i>
            </div>
            <h3 style="font-size: var(--fs-md);">${title}</h3>
            <p class="text-secondary text-sm">${message}</p>
          </div>
          <div class="modal-footer" style="justify-content:center;">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmLabel}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('open'));
      function close(result) {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
      overlay.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    });
  }

  // ---------- Formatters ----------
  function fmtCurrency(n) {
    return '$' + Number(n || 0).toLocaleString('en-US');
  }
  function fmtDate(str) {
    if (!str) return '\u2014';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateShort(str) {
    if (!str) return '\u2014';
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function daysUntil(str) {
    if (!str) return null;
    const due = new Date(str + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((due - today) / 86400000);
  }
  function timeAgo(iso) {
    const then = new Date(iso.replace(' ', 'T'));
    const diffMin = Math.round((Date.now() - then.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.round(diffH / 24)}d ago`;
  }
  function statusBadge(status) {
    const color = STATUS_COLOR[status] || 'slate';
    return `<span class="badge badge-${color}">${status}</span>`;
  }
  function priorityFlag(priority) {
    return `<span class="priority-flag priority-${priority}"><i class="fa-solid ${PRIORITY_ICON[priority] || 'fa-minus'}"></i>${priority}</span>`;
  }
  function memberAvatar(member, size = 'sm') {
    if (!member) return `<div class="avatar avatar-${size}" data-tooltip="Unassigned">?</div>`;
    return `<div class="avatar avatar-${size}" style="background:var(--color-${member.color})" data-tooltip="${member.name}">${member.initials}</div>`;
  }
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  return {
    initTheme, toggleTheme, initSidebar, toast, confirmDialog,
    fmtCurrency, fmtDate, fmtDateShort, daysUntil, timeAgo,
    statusBadge, priorityFlag, memberAvatar, debounce, escapeHtml,
    STATUS_COLOR, STATUS_ICON, PRIORITY_ICON,
  };
})();

window.PT_UI = PT_UI;
