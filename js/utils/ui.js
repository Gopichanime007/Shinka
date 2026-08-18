/* ============================================
   SHARED UI UTILITIES
   ============================================ */

const PT_UI = (() => {
  const STATUS_COLOR = {
    Backlog: 'slate',
    Open: 'blue',
    'To Do': 'blue',
    'In Progress': 'orange',
    'In Review': 'purple',
    'UAT/User Testing': 'purple',
    'Awaiting Client Response': 'slate',
    Blocked: 'red',
    Hold: 'red',
    Completed: 'green',
    Planning: 'slate',
    Active: 'blue',
  };

  const STATUS_ICON = {
    Backlog: 'fa-inbox',
    Open: 'fa-circle',
    'To Do': 'fa-circle',
    'In Progress': 'fa-spinner',
    'In Review': 'fa-eye',
    'UAT/User Testing': 'fa-users',
    'Awaiting Client Response': 'fa-comment-dots',
    Blocked: 'fa-ban',
    Hold: 'fa-pause',
    Completed: 'fa-circle-check',
    Planning: 'fa-compass',
    Active: 'fa-bolt',
  };

  const PRIORITY_ICON = {
    Urgent: 'fa-triangle-exclamation',
    High: 'fa-arrow-up',
    Medium: 'fa-minus',
    Low: 'fa-arrow-down',
  };

  // ---------- Theme ----------

  function initTheme() {
    const saved = localStorage.getItem('pt_theme') || 'light';

    document.documentElement.setAttribute(
      'data-theme',
      saved
    );

    updateThemeIcon(saved);
  }

  function toggleTheme() {
    const current =
      document.documentElement.getAttribute('data-theme') || 'light';

    const next =
      current === 'light'
        ? 'dark'
        : 'light';

    document.documentElement.setAttribute(
      'data-theme',
      next
    );

    localStorage.setItem(
      'pt_theme',
      next
    );

    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById(
      'themeToggleIcon'
    );

    if (!btn) {
      return;
    }

    btn.className =
      theme === 'light'
        ? 'fa-solid fa-moon'
        : 'fa-solid fa-sun';
  }

  // ---------- Sidebar ----------

  function initSidebar() {
    const shell = document.querySelector('.app-shell');

    if (!shell) {
      return;
    }

    const collapsed =
      localStorage.getItem('pt_sidebar_collapsed') === '1';

    if (collapsed) {
      shell.classList.add('sidebar-collapsed');
    }

    const toggleBtn =
      document.getElementById('sidebarToggleBtn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        shell.classList.toggle('sidebar-collapsed');

        localStorage.setItem(
          'pt_sidebar_collapsed',
          shell.classList.contains('sidebar-collapsed')
            ? '1'
            : '0'
        );
      });
    }

    const mobileBtn =
      document.getElementById('mobileMenuBtn');

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        shell.classList.toggle('mobile-nav-open');
      });
    }

    const scrim =
      document.querySelector('.sidebar-scrim');

    if (scrim) {
      scrim.addEventListener('click', () => {
        shell.classList.remove('mobile-nav-open');
      });
    }
  }

  // ---------- Toasts ----------

  const TOAST_ICON = {
    success: 'fa-check',
    error: 'fa-xmark',
    info: 'fa-info',
  };

  function ensureToastStack() {
    let stack =
      document.querySelector('.toast-stack');

    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }

    return stack;
  }

  function toast(
    type,
    title,
    msg = '',
    duration = 4200
  ) {
    const stack = ensureToastStack();
    const el = document.createElement('div');

    el.className = `toast toast-${escapeHtml(type)}`;

    /*
      Use textContent for user-provided toast content
      instead of inserting it through innerHTML.
    */
    const iconWrap =
      document.createElement('div');

    iconWrap.className = 'toast-icon';

    const icon =
      document.createElement('i');

    icon.className =
      `fa-solid ${TOAST_ICON[type] || 'fa-info'}`;

    iconWrap.appendChild(icon);

    const body =
      document.createElement('div');

    body.className = 'toast-body';

    const titleEl =
      document.createElement('div');

    titleEl.className = 'toast-title';
    titleEl.textContent = title ?? '';

    body.appendChild(titleEl);

    if (msg) {
      const msgEl =
        document.createElement('div');

      msgEl.className = 'toast-msg';
      msgEl.textContent = msg;

      body.appendChild(msgEl);
    }

    const closeBtn =
      document.createElement('button');

    closeBtn.className = 'toast-close';
    closeBtn.setAttribute(
      'aria-label',
      'Dismiss'
    );

    closeBtn.innerHTML =
      '<i class="fa-solid fa-xmark"></i>';

    el.appendChild(iconWrap);
    el.appendChild(body);
    el.appendChild(closeBtn);

    stack.appendChild(el);

    let removed = false;

    const remove = () => {
      if (removed) {
        return;
      }

      removed = true;

      el.classList.add('leaving');

      setTimeout(() => {
        el.remove();
      }, 220);
    };

    closeBtn.addEventListener(
      'click',
      remove
    );

    const timer =
      setTimeout(remove, duration);

    el.addEventListener(
      'mouseenter',
      () => clearTimeout(timer)
    );
  }

  // ---------- Confirm dialog ----------

  function confirmDialog({
    title,
    message,
    confirmLabel = 'Confirm',
    tone = 'danger',
  }) {
    return new Promise(resolve => {
      const overlay =
        document.createElement('div');

      overlay.className =
        'modal-overlay';

      const iconBg =
        tone === 'danger'
          ? 'var(--color-red-soft)'
          : 'var(--color-blue-soft)';

      const iconColor =
        tone === 'danger'
          ? 'var(--color-red)'
          : 'var(--color-blue)';

      const modal =
        document.createElement('div');

      modal.className = 'modal';
      modal.style.maxWidth = '400px';

      const body =
        document.createElement('div');

      body.className =
        'modal-body';

      body.style.alignItems =
        'center';

      body.style.textAlign =
        'center';

      body.style.paddingTop =
        '32px';

      const icon =
        document.createElement('div');

      icon.className =
        'confirm-icon';

      icon.style.background =
        iconBg;

      icon.style.color =
        iconColor;

      const iconElement =
        document.createElement('i');

      iconElement.className =
        `fa-solid ${
          tone === 'danger'
            ? 'fa-trash-can'
            : 'fa-circle-question'
        }`;

      icon.appendChild(iconElement);

      const heading =
        document.createElement('h3');

      heading.style.fontSize =
        'var(--fs-md)';

      heading.textContent =
        title ?? '';

      const messageElement =
        document.createElement('p');

      messageElement.className =
        'text-secondary text-sm';

      messageElement.textContent =
        message ?? '';

      body.appendChild(icon);
      body.appendChild(heading);
      body.appendChild(messageElement);

      const footer =
        document.createElement('div');

      footer.className =
        'modal-footer';

      footer.style.justifyContent =
        'center';

      const cancelBtn =
        document.createElement('button');

      cancelBtn.className =
        'btn btn-secondary';

      cancelBtn.dataset.act =
        'cancel';

      cancelBtn.textContent =
        'Cancel';

      const okBtn =
        document.createElement('button');

      okBtn.className =
        `btn ${
          tone === 'danger'
            ? 'btn-danger'
            : 'btn-primary'
        }`;

      okBtn.dataset.act =
        'ok';

      okBtn.textContent =
        confirmLabel ?? 'Confirm';

      footer.appendChild(cancelBtn);
      footer.appendChild(okBtn);

      modal.appendChild(body);
      modal.appendChild(footer);

      overlay.appendChild(modal);

      document.body.appendChild(
        overlay
      );

      requestAnimationFrame(() => {
        overlay.classList.add('open');
      });

      function close(result) {
        overlay.classList.remove('open');

        setTimeout(() => {
          overlay.remove();
        }, 200);

        resolve(result);
      }

      overlay.addEventListener(
        'click',
        e => {
          if (e.target === overlay) {
            close(false);
          }
        }
      );

      cancelBtn.addEventListener(
        'click',
        () => close(false)
      );

      okBtn.addEventListener(
        'click',
        () => close(true)
      );
    });
  }

  // ---------- Formatters ----------

  function fmtCurrency(n) {
    return '$' +
      Number(n || 0)
        .toLocaleString('en-US');
  }

  function fmtDate(str) {
    if (!str) {
      return '\u2014';
    }

    const d =
      new Date(str + 'T00:00:00');

    return d.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  }

  function fmtDateShort(str) {
    if (!str) {
      return '\u2014';
    }

    const d =
      new Date(str + 'T00:00:00');

    return d.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
      }
    );
  }

  function daysUntil(str) {
    if (!str) {
      return null;
    }

    const due =
      new Date(str + 'T00:00:00');

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return Math.round(
      (due - today) / 86400000
    );
  }

  function timeAgo(iso) {
    if (!iso) {
      return '';
    }

    const then =
      new Date(
        String(iso).replace(
          ' ',
          'T'
        )
      );

    if (Number.isNaN(then.getTime())) {
      return '';
    }

    const diffMin =
      Math.round(
        (Date.now() - then.getTime()) / 60000
      );

    if (diffMin < 1) {
      return 'just now';
    }

    if (diffMin < 60) {
      return `${diffMin}m ago`;
    }

    const diffH =
      Math.round(diffMin / 60);

    if (diffH < 24) {
      return `${diffH}h ago`;
    }

    return `${Math.round(diffH / 24)}d ago`;
  }

  // ---------- Display helpers ----------

  function statusBadge(status) {
    const safeStatus =
      String(status ?? '');

    const color =
      STATUS_COLOR[safeStatus] ||
      'slate';

    return `
      <span class="badge badge-${escapeHtml(color)}">
        ${escapeHtml(safeStatus)}
      </span>
    `;
  }

  function priorityFlag(priority) {
    const safePriority =
      String(priority ?? '');

    const icon =
      PRIORITY_ICON[safePriority] ||
      'fa-minus';

    return `
      <span class="priority-flag priority-${escapeHtml(safePriority)}">
        <i class="fa-solid ${escapeHtml(icon)}"></i>
        ${escapeHtml(safePriority)}
      </span>
    `;
  }

  function memberAvatar(
    member,
    size = 'sm'
  ) {
    const safeSize =
      String(size || 'sm');

    if (!member) {
      return `
        <div
          class="avatar avatar-${escapeHtml(safeSize)}"
          data-tooltip="Unassigned"
        >
          ?
        </div>
      `;
    }

    const name =
      String(member.name || 'Unknown');

    const initials =
      String(member.initials || '?');

    const color =
      String(member.color || 'slate');

    return `
      <div
        class="avatar avatar-${escapeHtml(safeSize)}"
        style="background:var(--color-${escapeHtml(color)})"
        data-tooltip="${escapeHtml(name)}"
      >
        ${escapeHtml(initials)}
      </div>
    `;
  }

  // ---------- Utilities ----------

  function debounce(
    fn,
    wait = 200
  ) {
    let timer;

    return (...args) => {
      clearTimeout(timer);

      timer = setTimeout(
        () => fn(...args),
        wait
      );
    };
  }

  function escapeHtml(str) {
    const div =
      document.createElement('div');

    div.textContent =
      str ?? '';

    return div.innerHTML;
  }

  return {
    initTheme,
    toggleTheme,
    initSidebar,

    toast,
    confirmDialog,

    fmtCurrency,
    fmtDate,
    fmtDateShort,
    daysUntil,
    timeAgo,

    statusBadge,
    priorityFlag,
    memberAvatar,

    debounce,
    escapeHtml,

    STATUS_COLOR,
    STATUS_ICON,
    PRIORITY_ICON,
  };
})();

window.PT_UI = PT_UI;