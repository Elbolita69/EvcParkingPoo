class SpotsManager {
    #parkedCars;

    constructor() {
        auth.onAuthStateChanged(async user => {
            if (!user) { window.location.href = 'Inicio.html'; return; }
            const snap = await db.collection('users').doc(user.uid).get();
            if (snap.data()?.role !== 'admin') { window.location.href = 'Inicio.html'; return; }
            await this.#loadCars();
            this.#bindLogout();
        });
    }

    async #loadCars() {
        const snap = await db.collection('reservations').get();
        this.#parkedCars = {};
        snap.forEach(doc => { this.#parkedCars[doc.id] = doc.data(); });
        this.#renderCars();
    }

    #renderCars() {
        const container = document.getElementById('parkedCarsList');
        if (!container) return;
        container.innerHTML = '';

        const title = document.createElement('h5');
        title.className = 'fw-bold mb-3 mt-2';
        title.style.color = '#1E2A39';
        title.innerHTML = '<i class="fa-solid fa-car me-2" style="color:#F8A71C;"></i>Vehículos estacionados';
        container.appendChild(title);

        const entries = Object.entries(this.#parkedCars);

        if (entries.length === 0) {
            container.insertAdjacentHTML('beforeend',
                `<div class="text-center text-muted py-4">
                    <i class="fa-solid fa-circle-parking fa-2x mb-2 d-block" style="color:#dee2e6;"></i>
                    No hay vehículos estacionados actualmente.
                </div>`);
            return;
        }

        const row = document.createElement('div');
        row.className = 'row g-3';

        entries.forEach(([spot, car]) => {
            const col = document.createElement('div');
            col.className = 'col-sm-6 col-lg-4';
            col.innerHTML = `
                <div class="card user-card">
                    <div class="card-header">
                        <i class="fa-solid fa-car me-2"></i>${car.userName}
                        <span class="float-end badge-admin">${spot}</span>
                    </div>
                    <div class="card-body">
                        <p class="mb-1" style="font-size:.88rem;">
                            <i class="fa-solid fa-id-card me-2" style="color:#F8A71C;"></i>
                            <strong>Documento:</strong> ${car.documentNumber}
                        </p>
                        <p class="mb-2" style="font-size:.88rem;">
                            <i class="fa-solid fa-car me-2" style="color:#F8A71C;"></i>
                            <strong>Placa:</strong> ${car.plateNumber}
                        </p>
                        <button class="btn btn-sm btn-outline-danger" data-spot="${spot}">
                            <i class="fa-solid fa-trash me-1"></i>Liberar puesto
                        </button>
                    </div>
                </div>`;
            row.appendChild(col);
        });

        container.appendChild(row);
        container.querySelectorAll('[data-spot]').forEach(btn => {
            btn.addEventListener('click', () => this.#removeVehicle(btn.dataset.spot));
        });
    }

    async #removeVehicle(spot) {
        await db.collection('reservations').doc(spot).delete();
        await this.#loadCars();
        this.#showConfirm(spot);
    }

    #showConfirm(spot) {
        const overlay = document.createElement('div');
        overlay.className = 'modal fade show';
        overlay.style.display = 'block';
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('role', 'dialog');
        overlay.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fa-solid fa-triangle-exclamation me-2"></i>Confirmar</h5>
                        <button class="btn-close" id="_cfmClose"></button>
                    </div>
                    <div class="modal-body">
                        <p>El puesto <strong>${spot}</strong> fue liberado correctamente.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" id="_cfmOk">Aceptar</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('_cfmOk').addEventListener('click', close);
        document.getElementById('_cfmClose').addEventListener('click', close);
    }

    #bindLogout() {
        const btn = document.getElementById('loginBtn');
        if (!btn) return;
        btn.addEventListener('click', e => {
            e.preventDefault();
            auth.signOut().then(() => {
                const modalEl = document.getElementById('sesionCerradaModal');
                if (modalEl) {
                    new bootstrap.Modal(modalEl).show();
                    setTimeout(() => { window.location.href = 'Login.html'; }, 2000);
                } else {
                    window.location.href = 'Login.html';
                }
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new SpotsManager());
