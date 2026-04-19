class ParkingManager extends BaseBookingManager {
    #spaces         = ['espacio1', 'espacio2', 'espacio3', 'espacio4'];
    #reservedSpaces = {};
    #parkingStates  = {};
    #selectedIdx    = null;
    #cancelIdx      = null;

    constructor() {
        super();
        this.#render();
        this.#listenReservations();
        this.#listenParkingStates();
        this._bindPaymentEvents();
        this.#bindModalEvents();
        this.#checkAdminControls();
        window._parkingMgr = this;
    }

    _getSpotLabel() {
        return `Espacio ${this.#selectedIdx + 1}`;
    }

    async _saveReservation(data) {
        const key = this.#spaces[this.#selectedIdx];
        await db.collection('iotReservations').doc(key).set({
            ...data,
            spotId: key
        });
        await db.collection('reservationHistory').add({
            timestamp: data.timestamp,
            space:     this._getSpotLabel(),
            name:      data.userName,
            plate:     data.plateNumber,
            reference: data.reference,
            amount:    data.amount,
            hours:     data.hours,
            status:    'Reservado'
        });
    }

    #listenReservations() {
        db.collection('iotReservations').onSnapshot(snap => {
            this.#reservedSpaces = {};
            snap.forEach(doc => { this.#reservedSpaces[doc.id] = doc.data(); });
            this.#refreshCards();
        });
    }

    #listenParkingStates() {
        db.collection('parking').doc('estado').onSnapshot(doc => {
            this.#parkingStates = doc.exists ? doc.data() : {};
            this.#refreshCards();
        });
    }

    static #carSVG(index) {
        return `
            <svg class="car-top-view" id="carSvg${index}" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <text class="bay-p-marker" x="20" y="44" text-anchor="middle"
                    font-size="28" font-weight="900" font-family="Inter,sans-serif"
                    fill="rgba(40,167,69,0.28)">P</text>
                <rect class="car-body"  x="5"  y="6"  width="30" height="60" rx="8"/>
                <rect x="9"  y="12" width="22" height="14" rx="3" fill="rgba(255,255,255,0.32)"/>
                <rect x="9"  y="46" width="22" height="12" rx="3" fill="rgba(255,255,255,0.18)"/>
                <rect class="car-wheel" x="1"  y="14" width="6" height="12" rx="3"/>
                <rect class="car-wheel" x="33" y="14" width="6" height="12" rx="3"/>
                <rect class="car-wheel" x="1"  y="46" width="6" height="12" rx="3"/>
                <rect class="car-wheel" x="33" y="46" width="6" height="12" rx="3"/>
            </svg>`;
    }

    #render() {
        const container = document.getElementById('spacesContainer');
        if (!container) return;
        container.innerHTML = this.#spaces.map((_, i) => `
            <div class="col-sm-6 col-xl-3">
                <div class="card sensor-card">
                    <div class="card-header">
                        <i class="fa-solid fa-square-parking me-2"></i>Espacio ${i + 1}
                    </div>
                    <div class="card-body">
                        <div class="parking-bay bay-available" id="bay${i + 1}">
                            ${ParkingManager.#carSVG(i + 1)}
                        </div>
                        <span class="status-pill available" id="sensor${i + 1}">Disponible</span>
                        <div id="reservedInfo${i + 1}" class="reserved-info" style="display:none;"></div>
                        <button id="reserveButton${i + 1}" class="reserve-btn"
                            onclick="window._parkingMgr.openForm(${i})">
                            <i class="fa-solid fa-calendar-plus me-1"></i>Reservar
                        </button>
                        <button id="cancelButton${i + 1}"
                            class="btn btn-sm btn-outline-danger w-100 mt-2"
                            style="display:none;"
                            onclick="window._parkingMgr.openCancel(${i})">
                            <i class="fa-solid fa-xmark me-1"></i>Cancelar reserva
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    #refreshCards() {
        let available = 0;
        for (let i = 0; i < this.#spaces.length; i++) {
            const key    = this.#spaces[i];
            const estado = this.#parkingStates[key] || 'disponible';
            this.#updateCard(i, estado);
            if (!this.#reservedSpaces[key] && estado === 'disponible') available++;
        }

        const el = document.getElementById('availableSpaces');
        if (el) el.innerText = available;

        const bar = document.getElementById('availabilityBar');
        if (bar) bar.style.width = `${((this.#spaces.length - available) / this.#spaces.length) * 100}%`;

        const counter = document.getElementById('availabilityCounter');
        if (counter) counter.innerHTML = `<strong>${available}</strong> de ${this.#spaces.length} espacios disponibles`;
    }

    #updateCard(i, estadoSensor) {
        const key    = this.#spaces[i];
        const status = document.getElementById(`sensor${i + 1}`);
        const resBtn = document.getElementById(`reserveButton${i + 1}`);
        const canBtn = document.getElementById(`cancelButton${i + 1}`);
        const info   = document.getElementById(`reservedInfo${i + 1}`);
        const bay    = document.getElementById(`bay${i + 1}`);
        if (!status) return;

        if (this.#reservedSpaces[key]) {
            const r = this.#reservedSpaces[key];
            status.textContent   = 'Reservado';
            status.className     = 'status-pill reserved';
            resBtn.disabled      = true;
            canBtn.style.display = 'inline-block';
            info.style.display   = 'block';
            const nameDisplay  = r.userName    || r.name  || '—';
            const plateDisplay = r.plateNumber || r.plate || '—';
            info.innerHTML = `<i class="fa-solid fa-user me-1" style="color:#F8A71C;"></i><strong>${nameDisplay}</strong> &nbsp;·&nbsp; <i class="fa-solid fa-car me-1" style="color:#F8A71C;"></i>${plateDisplay}`;
            if (bay) bay.className = 'parking-bay bay-reserved';
        } else if (estadoSensor === 'disponible') {
            status.textContent   = 'Disponible';
            status.className     = 'status-pill available';
            resBtn.disabled      = false;
            canBtn.style.display = 'none';
            info.style.display   = 'none';
            info.innerHTML       = '';
            if (bay) bay.className = 'parking-bay bay-available';
        } else {
            status.textContent   = 'Ocupado';
            status.className     = 'status-pill occupied';
            resBtn.disabled      = true;
            canBtn.style.display = 'none';
            info.style.display   = 'none';
            info.innerHTML       = '';
            if (bay) bay.className = 'parking-bay bay-occupied';
        }
    }

    #bindModalEvents() {
        document.getElementById('btnConfirmCancel').addEventListener('click', () => this.#confirmCancel());
    }

    openForm(idx) {
        this.#selectedIdx = idx;
        document.getElementById('modalSpotBadge').textContent = `Espacio ${idx + 1}`;
        this._resetPaymentForm();
        new bootstrap.Modal(document.getElementById('bookingModal')).show();
    }

    openCancel(idx) {
        this.#cancelIdx = idx;
        const key       = this.#spaces[idx];
        const r         = this.#reservedSpaces[key];
        const spotLabel = `Espacio ${idx + 1}`;

        document.getElementById('cancelSpotBadge').textContent = spotLabel;
        document.getElementById('cancelSpotName').textContent  = spotLabel;

        if (r) {
            const name  = r.userName    || r.name  || '—';
            const plate = r.plateNumber || r.plate || '—';
            const hours = r.hours ? `${r.hours} hora${r.hours !== 1 ? 's' : ''}` : '—';
            const ref   = r.reference
                ? `<div style="display:flex;justify-content:space-between;margin-bottom:.3rem;"><span><i class="fa-solid fa-hashtag me-1" style="color:#F8A71C;"></i>Referencia</span><strong style="color:#F8A71C;">${r.reference}</strong></div>`
                : '';
            document.getElementById('cancelReservationInfo').innerHTML = `
                ${ref}
                <div style="display:flex;justify-content:space-between;margin-bottom:.3rem;">
                    <span><i class="fa-solid fa-user me-1" style="color:#F8A71C;"></i>Titular</span>
                    <strong style="color:#fff;">${name}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:.3rem;">
                    <span><i class="fa-solid fa-car me-1" style="color:#F8A71C;"></i>Placa</span>
                    <strong style="color:#fff;">${plate}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span><i class="fa-solid fa-clock me-1" style="color:#F8A71C;"></i>Duración</span>
                    <strong style="color:#fff;">${hours}</strong>
                </div>`;
        }

        new bootstrap.Modal(document.getElementById('cancelModal')).show();
    }

    async #confirmCancel() {
        const idx = this.#cancelIdx;
        if (idx === null) return;

        const key  = this.#spaces[idx];
        const snap = await db.collection('iotReservations').doc(key).get();

        if (snap.exists) {
            const d = snap.data();
            await db.collection('reservationHistory').add({
                timestamp: new Date().toISOString(),
                space:     `Espacio ${idx + 1}`,
                name:      d.userName    || d.name  || '',
                plate:     d.plateNumber || d.plate || '',
                status:    'Cancelado'
            });
            await db.collection('iotReservations').doc(key).delete();
        }

        bootstrap.Modal.getInstance(document.getElementById('cancelModal')).hide();
        this.#cancelIdx = null;
    }

    #checkAdminControls() {
        auth.onAuthStateChanged(async user => {
            if (!user) return;
            const snap = await db.collection('users').doc(user.uid).get();
            if (snap.data()?.role === 'admin') {
                const el = document.getElementById('servoControls');
                if (el) el.style.display = '';
            }
        });
    }

    async abrirEntrada()  { await db.collection('control').doc('servos').set({ entrada: 'abrir'  }, { merge: true }); }
    async cerrarEntrada() { await db.collection('control').doc('servos').set({ entrada: 'cerrar' }, { merge: true }); }
    async abrirSalida()   { await db.collection('control').doc('servos').set({ salida:  'abrir'  }, { merge: true }); }
    async cerrarSalida()  { await db.collection('control').doc('servos').set({ salida:  'cerrar' }, { merge: true }); }
}

document.addEventListener('DOMContentLoaded', () => new ParkingManager());
