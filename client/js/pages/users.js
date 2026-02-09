// ============================================================================
// Users Page — list, create, edit, activate/deactivate, assign roles
// ============================================================================

const UsersPage = (() => {
  let users = [];
  let roles = [];
  let total = 0;
  let page = 1;
  const limit = 10;
  let searchTerm = '';

  async function load() {
    try {
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;
      const [uRes, rRes] = await Promise.all([
        API.users.list(params),
        API.roles.list({ limit: 100 }),
      ]);
      users = uRes.data || [];
      total = uRes.meta?.totalCount ?? users.length;
      roles = rRes.data || [];
    } catch (err) {
      Components.toast(err.message || 'Failed to load users', 'error');
    }
  }

  function render() {
    return `
      <div class="page-enter">
        ${Components.renderTopbar('Users', `<button class="btn btn-primary" id="addUserBtn">${Icons.plus} Add User</button>`)}

        <div class="card">
          <div class="section-header">
            <div class="search-bar">
              ${Icons.search}
              <input class="input" type="text" placeholder="Search users…" id="userSearch" value="${searchTerm}">
            </div>
          </div>

          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${
                  users.length
                    ? users
                        .map((u) => {
                          const name =
                            `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
                            '—';
                          const roleNames = (u.userRoles || [])
                            .map((r) => r.role?.name || r.roleName || '')
                            .filter(Boolean);
                          const active = u.isActive !== false;
                          return `
                    <tr>
                      <td style="font-weight:550;color:var(--text-primary)">${name}</td>
                      <td>${u.email}</td>
                      <td>
                        <div class="role-pills">
                          ${roleNames.length ? roleNames.map((r) => `<span class="badge badge-role">${r}</span>`).join('') : '<span class="badge badge-info">None</span>'}
                        </div>
                      </td>
                      <td><span class="badge ${active ? 'badge-active' : 'badge-inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div class="toolbar">
                          <button class="btn btn-sm" data-edit-user="${u.id}" title="Edit">${Icons.edit}</button>
                          <button class="btn btn-sm" data-toggle-user="${u.id}" data-active="${active}" title="${active ? 'Deactivate' : 'Activate'}">
                            ${active ? Icons.userX : Icons.userCheck}
                          </button>
                          <button class="btn btn-sm" data-assign-roles="${u.id}" title="Assign Roles">${Icons.shield}</button>
                        </div>
                      </td>
                    </tr>`;
                        })
                        .join('')
                    : `<tr><td colspan="5"><div class="empty-state"><p>No users found</p></div></td></tr>`
                }
              </tbody>
            </table>
          </div>

          ${Components.renderPagination(page, limit, total)}
        </div>
      </div>`;
  }

  function init() {
    // Search
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
          searchTerm = e.target.value.trim();
          page = 1;
          await load();
          App.renderCurrentPage();
        }, 400);
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

    // Add user
    document
      .getElementById('addUserBtn')
      ?.addEventListener('click', () => showUserModal());

    // Edit
    document.querySelectorAll('[data-edit-user]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = users.find((u) => u.id === btn.dataset.editUser);
        if (u) showUserModal(u);
      });
    });

    // Toggle active
    document.querySelectorAll('[data-toggle-user]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.toggleUser;
        const active = btn.dataset.active === 'true';
        try {
          if (active) await API.users.deactivate(id);
          else await API.users.activate(id);
          Components.toast(
            `User ${active ? 'deactivated' : 'activated'}`,
            'success',
          );
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(err.message || 'Action failed', 'error');
        }
      });
    });

    // Assign roles
    document.querySelectorAll('[data-assign-roles]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const u = users.find((u) => u.id === btn.dataset.assignRoles);
        if (u) showRoleAssignModal(u);
      });
    });
  }

  // ─── User Create/Edit Modal ─────────────────────────────────────────────
  function showUserModal(user = null) {
    const isEdit = !!user;
    const body = `
      <div class="input-group">
        <label>First Name</label>
        <input class="input" id="modalFirstName" value="${user?.firstName || ''}" placeholder="John">
      </div>
      <div class="input-group">
        <label>Last Name</label>
        <input class="input" id="modalLastName" value="${user?.lastName || ''}" placeholder="Doe">
      </div>
      <div class="input-group">
        <label>Email</label>
        <input class="input" type="email" id="modalEmail" value="${user?.email || ''}" placeholder="john@acme.com" ${isEdit ? 'disabled' : ''}>
      </div>
      ${
        !isEdit
          ? `
        <div class="input-group">
          <label>Password</label>
          <input class="input" type="password" id="modalPassword" placeholder="Min 8 chars">
        </div>`
          : ''
      }
    `;
    const footer = `
      <button class="btn" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modalSaveUser">${isEdit ? 'Update' : 'Create'}</button>
    `;
    Components.openModal(isEdit ? 'Edit User' : 'Add User', body, footer);

    document
      .getElementById('modalSaveUser')
      .addEventListener('click', async () => {
        const data = {
          firstName: document.getElementById('modalFirstName').value.trim(),
          lastName: document.getElementById('modalLastName').value.trim(),
        };
        if (!isEdit) {
          data.email = document.getElementById('modalEmail').value.trim();
          data.password = document.getElementById('modalPassword').value;
        }
        try {
          if (isEdit) await API.users.update(user.id, data);
          else await API.users.create(data);
          Components.toast(`User ${isEdit ? 'updated' : 'created'}`, 'success');
          Components.closeModal();
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(err.message || 'Save failed', 'error');
        }
      });
  }

  // ─── Role Assign Modal ──────────────────────────────────────────────────
  function showRoleAssignModal(user) {
    const currentRoleIds = (user.userRoles || [])
      .map((r) => r.role?.id || r.roleId)
      .filter(Boolean);
    const body = `
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem;">
        Assign roles to <strong>${user.firstName || user.email}</strong>
      </p>
      <div style="display:flex;flex-direction:column;gap:0.5rem;" id="roleCheckboxes">
        ${roles
          .map(
            (r) => `
          <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;cursor:pointer;">
            <input type="checkbox" value="${r.id}" ${currentRoleIds.includes(r.id) ? 'checked' : ''}>
            <span class="badge badge-role">${r.name}</span>
          </label>`,
          )
          .join('')}
      </div>`;
    const footer = `
      <button class="btn" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modalSaveRoles">Save Roles</button>`;
    Components.openModal('Assign Roles', body, footer);

    document
      .getElementById('modalSaveRoles')
      .addEventListener('click', async () => {
        const checked = [
          ...document.querySelectorAll('#roleCheckboxes input:checked'),
        ].map((c) => c.value);
        try {
          await API.users.assignRoles(user.id, { roleIds: checked });
          Components.toast('Roles updated', 'success');
          Components.closeModal();
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(err.message || 'Failed to assign roles', 'error');
        }
      });
  }

  return { load, render, init };
})();
