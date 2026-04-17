class ParkingManager {
  #spaces = ['espacio1', 'espacio2', 'espacio3', 'espacio4'];
  #reservedSpaces = {};
  #parkingStates = {};

  constructor() {
    this.#render();
    this.#listenReservations();
    this.#listenParkingStates();
    window._parkingMgr = this;
  }

  #listenReservations() {
    db.collection('blynkReservations').onSnapshot((snap) => {
      this.#reservedSpaces = {};
      snap.forEach((doc) => {
        this.#reservedSpaces[doc.id] = doc.data();
      });
      this.#refreshCards();
    });
  }

  #listenParkingStates() {
    db.collection('parking').doc('estado').onSnapshot((doc) => {
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
        <rect class="car-body" x="5" y="6" width="30" height="60" rx="8"/>
        <rect x="9" y="12" width="22" height="14" rx="3" fill="rgba(255,255,255,0.32)"/>
        <rect x="9" y="46" width="22" height="12" rx="3" fill="rgba(255,255,255,0.18)"/>
        <rect class="car-wheel" x="1" y="14" width="6" height="12" rx="3"/>
        <rect class="car-wheel" x="33" y="14" width="6" height="12" rx="3"/>
        <rect class="car-wheel" x="1" y="46" width="6" height="12" rx="3"/>
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
              onclick="window._parkingMgr.cancel(${i})">
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
      const key = this.#spaces[i];
      const estado = this.#parkingStates[key] || 'disponible';

      this.#updateCard(i, estado);

      if (!this.#reservedSpaces[key] && estado === 'disponible') {
        available++;
      }
    }

    const el = document.getElementById('availableSpaces');
    if (el) el.innerText = available;
  }

  #updateCard(i, estadoSensor) {
    const key = this.#spaces[i];
    const status = document.getElementById(`sensor${i + 1}`);
    const resBtn = document.getElementById(`reserveButton${i + 1}`);
    const canBtn = document.getElementById(`cancelButton${i + 1}`);
    const info = document.getElementById(`reservedInfo${i + 1}`);
    const bay = document.getElementById(`bay${i + 1}`);
    if (!status) return;

    if (this.#reservedSpaces[key]) {
      const r = this.#reservedSpaces[key];
      status.textContent = 'Reservado';
      status.className = 'status-pill reserved';
      resBtn.disabled = true;
      canBtn.style.display = 'inline-block';
      info.style.display = 'block';
      info.innerHTML = `<i class="fa-solid fa-user me-1" style="color:#F8A71C;"></i><strong>${r.name}</strong> &nbsp;·&nbsp; <i class="fa-solid fa-car me-1" style="color:#F8A71C;"></i>${r.plate}`;
      if (bay) bay.className = 'parking-bay bay-reserved';
    } else if (estadoSensor === 'disponible') {
      status.textContent = 'Disponible';
      status.className = 'status-pill available';
      resBtn.disabled = false;
      canBtn.style.display = 'none';
      info.style.display = 'none';
      info.innerHTML = '';
      if (bay) bay.className = 'parking-bay bay-available';
    } else {
      status.textContent = 'Ocupado';
      status.className = 'status-pill occupied';
      resBtn.disabled = true;
      canBtn.style.display = 'none';
      info.style.display = 'none';
      info.innerHTML = '';
      if (bay) bay.className = 'parking-bay bay-occupied';
    }
  }

  openForm(idx) {
    document.getElementById('reserveForm').reset();
    document.getElementById('sensorToReserve').value = idx;
    new bootstrap.Modal(document.getElementById('reservationModal')).show();
  }

  async reserve() {
    const idx = document.getElementById('sensorToReserve').value;
    const key = this.#spaces[idx];
    const name = document.getElementById('name').value.trim();
    const plate = document.getElementById('plate').value.trim();

    if (!name || !plate) {
      alert('Completa todos los campos.');
      return;
    }

    await db.collection('blynkReservations').doc(key).set({ name, plate });
    await db.collection('reservationHistory').add({
      timestamp: new Date().toISOString(),
      space: `Espacio ${parseInt(idx) + 1}`,
      name,
      plate,
      status: 'Reservado'
    });

    bootstrap.Modal.getInstance(document.getElementById('reservationModal')).hide();
  }

  async cancel(idx) {
    const key = this.#spaces[idx];
    if (!confirm(`¿Cancelar la reserva del Espacio ${idx + 1}?`)) return;

    const snap = await db.collection('blynkReservations').doc(key).get();
    if (snap.exists) {
      const { name, plate } = snap.data();
      await db.collection('reservationHistory').add({
        timestamp: new Date().toISOString(),
        space: `Espacio ${idx + 1}`,
        name,
        plate,
        status: 'Cancelado'
      });
      await db.collection('blynkReservations').doc(key).delete();
    }
  }

  async abrirEntrada() {
    await db.collection('control').doc('servos').set({ entrada: 'abrir' }, { merge: true });
  }

  async cerrarEntrada() {
    await db.collection('control').doc('servos').set({ entrada: 'cerrar' }, { merge: true });
  }

  async abrirSalida() {
    await db.collection('control').doc('servos').set({ salida: 'abrir' }, { merge: true });
  }

  async cerrarSalida() {
    await db.collection('control').doc('servos').set({ salida: 'cerrar' }, { merge: true });
  }
}

document.addEventListener('DOMContentLoaded', () => new ParkingManager());
