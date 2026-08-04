(async function () {
  const content = document.getElementById('pageContent');
  const ACT_ICON = { complete: ['fa-check', 'green'], comment: ['fa-comment', 'blue'], status: ['fa-arrows-rotate', 'purple'], create: ['fa-plus', 'cyan'], block: ['fa-ban', 'red'], assign: ['fa-user', 'orange'] };

  content.innerHTML = `
    <div class="page-header fade-in">
      <div>
        <h2>Good to see you, Ava \u{1F44B}</h2>
        <div class="sub">Here's what's happening across your projects today.</div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary btn-sm" id="dashboardExportBtn" data-tooltip="Export workspace backup"><i class="fa-solid fa-file-arrow-down"></i>&nbsp; Backup</button>
        <a class="btn btn-primary btn-sm" href="pages/tasks.html"><i class="fa-solid fa-plus"></i>&nbsp; New Task</a>
      </div>
    </div>

    <div class="kpi-grid" id="kpiGrid"></div>

    <div class="charts-row">
      <div class="card chart-card fade-in">
        <div class="chart-card-header">
          <h3>Task Status</h3>
          <i class="fa-solid fa-ellipsis text-secondary" data-tooltip="Distribution of all tasks by status"></i>
        </div>
        <div class="chart-canvas-wrap"><canvas id="statusDoughnut"></canvas></div>
        <div class="legend-list" id="statusLegend"></div>
      </div>
      <div class="card chart-card fade-in">
        <div class="chart-card-header">
          <h3>Estimated vs. Actual Hours</h3>
          <i class="fa-solid fa-ellipsis text-secondary" data-tooltip="Hours logged by project, planned vs. real"></i>
        </div>
        <div class="chart-canvas-wrap"><canvas id="hoursBar"></canvas></div>
      </div>
    </div>

    <div class="dash-columns">
      <div>
        <div class="card widget-card fade-in">
          <div class="widget-header"><h3>Project Progress</h3><a href="pages/projects.html">View all</a></div>
          <div id="projectProgressList"></div>
        </div>
        <div class="card widget-card fade-in">
          <div class="widget-header"><h3>Recent Tasks</h3><a href="pages/tasks.html">View all</a></div>
          <div id="recentTasksList"></div>
        </div>
      </div>
      <div>
        <div class="card widget-card fade-in">
          <div class="widget-header"><h3>Upcoming Deadlines</h3><a href="pages/tasks.html">View all</a></div>
          <div id="deadlinesList"></div>
        </div>
        <div class="card widget-card fade-in" style="${showWorkload ? '' : 'display:none;'}">
          <div class="widget-header"><h3>Team Workload</h3><span class="text-xs text-secondary" data-tooltip="Open + in-progress tasks per teammate">Active tasks</span></div>
          <div id="workloadList"></div>
        </div>
        <div class="card widget-card fade-in">
          <div class="widget-header"><h3>Recent Activity</h3></div>
          <div id="activityList"></div>
        </div>
      </div>
    </div>

    <div class="app-footer">Shinka \u00b7 Project Tracker &mdash; local demo data, stored in your browser</div>
  `;

  const currentRole = await PT_STORE.getCurrentRole();
  const showWorkload = currentRole?.label !== 'Technical';
  const [stats, projects, tasks, members, activity] = await Promise.all([
    PT_STORE.getStats(), PT_STORE.getProjects(), PT_STORE.getTasks(), PT_STORE.getMembers(), PT_STORE.getActivity(6)
  ]);

  renderKpis(stats);
  renderStatusChart(stats);
  renderHoursChart(projects, tasks);
  renderProjectProgress(projects);
  renderRecentTasks(tasks, members);
  renderDeadlines(tasks);
  if (showWorkload) renderWorkload(tasks, members);
  renderActivity(activity, members);
  document.getElementById('dashboardExportBtn').addEventListener('click', async () => {
    const data = await PT_STORE.exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shinka-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    PT_UI.toast('success', 'Backup downloaded');
  });

  // ---------------- KPIs ----------------
  function renderKpis(stats) {
    const cards = [
      { title: 'Total Tasks', value: stats.total, sub: 'Across all projects', icon: 'fa-list-check', accent: 'blue' },
      { title: 'Open Tasks', value: stats.open, sub: 'Backlog + To Do', icon: 'fa-circle', accent: 'slate' },
      { title: 'In Progress', value: stats.inProgress, sub: 'Active + in review', icon: 'fa-spinner', accent: 'orange' },
      { title: 'Completed', value: stats.completed, sub: 'Done this cycle', icon: 'fa-circle-check', accent: 'green' },
      { title: 'Blocked', value: stats.blocked, sub: 'Needs attention', icon: 'fa-ban', accent: 'red' },
      { title: 'Projects', value: stats.projects, sub: 'Currently tracked', icon: 'fa-folder-open', accent: 'purple' },
      { title: 'Estimated Hours', value: stats.estimatedHours, sub: 'Planned effort', icon: 'fa-hourglass-half', accent: 'cyan' },
      { title: 'Actual Hours', value: stats.actualHours, sub: 'Logged so far', icon: 'fa-stopwatch', accent: 'blue' },
    ];
    const grid = document.getElementById('kpiGrid');
    grid.innerHTML = cards.map((c, i) => `
      <div class="card kpi-card fade-in" style="--accent:var(--color-${c.accent}); --accent-soft:var(--color-${c.accent}-soft); animation-delay:${i * 40}ms">
        <div class="kpi-top">
          <div class="kpi-icon"><i class="fa-solid ${c.icon}"></i></div>
        </div>
        <div class="kpi-value mono-num" data-countto="${c.value}">0</div>
        <div>
          <div class="kpi-title">${c.title}</div>
          <div class="kpi-sub">${c.sub}</div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('[data-countto]').forEach(el => animateCount(el, +el.dataset.countto));
  }

  function animateCount(el, target) {
    const dur = 700, start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ---------------- Charts ----------------
  function chartColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  }

  function renderStatusChart(stats) {
    const labels = Object.keys(stats.byStatus);
    const data = Object.values(stats.byStatus);
    const colorMap = { 'Backlog': 'slate', 'To Do': 'blue', 'In Progress': 'orange', 'In Review': 'purple', 'Blocked': 'red', 'Completed': 'green' };
    const colors = labels.map(l => chartColor(colorMap[l]));
    new Chart(document.getElementById('statusDoughnut'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
      options: {
        cutout: '68%',
        plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
        animation: { duration: 700, easing: 'easeOutCubic' },
      }
    });
    document.getElementById('statusLegend').innerHTML = labels.map((l, i) => `
      <div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${l} (${data[i]})</div>
    `).join('');
  }

  function renderHoursChart(projects, tasks) {
    const labels = projects.map(p => p.name.length > 16 ? p.name.slice(0, 16) + '\u2026' : p.name);
    const est = projects.map(p => tasks.filter(t => t.project === p.id).reduce((s, t) => s + (t.estimatedHours || 0), 0));
    const act = projects.map(p => tasks.filter(t => t.project === p.id).reduce((s, t) => s + (t.actualHours || 0), 0));
    new Chart(document.getElementById('hoursBar'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Estimated', data: est, backgroundColor: chartColor('blue'), borderRadius: 6, maxBarThickness: 22 },
          { label: 'Actual', data: act, backgroundColor: chartColor('cyan'), borderRadius: 6, maxBarThickness: 22 },
        ]
      },
      options: {
        animation: { duration: 700, easing: 'easeOutCubic' },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartColor('slate'), font: { size: 11 } } },
          y: { grid: { color: chartColor('border') || 'rgba(148,163,184,.15)' }, ticks: { color: chartColor('slate'), font: { size: 11 } }, beginAtZero: true }
        },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, color: chartColor('slate'), font: { size: 11 } } } }
      }
    });
  }

  // ---------------- Project progress ----------------
  function renderProjectProgress(projects) {
    const el = document.getElementById('projectProgressList');
    const active = projects.filter(p => p.status !== 'Completed').slice(0, 5);
    el.innerHTML = (active.length ? active : projects.slice(0, 5)).map(p => `
      <div class="proj-row">
        <div class="proj-info">
          <div class="proj-name" data-tooltip="${p.name}">${p.name}</div>
          <div class="proj-client">${p.client} \u00b7 ${PT_UI.statusBadge(p.status)}</div>
        </div>
        <div class="proj-bar-wrap">
          <div class="proj-bar-track"><div class="proj-bar-fill" style="width:${p.progress}%; background:var(--color-${PT_UI.STATUS_COLOR[p.status] || 'blue'})"></div></div>
          <div class="proj-pct">${p.progress}%</div>
        </div>
      </div>
    `).join('');
  }

  // ---------------- Recent tasks ----------------
  function renderRecentTasks(tasks, members) {
    const el = document.getElementById('recentTasksList');
    const recent = [...tasks].sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || '')).slice(0, 6);
    el.innerHTML = recent.map(t => {
      const m = members.find(mm => mm.id === t.assignedTo);
      const done = t.status === 'Completed';
      return `
      <div class="task-row">
        <div class="task-check ${done ? 'done' : ''}">${done ? '<i class="fa-solid fa-check"></i>' : ''}</div>
        <div class="task-main">
          <div class="task-title" data-tooltip="${t.name}">${t.name}</div>
          <div class="task-meta"><span>${t.project}</span>\u00b7${PT_UI.priorityFlag(t.priority)}</div>
        </div>
        <div class="task-row-right">
          ${PT_UI.statusBadge(t.status)}
          ${PT_UI.memberAvatar(m)}
        </div>
      </div>`;
    }).join('');
  }

  // ---------------- Deadlines ----------------
  function renderDeadlines(tasks) {
    const el = document.getElementById('deadlinesList');
    const upcoming = tasks
      .filter(t => t.status !== 'Completed' && t.dueDate)
      .map(t => ({ ...t, days: PT_UI.daysUntil(t.dueDate) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
    if (!upcoming.length) {
      el.innerHTML = `<div class="empty-state" style="padding: var(--sp-6) 0;"><i class="fa-regular fa-calendar-check"></i><h4>All clear</h4><p>No upcoming deadlines.</p></div>`;
      return;
    }
    el.innerHTML = upcoming.map(t => {
      const d = new Date(t.dueDate + 'T00:00:00');
      const overdue = t.days < 0;
      const dayColor = overdue ? 'var(--color-red)' : t.days <= 3 ? 'var(--color-orange)' : 'var(--color-text-secondary)';
      return `
      <div class="deadline-item">
        <div class="deadline-date-box"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleDateString('en-US', { month: 'short' })}</div></div>
        <div class="deadline-info">
          <div class="deadline-title" data-tooltip="${t.name}">${t.name}</div>
          <div class="deadline-days" style="color:${dayColor}">${overdue ? `${Math.abs(t.days)}d overdue` : t.days === 0 ? 'Due today' : `Due in ${t.days}d`}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ---------------- Team workload ----------------
  function renderWorkload(tasks, members) {
    const el = document.getElementById('workloadList');
    const counts = members.map(m => ({ m, count: tasks.filter(t => t.assignedTo === m.id && t.status !== 'Completed').length }));
    const max = Math.max(1, ...counts.map(c => c.count));
    el.innerHTML = counts.sort((a, b) => b.count - a.count).map(({ m, count }) => `
      <div class="workload-item">
        ${PT_UI.memberAvatar(m)}
        <div class="workload-name">${m.name}</div>
        <div class="workload-track"><div class="workload-fill" style="width:${(count / max) * 100}%; background:var(--color-${m.color})"></div></div>
        <div class="workload-count mono-num">${count}</div>
      </div>
    `).join('');
  }

  // ---------------- Activity ----------------
  function renderActivity(activity, members) {
    const el = document.getElementById('activityList');
    el.innerHTML = activity.map(a => {
      const m = members.find(mm => mm.id === a.actor);
      const [icon, color] = ACT_ICON[a.type] || ['fa-circle', 'slate'];
      return `
      <div class="activity-item">
        <div class="activity-dot" style="background:var(--color-${color}-soft); color:var(--color-${color})"><i class="fa-solid ${icon}"></i></div>
        <div>
          <div class="activity-text"><b>${m ? m.name : 'Someone'}</b> ${a.text}</div>
          <div class="activity-time">${PT_UI.timeAgo(a.time)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ---------------- Search ----------------
  document.getElementById('globalSearch').addEventListener('input', PT_UI.debounce((e) => {
    const q = e.target.value.trim();
    if (q.length > 1) window.location.href = `pages/tasks.html?q=${encodeURIComponent(q)}`;
  }, 500));
})();
