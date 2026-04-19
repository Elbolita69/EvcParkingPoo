class BookingManager extends BaseBookingManager {
    #spots;
    #parkedCars   = {};
    #selectedSpot = null;

    constructor() {
        super();
        this.#spots = document.getElementsByClassName('parking-spot');
        this.#listenReservations();
        this._bindPaymentEvents();
        this.#bindLotEvents();
    }

    _getSpotLabel() {
        return `Puesto ${this.#selectedSpot}`;
    }

    async _saveReservation(data) {
        await db.collection('reservations').doc(this.#selectedSpot).set({
            ...data,
            spotId: this.#selectedSpot
        });
    }

    #listenReservations() {
        db.collection('reservations').onSnapshot(snap => {
            this.#parkedCars = {};
            snap.forEach(doc => { this.#parkedCars[doc.id] = doc.data(); });
            this.#renderLot();
            this.#updateCounter();
        });
    }

    #updateCounter() {
        const total    = this.#spots.length;
        const occupied = Object.keys(this.#parkedCars).length;
        const free     = total - occupied;
        const el  = document.getElementById('availabilityCounter');
        if (el)  el.innerHTML = `<strong>${free}</strong> de ${total} puestos disponibles`;
        const bar = document.getElementById('availabilityBar');
        if (bar) bar.style.width = `${(occupied / total) * 100}%`;
    }

    static #spotHTML(id, occupied) {
        if (occupied) {
            return `
                <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg">
                    <rect x="5"  y="6"  width="30" height="60" rx="8"  fill="#dc3545"/>
                    <rect x="9"  y="12" width="22" height="14" rx="3"  fill="rgba(255,255,255,0.32)"/>
                    <rect x="9"  y="46" width="22" height="12" rx="3"  fill="rgba(255,255,255,0.18)"/>
                    <rect x="1"  y="14" width="6"  height="12" rx="3"  fill="#1a1a1a"/>
                    <rect x="33" y="14" width="6"  height="12" rx="3"  fill="#1a1a1a"/>
                    <rect x="1"  y="46" width="6"  height="12" rx="3"  fill="#1a1a1a"/>
                    <rect x="33" y="46" width="6"  height="12" rx="3"  fill="#1a1a1a"/>
                </svg>
                <span class="spot-label">${id}</span>
                <span class="spot-status spot-status-ocupado">Ocupado</span>`;
        }
        return `
            <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg" style="opacity:.18">
                <rect x="5" y="6" width="30" height="60" rx="8"
                    fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="4 3"/>
            </svg>
            <span class="spot-label">${id}</span>
            <span class="spot-status spot-status-libre">Libre</span>`;
    }

    #renderLot() {
        for (const spot of this.#spots) {
            const id       = spot.getAttribute('data-spot');
            const occupied = !!this.#parkedCars[id];
            spot.style.pointerEvents = occupied ? 'none' : 'auto';
            occupied ? spot.classList.add('bg-danger') : spot.classList.remove('bg-danger');
            spot.innerHTML = BookingManager.#spotHTML(id, occupied);
        }
    }

    #bindLotEvents() {
        document.getElementById('parkingLot').addEventListener('click', e => {
            const t = e.target.closest('.parking-spot');
            if (!t || t.classList.contains('bg-danger')) return;
            this.#openModal(t.getAttribute('data-spot'));
        });
    }

    #openModal(spot) {
        this.#selectedSpot = spot;
        document.getElementById('modalSpotBadge').textContent = `Puesto ${spot}`;
        this._resetPaymentForm();
        new bootstrap.Modal(document.getElementById('bookingModal')).show();
    }
}

document.addEventListener('DOMContentLoaded', () => new BookingManager());
