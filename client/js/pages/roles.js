// ============================================================================
// Roles Page — list, create, edit, delete, assign permissions
// ============================================================================

const RolesPage = (() => {
  let roles = [];
  let permissions = [];
  let total = 0;
  let page = 1;
  const limit = 20;

  async function load() {
    try {
      const [rRes, pRes] = await Promise.all([
        API.roles.list({ page, limit }),
        API.permissions.list({ limit: 200 }),
      ]);
      roles = rRes.data || [];
      total = rRes.meta?.totalCount ?? roles.length;
      permissions = pRes.data || [];
    } catch (err) {
      Components.toast(err.message || 'Failed to load roles', 'error');
    }
  }

  function render() {
    return `
      <div class="page-enter">
        ${Components.renderTopbar('Roles & Permissions', `<button class="btn btn-primary" id="addRoleBtn">${Icons.plus} Add Role</button>`)}

        <div class="card">
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Scope</th>
                  <th>System</th>
                  <th>Users</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${
                  roles.length
                    ? roles
                        .map((r) => {
                          const permCount = r.rolePermissions?.length || 0;
                          const isSystem = r.isSystem;
                          return `
                    <tr>
                      <td style="font-weight:550;color:var(--text-primary)">${r.name}</td>
                      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.description || '—'}</td>
                      <td><span class="badge ${r.organizationId ? 'badge-info' : 'badge-warning'}">${r.organizationId ? 'Org' : 'Global'}</span></td>
                      <td><span class="badge ${isSystem ? 'badge-purple' : 'badge-info'}">${isSystem ? 'System' : 'Custom'}</span></td>
                      <td><span class="badge badge-info">${r._count?.userRoles ?? 0}</span></td>
                      <td><span class="badge badge-info">${permCount} perms</span></td>
                      <td>
                        <div class="toolbar">
                          <button class="btn btn-sm" data-edit-role="${r.id}" title="Edit" ${isSystem ? 'disabled' : ''}>${Icons.edit}</button>
                          <button class="btn btn-sm" data-assign-perms="${r.id}" title="Assign Permissions">${Icons.key}</button>
                          <button class="btn btn-sm btn-danger" data-delete-role="${r.id}" title="Delete" ${isSystem ? 'disabled' : ''}>${Icons.trash}</button>
                        </div>
                      </td>
                    </tr>`;
                        })
                        .join('')
                    : `<tr><td colspan="7"><div class="empty-state"><p>No roles found</p></div></td></tr>`
                }
              </tbody>
            </table>
          </div>
          ${Components.renderPagination(page, limit, total)}
        </div>
      </div>`;
  }

  function init() {
    // Pagination
    document.querySelectorAll('[data-page-nav]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        page = Number(btn.dataset.pageNav);
        await load();
        App.renderCurrentPage();
      });
    });

    // Add role
    document
      .getElementById('addRoleBtn')
      ?.addEventListener('click', () => showRoleModal());

    // Edit role
    document.querySelectorAll('[data-edit-role]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        const r = roles.find((r) => r.id === btn.dataset.editRole);
        if (r) showRoleModal(r);
      });
    });

    // Delete role
    document.querySelectorAll('[data-delete-role]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this role?')) return;
        try {
          await API.roles.delete(btn.dataset.deleteRole);
          Components.toast('Role deleted', 'success');
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(err.message || 'Delete failed', 'error');
        }
      });
    });

    // Assign permissions
    document.querySelectorAll('[data-assign-perms]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = roles.find((r) => r.id === btn.dataset.assignPerms);
        if (r) showPermAssignModal(r);
      });
    });
  }

  function showRoleModal(role = null) {
    const isEdit = !!role;
    const body = `
      <div class="input-group">
        <label>Name</label>
        <input class="input" id="modalRoleName" value="${role?.name || ''}" placeholder="EDITOR">
      </div>
      <div class="input-group">
        <label>Description</label>
        <input class="input" id="modalRoleDesc" value="${role?.description || ''}" placeholder="Can edit content">
      </div>`;
    const footer = `
      <button class="btn" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modalSaveRole">${isEdit ? 'Update' : 'Create'}</button>`;
    Components.openModal(isEdit ? 'Edit Role' : 'Create Role', body, footer);

    document
      .getElementById('modalSaveRole')
      .addEventListener('click', async () => {
        const data = {
          name: document.getElementById('modalRoleName').value.trim(),
          description: document.getElementById('modalRoleDesc').value.trim(),
        };
        try {
          if (isEdit) await API.roles.update(role.id, data);
          else await API.roles.create(data);
          Components.toast(`Role ${isEdit ? 'updated' : 'created'}`, 'success');
          Components.closeModal();
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(err.message || 'Save failed', 'error');
        }
      });
  }

  function showPermAssignModal(role) {
    const currentPermIds = (role.rolePermissions || [])
      .map((p) => p.permission?.id || p.permissionId)
      .filter(Boolean);

    // Group permissions by resource
    const grouped = {};
    permissions.forEach((p) => {
      const resource = p.resource || 'OTHER';
      if (!grouped[resource]) grouped[resource] = [];
      grouped[resource].push(p);
    });

    const body = `
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:1rem;">
        Assign permissions to <strong>${role.name}</strong>
      </p>
      <div style="max-height:300px;overflow-y:auto;" id="permCheckboxes">
        ${Object.entries(grouped)
          .map(
            ([resource, perms]) => `
          <div style="margin-bottom:0.75rem;">
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:0.3rem;">${resource}</div>
            ${perms
              .map(
                (p) => `
              <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;cursor:pointer;padding:0.2rem 0;">
                <input type="checkbox" value="${p.id}" ${currentPermIds.includes(p.id) ? 'checked' : ''}>
                <code style="font-size:0.75rem;color:var(--text-secondary)">${p.action}</code>
              </label>`,
              )
              .join('')}
          </div>`,
          )
          .join('')}
      </div>`;
    const footer = `
      <button class="btn" onclick="Components.closeModal()">Cancel</button>
      <button class="btn btn-primary" id="modalSavePerms">Save</button>`;
    Components.openModal('Assign Permissions', body, footer);

    document
      .getElementById('modalSavePerms')
      .addEventListener('click', async () => {
        const checked = [
          ...document.querySelectorAll('#permCheckboxes input:checked'),
        ].map((c) => c.value);
        try {
          await API.roles.assignPerms(role.id, { permissionIds: checked });
          Components.toast('Permissions updated', 'success');
          Components.closeModal();
          await load();
          App.renderCurrentPage();
        } catch (err) {
          Components.toast(
            err.message || 'Failed to assign permissions',
            'error',
          );
        }
      });
  }

  return { load, render, init };
})();
