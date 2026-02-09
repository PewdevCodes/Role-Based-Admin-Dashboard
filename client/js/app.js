// ============================================================================
// App — SPA Router, Theme Toggle, Bootstrap
// ============================================================================

const App = (() => {
  let currentPage = '';

  const pages = {
    login: { module: LoginPage, auth: false },
    dashboard: { module: DashboardPage, auth: true },
    users: { module: UsersPage, auth: true },
    roles: { module: RolesPage, auth: true },
    audit: { module: AuditPage, auth: true },
  };

  // ─── Theme ──────────────────────────────────────────────────────────────
  function getTheme() {
    return localStorage.getItem('theme') || 'dark';
  }

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
    renderCurrentPage(); // re-render to update toggle icon
  }

  // ─── Router ─────────────────────────────────────────────────────────────
  function getRoute() {
    const hash = window.location.hash.replace('#/', '').split('?')[0] || '';
    return hash || 'dashboard';
  }

  async function navigate() {
    const route = getRoute();

    // Auth guard
    if (!API.isAuthenticated() && route !== 'login') {
      window.location.hash = '#/login';
      return;
    }
    if (API.isAuthenticated() && route === 'login') {
      window.location.hash = '#/dashboard';
      return;
    }

    const pageDef = pages[route];
    if (!pageDef) {
      window.location.hash = '#/dashboard';
      return;
    }

    currentPage = route;

    // Load data if the page module has a load function
    if (pageDef.module.load) {
      const app = document.getElementById('app');
      // Show sidebar + loading spinner while data loads
      if (pageDef.auth) {
        app.innerHTML = `
          <div class="app-layout">
            ${Components.renderSidebar(currentPage)}
            <main class="main-content">${Components.loading()}</main>
          </div>`;
        bindSidebar();
      }
      await pageDef.module.load();
    }

    renderCurrentPage();
  }

  function renderCurrentPage() {
    const app = document.getElementById('app');
    const pageDef = pages[currentPage];
    if (!pageDef) return;

    const pageHtml = pageDef.module.render();

    if (pageDef.auth) {
      app.innerHTML = `
        <div class="app-layout">
          ${Components.renderSidebar(currentPage)}
          <main class="main-content">${pageHtml}</main>
        </div>`;
      bindSidebar();
    } else {
      app.innerHTML = pageHtml;
    }

    // Let the page attach its event listeners
    if (pageDef.module.init) pageDef.module.init();

    // Theme toggle
    document
      .getElementById('themeToggle')
      ?.addEventListener('click', toggleTheme);
  }

  // ─── Sidebar events ─────────────────────────────────────────────────────
  function bindSidebar() {
    document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
      item.addEventListener('click', () => {
        window.location.hash = `#/${item.dataset.page}`;
      });
    });

    document
      .getElementById('logoutBtn')
      ?.addEventListener('click', async () => {
        try {
          await API.auth.logout();
        } catch {
          /* ignore */
        }
        API.clearTokens();
        window.location.hash = '#/login';
      });
  }

  // ─── Init ───────────────────────────────────────────────────────────────
  function init() {
    setTheme(getTheme());
    window.addEventListener('hashchange', navigate);
    navigate();
  }

  return { init, renderCurrentPage, toggleTheme };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
