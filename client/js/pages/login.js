// ============================================================================
// Login Page
// ============================================================================

const LoginPage = (() => {
  function render() {
    return `
      <div class="login-wrapper page-enter">
        <div class="card login-card">
          <div class="login-header">
            <div class="sidebar-logo"><h1>RBAC Admin</h1></div>
            <h2>Welcome back</h2>
            <p>Sign in to your admin dashboard</p>
          </div>

          <div class="login-error" id="loginError"></div>

          <form id="loginForm" autocomplete="on">
            <div class="input-group">
              <label for="email">Email address</label>
              <input class="input" type="email" id="email" name="email" placeholder="admin@acme.com" required autocomplete="email" value="admin@acme.com">
            </div>
            <div class="input-group">
              <label for="password">Password</label>
              <input class="input" type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password" value="Admin@123">
            </div>
            <div class="input-group">
              <label for="orgSlug">Organization slug</label>
              <input class="input" type="text" id="orgSlug" name="orgSlug" placeholder="acme-corp" value="acme-corp">
            </div>
            <button class="btn btn-primary" type="submit" id="loginBtn">
              Sign in
            </button>
          </form>
          <p style="margin-top: 1.2rem; font-size: 0.75rem; color: var(--text-muted);">
            Default: admin@acme.com / Admin@123 / acme-corp
          </p>
        </div>
      </div>`;
  }

  function init() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');
      errBox.classList.remove('visible');
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      try {
        const body = {
          email: document.getElementById('email').value.trim(),
          password: document.getElementById('password').value,
        };
        const slug = document.getElementById('orgSlug').value.trim();
        if (slug) body.organizationSlug = slug;

        const res = await API.auth.login(body);
        API.setTokens(res.data.accessToken, res.data.refreshToken);
        API.setUser(res.data.user);
        window.location.hash = '#/dashboard';
      } catch (err) {
        errBox.textContent = err.message || 'Login failed';
        errBox.classList.add('visible');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign in';
      }
    });
  }

  return { render, init };
})();
