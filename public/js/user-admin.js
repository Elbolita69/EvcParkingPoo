class UserAdminManager {
    #users = [];

    constructor() {
        this.#load();
    }

    async #load() {
        try {
            const snap = await db.collection('users').orderBy('createdAt').get();
            this.#users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            this.#render();
        } catch (_) {}
    }

    #render() {
        const container = document.getElementById('userList');
        if (!container) return;
        container.innerHTML = '';

        /* ── Stats bar ─────────────────────────────── */
        const total  = this.#users.length;
        const admins = this.#users.filter(u => u.role === 'admin').length;
        const regular = total - admins;

        const statsRow = document.createElement('div');
        statsRow.className = 'row g-3 mb-4';
        statsRow.innerHTML = `
          <div class="col-sm-4">
            <div class="admin-stat-card">
              <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
              <div>
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total Usuarios</div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="admin-stat-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#1E2A39,#2C3E50);box-shadow:0 3px 10px rgba(30,42,57,.28);">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <div class="stat-value">${admins}</div>
                <div class="stat-label">Administradores</div>
              </div>
            </div>
          </div>
          <div class="col-sm-4">
            <div class="admin-stat-card">
              <div class="stat-icon" style="background:linear-gradient(135deg,#28a745,#20c997);box-shadow:0 3px 10px rgba(40,167,69,.28);">
                <i class="fa-solid fa-user-check"></i>
              </div>
              <div>
                <div class="stat-value">${regular}</div>
                <div class="stat-label">Usuarios Regulares</div>
              </div>
            </div>
          </div>`;
        container.appendChild(statsRow);

        /* ── Section title ─────────────────────────── */
        const title = document.createElement('h6');
        title.className = 'fw-700 mb-3 text-uppercase';
        title.style.cssText = 'color:#718096;letter-spacing:.6px;font-size:.78rem;';
        title.innerHTML = '<i class="fa-solid fa-users me-2" style="color:#F8A71C;"></i>Lista de Usuarios';
        container.appendChild(title);

        /* ── User cards grid ───────────────────────── */
        const grid = document.createElement('div');
        grid.className = 'row g-3';

        this.#users.forEach(usuario => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-xl-4';

            const initials = (usuario.nombre || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const isAdmin  = usuario.role === 'admin';
            const badge    = isAdmin
                ? `<span class="badge-admin"><i class="fa-solid fa-shield-halved me-1"></i>Admin</span>`
                : `<span class="badge-regular"><i class="fa-solid fa-user me-1"></i>Regular</span>`;

            col.innerHTML = `
              <div class="user-card">
                <div class="card-header">
                  <div class="d-flex align-items-center gap-2">
                    <div style="width:32px;height:32px;border-radius:50%;background:rgba(248,167,28,.2);
                                display:flex;align-items:center;justify-content:center;
                                font-size:.8rem;font-weight:800;color:#F8A71C;flex-shrink:0;">
                      ${initials}
                    </div>
                    <span class="text-truncate" style="max-width:160px;" title="${usuario.nombre || ''}">${usuario.nombre || '—'}</span>
                  </div>
                  ${badge}
                </div>
                <div class="card-body">
                  <p><i class="fa-solid fa-envelope me-2" style="color:#F8A71C;width:14px;"></i>${usuario.email || '—'}</p>
                  <p><i class="fa-solid fa-id-badge me-2" style="color:#F8A71C;width:14px;"></i><code style="font-size:.75rem;color:#718096;">${usuario.uid.slice(0,12)}…</code></p>
                  <div class="d-flex gap-2 mt-3 flex-wrap">
                    <button class="btn-admin-edit flex-grow-1" onclick="userAdmin._edit('${usuario.uid}')">
                      <i class="fa-solid fa-pen me-1"></i>Editar
                    </button>
                    <button class="btn-role-toggle" onclick="userAdmin._toggleRole('${usuario.uid}')">
                      <i class="fa-solid fa-arrows-rotate me-1"></i>Rol
                    </button>
                    <button class="btn-admin-delete" onclick="userAdmin._delete('${usuario.uid}')">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>`;
            grid.appendChild(col);
        });

        if (this.#users.length === 0) {
            grid.innerHTML = `<div class="col-12 text-center text-muted py-5">
              <i class="fa-solid fa-users-slash fa-2x mb-3 d-block" style="color:#dee2e6;"></i>
              No hay usuarios registrados.
            </div>`;
        }

        container.appendChild(grid);
    }

    async _toggleRole(uid) {
        const user    = this.#users.find(u => u.uid === uid);
        const newRole = user.role === 'admin' ? 'regular' : 'admin';
        await db.collection('users').doc(uid).update({ role: newRole });
        await this.#load();
    }

    async _delete(uid) {
        if (!confirm('¿Eliminar este usuario del sistema?')) return;
        await db.collection('users').doc(uid).delete();
        await this.#load();
    }

    _edit(uid) {
        const usuario = this.#users.find(u => u.uid === uid);
        if (!usuario) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        overlay.innerHTML = `
          <div style="background:white;border-radius:14px;width:100%;max-width:420px;box-shadow:0 12px 48px rgba(0,0,0,.25);">
            <div style="background:linear-gradient(135deg,#1E2A39,#2C3E50);color:white;padding:.9rem 1.2rem;border-radius:14px 14px 0 0;
                        display:flex;align-items:center;justify-content:space-between;">
              <span style="font-weight:700;font-size:.95rem;"><i class="fa-solid fa-pen me-2"></i>Editar Usuario</span>
              <button id="_editClose" style="background:none;border:none;color:white;font-size:1.1rem;cursor:pointer;padding:0;line-height:1;">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style="padding:1.2rem;">
              <label style="font-size:.8rem;font-weight:600;color:#4a5568;text-transform:uppercase;letter-spacing:.4px;">Nombre</label>
              <input id="_editName" type="text" value="${usuario.nombre || ''}" class="form-control mb-3" placeholder="Nombre completo">
              <label style="font-size:.8rem;font-weight:600;color:#4a5568;text-transform:uppercase;letter-spacing:.4px;">Email</label>
              <input type="email" value="${usuario.email || ''}" class="form-control mb-3" readonly style="background:#f8f9fa;">
              <label style="font-size:.8rem;font-weight:600;color:#4a5568;text-transform:uppercase;letter-spacing:.4px;">Rol</label>
              <select id="_editRole" class="form-select mb-0">
                <option value="admin"   ${usuario.role === 'admin'   ? 'selected' : ''}>Admin</option>
                <option value="regular" ${usuario.role === 'regular' ? 'selected' : ''}>Regular</option>
              </select>
            </div>
            <div style="padding:.9rem 1.2rem;border-top:1px solid #f0f2f5;display:flex;gap:.5rem;justify-content:flex-end;">
              <button id="_editCancel" class="btn btn-outline-secondary" style="border-radius:50px;font-size:.85rem;">Cancelar</button>
              <button id="_editSave" style="background:linear-gradient(135deg,#E8491D,#F8A71C);border:none;color:white;
                      border-radius:50px;padding:.5rem 1.2rem;font-weight:700;font-size:.85rem;cursor:pointer;">
                <i class="fa-solid fa-floppy-disk me-1"></i>Guardar
              </button>
            </div>
          </div>`;

        document.body.appendChild(overlay);

        document.getElementById('_editClose').addEventListener('click',  () => overlay.remove());
        document.getElementById('_editCancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        document.getElementById('_editSave').addEventListener('click', async () => {
            await db.collection('users').doc(uid).update({
                nombre: document.getElementById('_editName').value.trim(),
                role:   document.getElementById('_editRole').value
            });
            overlay.remove();
            await this.#load();
        });
    }
}

const userAdmin = new UserAdminManager();
