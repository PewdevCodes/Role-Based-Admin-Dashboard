// ============================================================================
// Audit Logs Page — read-only list with filters
// ============================================================================

const AuditPage = (() => {
  let logs = [];
  let total = 0;
  let page = 1;
  const limit = 15;
  let filters = { action: '', resource: '' };

  async function load() {
    try {
      const params = { page, limit, ...filters };
      const res = await API.audit.list(params);
      logs = res.data || [];
      total = res.meta?.totalCount ?? logs.length;
    } catch (err) {
      Components.toast(err.message || 'Failed to load audit logs', 'error');
    }
  }

  function render() {
    const actionColors = {
      LOGIN: 'success',
      LOGOUT: 'info',
      CREATE: 'purple',
      UPDATE: 'warning',
      DELETE: 'danger',
      DEFAULT: 'info',
    };

    return `
      <div class="page-enter">
        ${Components.renderTopbar('Audit Logs')}

        <div class="card">
          <div class="section-header">
            <div class="toolbar">
              <div class="search-bar" style="max-width:180px;">
                ${Icons.search}
                <input class="input" type="text" placeholder="Filter action…" id="auditActionFilter" value="${filters.action}">
              </div>
              <select class="input" id="auditResourceFilter" style="max-width:160px;">
                <option value="">All Resources</option>
                ${['USER', 'ROLE', 'PERMISSION', 'ORGANIZATION', 'AUTH']
                  .map(
                    (r) =>
                      `<option value="${r}" ${filters.resource === r ? 'selected' : ''}>${r}</option>`,
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${
                  logs.length
                    ? logs
                        .map((l) => {
                          const color =
                            actionColors[l.action] || actionColors.DEFAULT;
                          const ts = new Date(l.createdAt).toLocaleString();
                          const userName = l.user
                            ? `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() ||
                              l.user.email
                            : '—';
                          return `
                    <tr>
                      <td style="white-space:nowrap;font-size:0.78rem;">${ts}</td>
                      <td><span class="badge badge-${color}">${l.action}</span></td>
                      <td><span style="font-size:0.78rem;color:var(--text-muted)">${l.resource || '—'}${l.resourceId ? ` #${l.resourceId.slice(0, 8)}` : ''}</span></td>
                      <td style="font-size:0.82rem;">${userName}</td>
                      <td style="font-size:0.78rem;color:var(--text-muted)">${l.ipAddress || '—'}</td>
                      <td>
                        ${l.metadata ? `<button class="btn btn-sm btn-ghost" data-view-details='${JSON.stringify(l.metadata).replace(/'/g, '&#39;')}' title="View Details">${Icons.audit}</button>` : '—'}
                      </td>
                    </tr>`;
                        })
                        .join('')
                    : `<tr><td colspan="6"><div class="empty-state"><p>No audit logs found</p></div></td></tr>`
                }
              </tbody>
            </table>
          </div>
          ${Components.renderPagination(page, limit, total)}
        </div>
      </div>`;
  }

  function init() {
    // Action filter
    const actionInput = document.getElementById('auditActionFilter');
    if (actionInput) {
      let debounce;
      actionInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          filters.action = e.target.value.trim();
          page = 1;
          await load();
          App.renderCurrentPage();
        }, 400);
      });
    }

    // Resource filter
    const resourceSelect = document.getElementById('auditResourceFilter');
    if (resourceSelect) {
      resourceSelect.addEventListener('change', async (e) => {
        filters.resource = e.target.value;
        page = 1;
        await load();
        App.renderCurrentPage();
      });
    }

    // Pagination
    document.querySelectorAll('[data-page-nav]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        page = Number(btn.dataset.pageNav);
        await load();
        App.renderCurrentPage();
      });
    });

    // View details
    document.querySelectorAll('[data-view-details]').forEach((btn) => {
      btn.addEventListener('click', () => {
        try {
          const details = JSON.parse(btn.dataset.viewDetails);
          const body = `<pre style="font-size:0.78rem;color:var(--text-secondary);white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;background:var(--bg-input);padding:1rem;border-radius:0.5rem;">${JSON.stringify(details, null, 2)}</pre>`;
          Components.openModal('Log Details', body);
        } catch {
          /* ignore parse errors */
        }
      });
    });
  }

  return { load, render, init };
})();
