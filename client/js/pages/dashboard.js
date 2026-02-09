// ============================================================================
// Dashboard Page — stats cards, role-distribution chart, recent activity
// ============================================================================

const DashboardPage = (() => {
  let data = null;

  async function load() {
    try {
      const res = await API.dashboard.stats();
      data = res.data;
    } catch (err) {
      Components.toast(err.message || 'Failed to load dashboard', 'error');
      data = null;
    }
  }

  function render() {
    if (!data) return Components.loading();

    const stats = [
      {
        label: 'Total Users',
        value: data.users?.total ?? 0,
        color: 'purple',
        icon: Icons.users,
      },
      {
        label: 'Active Users',
        value: data.users?.active ?? 0,
        color: 'green',
        icon: Icons.userCheck,
      },
      {
        label: 'Inactive Users',
        value: data.users?.inactive ?? 0,
        color: 'orange',
        icon: Icons.userX,
      },
      {
        label: 'Total Roles',
        value: data.roles?.total ?? 0,
        color: 'blue',
        icon: Icons.shield,
      },
    ];

    const roleDist = (data.roles?.distribution || []).map((r) => ({
      name: r.role_name,
      count: Number(r.user_count) || 0,
    }));
    const maxCount = Math.max(...roleDist.map((r) => r.count), 1);

    const activities = (data.recentActivity || []).slice(0, 8);
    const dotColors = ['purple', 'green', 'blue', 'orange'];

    return `
      <div class="page-enter">
        ${Components.renderTopbar('Dashboard')}

        <div class="stats-grid">
          ${stats
            .map(
              (s) => `
            <div class="card stat-card ${s.color}">
              <div class="stat-icon ${s.color}">${s.icon}</div>
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
            </div>`,
            )
            .join('')}
        </div>

        <div class="two-col">
          <div class="card">
            <div class="section-header"><h3>Role Distribution</h3></div>
            ${
              roleDist.length
                ? `
              <div class="chart-bar-container">
                ${roleDist
                  .map((r) => {
                    const pct = (Number(r.count) / maxCount) * 100;
                    return `
                    <div class="chart-bar-wrapper">
                      <div class="chart-value">${r.count}</div>
                      <div class="chart-bar" style="height: ${Math.max(pct, 5)}%;"></div>
                      <div class="chart-label" title="${r.name}">${r.name}</div>
                    </div>`;
                  })
                  .join('')}
              </div>`
                : '<div class="empty-state"><p>No role data</p></div>'
            }
          </div>

          <div class="card">
            <div class="section-header"><h3>Recent Activity</h3></div>
            ${
              activities.length
                ? `
              <ul class="activity-list">
                ${activities
                  .map(
                    (a, i) => `
                  <li class="activity-item">
                    <div class="activity-dot ${dotColors[i % 4]}"></div>
                    <div>
                      <div class="activity-text"><strong>${a.action}</strong> on ${a.resource}${a.resourceId ? ` <span style="color:var(--text-muted)">#${a.resourceId.slice(0, 8)}</span>` : ''}</div>
                      <div class="activity-time">${timeAgo(a.createdAt)}</div>
                    </div>
                  </li>`,
                  )
                  .join('')}
              </ul>`
                : '<div class="empty-state"><p>No recent activity</p></div>'
            }
          </div>
        </div>
      </div>`;
  }

  function init() {
    // Add refresh button handler
    document
      .querySelectorAll('[data-action="refresh-dashboard"]')
      .forEach((btn) => {
        btn.addEventListener('click', async () => {
          await load();
          App.renderCurrentPage();
        });
      });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return { load, render, init };
})();
