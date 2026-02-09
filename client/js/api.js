// ============================================================================
// API Client — handles all backend communication
// ============================================================================

const API = (() => {
  const BASE = '/api/v1';
  let accessToken = localStorage.getItem('accessToken') || '';
  let refreshToken = localStorage.getItem('refreshToken') || '';

  function setTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  function clearTokens() {
    accessToken = '';
    refreshToken = '';
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }

  function setUser(u) {
    localStorage.setItem('user', JSON.stringify(u));
  }

  function isAuthenticated() {
    return !!accessToken;
  }

  async function request(method, path, body, isRetry = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    // Build query string for GET with body (used as params)
    let url = `${BASE}${path}`;
    if (body && method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(body).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      delete opts.body;
    }

    const res = await fetch(url, opts);

    // Try refresh on 401
    if (res.status === 401 && !isRetry && refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body, true);
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Session expired');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw {
        status: res.status,
        message: data.error?.message || data.message || 'Request failed',
        data,
      };
    return data;
  }

  async function tryRefresh() {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  const get = (path, params) => request('GET', path, params);
  const post = (path, body) => request('POST', path, body);
  const put = (path, body) => request('PUT', path, body);
  const patch = (path, body) => request('PATCH', path, body);
  const del = (path) => request('DELETE', path);

  // ─── Auth ──────────────────────────────────────────────────────────────
  const auth = {
    login: (body) => post('/auth/login', body),
    register: (body) => post('/auth/register', body),
    logout: () => post('/auth/logout', { refreshToken }),
  };

  // ─── Users ─────────────────────────────────────────────────────────────
  const users = {
    list: (params) => get('/users', params),
    getById: (id) => get(`/users/${id}`),
    create: (body) => post('/users', body),
    update: (id, b) => patch(`/users/${id}`, b),
    deactivate: (id) => post(`/users/${id}/deactivate`),
    activate: (id) => post(`/users/${id}/activate`),
    assignRoles: (id, b) => put(`/users/${id}/roles`, b),
  };

  // ─── Roles ─────────────────────────────────────────────────────────────
  const roles = {
    list: (params) => get('/roles', params),
    getById: (id) => get(`/roles/${id}`),
    create: (body) => post('/roles', body),
    update: (id, b) => patch(`/roles/${id}`, b),
    delete: (id) => del(`/roles/${id}`),
    assignPerms: (id, b) => put(`/roles/${id}/permissions`, b),
  };

  // ─── Permissions ───────────────────────────────────────────────────────
  const permissions = {
    list: (params) => get('/permissions', params),
  };

  // ─── Dashboard ─────────────────────────────────────────────────────────
  const dashboard = {
    stats: () => get('/dashboard/metrics'),
  };

  // ─── Audit ─────────────────────────────────────────────────────────────
  const audit = {
    list: (params) => get('/audit-logs', params),
  };

  // ─── Organizations ─────────────────────────────────────────────────────
  const organizations = {
    list: (params) => get('/organizations', params),
  };

  return {
    setTokens,
    clearTokens,
    getUser,
    setUser,
    isAuthenticated,
    auth,
    users,
    roles,
    permissions,
    dashboard,
    audit,
    organizations,
  };
})();
