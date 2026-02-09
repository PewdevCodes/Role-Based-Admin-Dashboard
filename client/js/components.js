// ============================================================================
// Reusable UI Components — sidebar, toasts, modals
// ============================================================================

const Components = (() => {
  // ─── Toast ──────────────────────────────────────────────────────────────
  function toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  // ─── Modal ──────────────────────────────────────────────────────────────
  function openModal(title, bodyHtml, footerHtml) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" aria-label="Close">${Icons.x}</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').onclick = closeModal;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    return overlay;
  }

  function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
  }

  // ─── Sidebar ────────────────────────────────────────────────────────────
  function renderSidebar(activePage) {
    const user = API.getUser();
    const initial =
      user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?';
    const name = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'User';
    const roleBadge = user?.userRoles?.[0]?.role?.name || 'User';

    const navItems = [
      { id: 'dashboard', icon: Icons.dashboard, label: 'Dashboard' },
      { id: 'users', icon: Icons.users, label: 'Users' },
      { id: 'roles', icon: Icons.shield, label: 'Roles' },
      { id: 'audit', icon: Icons.audit, label: 'Audit Logs' },
    ];

    return `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <h1>RBAC Admin</h1>
          <span>Role Management</span>
        </div>

        <nav class="nav-section">
          <div class="nav-section-title">Navigation</div>
          ${navItems
            .map(
              (n) => `
            <div class="nav-item ${activePage === n.id ? 'active' : ''}" data-page="${n.id}">
              ${n.icon}<span>${n.label}</span>
            </div>`,
            )
            .join('')}
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
              <div class="user-name">${name}</div>
              <div class="user-role">${roleBadge}</div>
            </div>
            <button class="btn-ghost btn-sm" id="logoutBtn" title="Sign out">${Icons.logout}</button>
          </div>
        </div>
      </aside>`;
  }

  // ─── Page Header ────────────────────────────────────────────────────────
  function renderTopbar(title, actionsHtml = '') {
    const theme = document.documentElement.getAttribute('data-theme');
    return `
      <div class="topbar">
        <h2>${title}</h2>
        <div class="topbar-actions">
          ${actionsHtml}
          <div class="theme-toggle" id="themeToggle" title="Toggle theme">
            <div class="theme-toggle-knob">
              ${theme === 'dark' ? Icons.moon : Icons.sun}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ─── Pagination ─────────────────────────────────────────────────────────
  function renderPagination(page, limit, total) {
    const totalPages = Math.ceil(total / limit) || 1;
    return `
      <div class="pagination">
        <span>Showing ${Math.min((page - 1) * limit + 1, total)}–${Math.min(page * limit, total)} of ${total}</span>
        <div class="pagination-buttons">
          <button class="btn btn-sm" ${page <= 1 ? 'disabled' : ''} data-page-nav="${page - 1}">${Icons.chevronLeft} Prev</button>
          <button class="btn btn-sm" ${page >= totalPages ? 'disabled' : ''} data-page-nav="${page + 1}">Next ${Icons.chevronRight}</button>
        </div>
      </div>`;
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  function loading() {
    return `<div class="loading-center"><div class="spinner"></div></div>`;
  }

  return {
    toast,
    openModal,
    closeModal,
    renderSidebar,
    renderTopbar,
    renderPagination,
    loading,
  };
})();
