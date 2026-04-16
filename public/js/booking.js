class BookingManager {
    #spots;
    #formData;
    #selectedSpot;
    #parkedCars;

    constructor() {
        this.#spots        = document.getElementsByClassName('parking-spot');
        this.#formData     = {};
        this.#selectedSpot = null;
        this.#parkedCars   = {};
        this.#bindEvents();
        this.#listenReservations();
    }

    #listenReservations() {
        db.collection('reservations').onSnapshot(snap => {
            this.#parkedCars = {};
            snap.forEach(doc => { this.#parkedCars[doc.id] = doc.data(); });
            this.#renderLot();
        });
    }

    /* Top-down car SVG — red for occupied, ghost outline for free */
    static #spotHTML(id, occupied) {
        if (occupied) {
            return `
                <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="5" y="6" width="30" height="60" rx="8" fill="#dc3545"/>
                  <rect x="9" y="12" width="22" height="14" rx="3" fill="rgba(255,255,255,0.32)"/>
                  <rect x="9" y="46" width="22" height="12" rx="3" fill="rgba(255,255,255,0.18)"/>
                  <rect x="1" y="14" width="6" height="12" rx="3" fill="#1a1a1a"/>
                  <rect x="33" y="14" width="6" height="12" rx="3" fill="#1a1a1a"/>
                  <rect x="1" y="46" width="6" height="12" rx="3" fill="#1a1a1a"/>
                  <rect x="33" y="46" width="6" height="12" rx="3" fill="#1a1a1a"/>
                </svg>
                <span class="spot-label">${id}</span>
                <span class="spot-status spot-status-ocupado">Ocupado</span>`;
        }
        return `
            <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="opacity:.18">
              <rect x="5" y="6" width="30" height="60" rx="8" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="4 3"/>
            </svg>
            <span class="spot-label">${id}</span>
            <span class="spot-status spot-status-libre">Libre</span>`;
    }

    #renderLot() {
        for (const spot of this.#spots) {
            spot.style.pointerEvents = 'none';
            const id = spot.getAttribute('data-spot');
            const occupied = !!this.#parkedCars[id];
            if (occupied) {
                spot.classList.add('bg-danger');
                spot.classList.remove('bg-success');
            } else {
                spot.classList.remove('bg-danger', 'bg-success');
            }
            spot.innerHTML = BookingManager.#spotHTML(id, occupied);
        }
    }

    #enableSpots() {
        for (const spot of this.#spots) {
            if (!spot.classList.contains('bg-danger')) {
                spot.style.pointerEvents = 'auto';
            }
        }
    }

    #bindEvents() {
        document.getElementById('registrationForm')
            .addEventListener('submit', e => { e.preventDefault(); this.#handleForm(); });
        document.getElementById('parkingLot')
            .addEventListener('click', e => this.#handleSpotClick(e));
        document.getElementById('confirmReservation')
            .addEventListener('click', () => this.#confirmReservation());
    }

    async #handleForm() {
        const documentNumber = document.getElementById('documentNumber').value.trim();
        const userName       = document.getElementById('userName').value.trim();
        const plateNumber    = document.getElementById('plateNumber').value.trim();
        let valid = true;

        const existing = await db.collection('reservations')
            .where('documentNumber', '==', documentNumber).limit(1).get();
        if (!existing.empty) {
            alert('Este usuario ya tiene un puesto reservado.');
            return;
        }

        if (!/^\d+$/.test(documentNumber)) {
            document.getElementById('documentNumberError').textContent = 'Solo dígitos permitidos.';
            valid = false;
        } else {
            document.getElementById('documentNumberError').textContent = '';
        }
        if (/\d/.test(userName)) {
            document.getElementById('userNameError').textContent = 'El nombre no debe contener números.';
            valid = false;
        } else {
            document.getElementById('userNameError').textContent = '';
        }
        if (!/^[A-Za-z0-9]{6}$/.test(plateNumber)) {
            document.getElementById('plateNumberError').textContent = 'La placa debe tener exactamente 6 caracteres alfanuméricos.';
            valid = false;
        } else {
            document.getElementById('plateNumberError').textContent = '';
        }

        if (!valid) return;

        this.#formData = { documentNumber, userName, plateNumber };
        document.getElementById('registrationForm').reset();
        this.#enableSpots();
        new bootstrap.Modal(document.getElementById('successModal')).show();
    }

    #handleSpotClick(e) {
        const target = e.target.closest('.parking-spot');
        if (!target || target.classList.contains('bg-danger')) return;

        if (this.#selectedSpot) {
            document.getElementById('parkingSpotInfoModal').querySelector('.modal-body p').textContent =
                'Ya seleccionaste un puesto anteriormente.';
        } else {
            this.#selectedSpot = target.getAttribute('data-spot');
            document.getElementById('parkingSpotInfoModal').querySelector('.modal-body p').textContent =
                `¿Deseas reservar el puesto ${this.#selectedSpot}?`;
        }
        new bootstrap.Modal(document.getElementById('parkingSpotInfoModal')).show();
    }

    async #confirmReservation() {
        if (!this.#selectedSpot || !this.#formData.userName) return;

        await db.collection('reservations').doc(this.#selectedSpot).set({
            ...this.#formData,
            spotId:    this.#selectedSpot,
            timestamp: new Date().toISOString()
        });

        bootstrap.Modal.getInstance(document.getElementById('parkingSpotInfoModal')).hide();
        this.#selectedSpot = null;
        this.#formData     = {};
    }
}

document.addEventListener('DOMContentLoaded', () => new BookingManager());
