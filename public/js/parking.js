class ParkingManager {
  #spaces          = ['espacio1','espacio2','espacio3','espacio4'];
  #reservedSpaces  = {};
  #parkingStates   = {};
  #selectedIdx     = null;
  #cancelIdx       = null;
  #step            = 1;
  #formData        = {};
  #selectedHours   = 1;
  #PRICE_PER_HOUR  = 5000;

  constructor() {
    this.#render();
    this.#listenReservations();
    this.#listenParkingStates();
    this.#bindModalEvents();
    window._parkingMgr = this;
  }

  // ── Firestore listeners ──────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────

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
      const nameDisplay  = r.userName  || r.name  || '—';
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

  // ── Booking modal ────────────────────────────────────────────

  #bindModalEvents() {
    document.getElementById('btnStep1Next').addEventListener('click', () => this.#nextStep());
    document.getElementById('btnStep2Back').addEventListener('click', () => this.#goToStep(1));
    document.getElementById('btnStep2Next').addEventListener('click', () => this.#nextStep());
    document.getElementById('btnStep3Back').addEventListener('click', () => this.#goToStep(2));
    document.getElementById('btnPay').addEventListener('click',       () => this.#processPayment());

    document.querySelectorAll('.duration-btn').forEach(btn =>
      btn.addEventListener('click', () => this.#selectDuration(parseInt(btn.dataset.hours)))
    );

    const cardNum = document.getElementById('cardNumber');
    cardNum.addEventListener('input', () => this.#formatCard(cardNum));

    const expiry = document.getElementById('cardExpiry');
    expiry.addEventListener('input', () => this.#formatExpiry(expiry));

    document.getElementById('cardCvv').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    });

    document.getElementById('cardName').addEventListener('input', e => {
      document.getElementById('cardVisualName').textContent =
        e.target.value.toUpperCase() || 'NOMBRE APELLIDO';
    });

    document.getElementById('btnConfirmCancel').addEventListener('click', () => this.#confirmCancel());
  }

  openForm(idx) {
    this.#selectedIdx   = idx;
    this.#step          = 1;
    this.#formData      = {};
    this.#selectedHours = 1;

    document.getElementById('bookingForm')?.reset();
    document.getElementById('cardForm')?.reset();
    document.getElementById('cardVisualNumber').textContent  = '•••• •••• •••• ••••';
    document.getElementById('cardVisualName').textContent    = 'NOMBRE APELLIDO';
    document.getElementById('cardVisualExpiry').textContent  = 'MM/AA';
    document.getElementById('cardTypeIcon').innerHTML        = '<i class="fa-solid fa-credit-card"></i>';
    document.getElementById('modalSpotBadge').textContent    = `Espacio ${idx + 1}`;

    document.querySelectorAll('.duration-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.hours) === 1)
    );
    this.#updatePricePreview();
    this.#goToStep(1);
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
  }

  openCancel(idx) {
    this.#cancelIdx = idx;
    const key = this.#spaces[idx];
    const r   = this.#reservedSpaces[key];
    const spotLabel = `Espacio ${idx + 1}`;

    document.getElementById('cancelSpotBadge').textContent = spotLabel;
    document.getElementById('cancelSpotName').textContent  = spotLabel;

    if (r) {
      const name  = r.userName    || r.name  || '—';
      const plate = r.plateNumber || r.plate || '—';
      const hours = r.hours ? `${r.hours} hora${r.hours !== 1 ? 's' : ''}` : '—';
      const ref   = r.reference ? `<div style="display:flex;justify-content:space-between;margin-bottom:.3rem;"><span><i class="fa-solid fa-hashtag me-1" style="color:#F8A71C;"></i>Referencia</span><strong style="color:#F8A71C;">${r.reference}</strong></div>` : '';
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

  #goToStep(n) {
    this.#step = n;
    document.querySelectorAll('.booking-step-panel').forEach(p =>
      p.classList.toggle('active', parseInt(p.dataset.step) === n)
    );
    document.querySelectorAll('.step-dot').forEach(d => {
      const s = parseInt(d.dataset.step);
      d.classList.toggle('active', s === n);
      d.classList.toggle('done',   s < n);
    });
  }

  #nextStep() {
    if (this.#step === 1 && !this.#validateStep1()) return;
    if (this.#step === 2) this.#fillPaymentSummary();
    this.#goToStep(this.#step + 1);
  }

  #validateStep1() {
    const doc   = document.getElementById('documentNumber').value.trim();
    const name  = document.getElementById('userName').value.trim();
    const plate = document.getElementById('plateNumber').value.trim().toUpperCase();
    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('documentNumberError', !/^\d{5,15}$/.test(doc) ? 'Solo dígitos (5–15 caracteres).' : '');
    setErr('userNameError',       (!name || /\d/.test(name)) ? 'Nombre válido sin números.' : '');
    setErr('plateNumberError',    !/^[A-Z0-9]{5,7}$/.test(plate) ? 'Placa inválida (5–7 caracteres).' : '');
    if (ok) this.#formData = { documentNumber: doc, userName: name, plateNumber: plate };
    return ok;
  }

  #selectDuration(hours) {
    this.#selectedHours = hours;
    document.querySelectorAll('.duration-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.hours) === hours)
    );
    this.#updatePricePreview();
  }

  #updatePricePreview() {
    const total = this.#selectedHours * this.#PRICE_PER_HOUR;
    const now   = new Date();
    const exit  = new Date(now.getTime() + this.#selectedHours * 3600000);
    const fmt   = d => d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('pricePreview').textContent      = `$${total.toLocaleString('es-CO')} COP`;
    document.getElementById('entryTime').textContent         = fmt(now);
    document.getElementById('exitTime').textContent          = fmt(exit);
    document.getElementById('selectedSpotLabel').textContent = `Espacio ${this.#selectedIdx + 1}`;
  }

  #fillPaymentSummary() {
    const total = this.#selectedHours * this.#PRICE_PER_HOUR;
    document.getElementById('paySpot').textContent     = `Espacio ${this.#selectedIdx + 1}`;
    document.getElementById('payPlate').textContent    = this.#formData.plateNumber;
    document.getElementById('payDuration').textContent = `${this.#selectedHours} hora${this.#selectedHours !== 1 ? 's' : ''}`;
    document.getElementById('payTotal').textContent    = `$${total.toLocaleString('es-CO')} COP`;
    document.getElementById('btnPay').textContent      = `Pagar $${total.toLocaleString('es-CO')} COP`;
  }

  #formatCard(input) {
    let raw = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = raw.replace(/(.{4})/g, '$1 ').trim();
    const display = raw.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('cardVisualNumber').textContent = display;
    this.#detectCardType(raw);
  }

  #formatExpiry(input) {
    let raw = input.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    input.value = raw;
    document.getElementById('cardVisualExpiry').textContent = raw || 'MM/AA';
  }

  #detectCardType(num) {
    const el = document.getElementById('cardTypeIcon');
    if (/^4/.test(num))           el.innerHTML = '<i class="fa-brands fa-cc-visa fs-4"></i>';
    else if (/^5[1-5]/.test(num)) el.innerHTML = '<i class="fa-brands fa-cc-mastercard fs-4"></i>';
    else if (/^3[47]/.test(num))  el.innerHTML = '<i class="fa-brands fa-cc-amex fs-4"></i>';
    else                          el.innerHTML = '<i class="fa-solid fa-credit-card"></i>';
  }

  #luhn(num) {
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  #validatePayment() {
    const num    = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const name   = document.getElementById('cardName').value.trim();
    const expiry = document.getElementById('cardExpiry').value;
    const cvv    = document.getElementById('cardCvv').value;
    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('cardNumberError', (num.length < 13 || !this.#luhn(num)) ? 'Número de tarjeta inválido.' : '');
    setErr('cardNameError',   !name ? 'Ingresa el nombre de la tarjeta.' : '');
    const parts   = expiry.split('/');
    const expDate = new Date(2000 + parseInt(parts[1]), parseInt(parts[0]) - 1);
    setErr('cardExpiryError', (!/^\d{2}\/\d{2}$/.test(expiry) || expDate < new Date()) ? 'Fecha inválida o vencida.' : '');
    setErr('cardCvvError',    !/^\d{3,4}$/.test(cvv) ? 'CVV inválido.' : '');
    return ok;
  }

  async #processPayment() {
    if (!this.#validatePayment()) return;

    const btn = document.getElementById('btnPay');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando pago...';

    await new Promise(r => setTimeout(r, 2000));

    const reference = 'EVC-' + Math.random().toString(36).toUpperCase().slice(2, 10);
    const total     = this.#selectedHours * this.#PRICE_PER_HOUR;
    const now       = new Date();
    const exit      = new Date(now.getTime() + this.#selectedHours * 3600000);
    const fmt       = d => d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const key       = this.#spaces[this.#selectedIdx];

    await db.collection('iotReservations').doc(key).set({
      ...this.#formData,
      spotId:        key,
      hours:         this.#selectedHours,
      amount:        total,
      reference,
      entryTime:     now.toISOString(),
      exitTime:      exit.toISOString(),
      paymentStatus: 'confirmado',
      timestamp:     now.toISOString()
    });

    await db.collection('reservationHistory').add({
      timestamp: now.toISOString(),
      space:     `Espacio ${this.#selectedIdx + 1}`,
      name:      this.#formData.userName,
      plate:     this.#formData.plateNumber,
      reference,
      amount:    total,
      hours:     this.#selectedHours,
      status:    'Reservado'
    });

    document.getElementById('confReference').textContent = reference;
    document.getElementById('confSpot').textContent      = `Espacio ${this.#selectedIdx + 1}`;
    document.getElementById('confName').textContent      = this.#formData.userName;
    document.getElementById('confPlate').textContent     = this.#formData.plateNumber;
    document.getElementById('confDuration').textContent  = `${this.#selectedHours} hora${this.#selectedHours !== 1 ? 's' : ''}`;
    document.getElementById('confEntry').textContent     = fmt(now);
    document.getElementById('confExit').textContent      = fmt(exit);
    document.getElementById('confAmount').textContent    = `$${total.toLocaleString('es-CO')} COP`;

    btn.disabled = false;
    btn.textContent = 'Pagar';
    this.#goToStep(4);
  }

  // ── Servo controls ────────────────────────────────────────────

  async abrirEntrada()  { await db.collection('control').doc('servos').set({ entrada: 'abrir'  }, { merge: true }); }
  async cerrarEntrada() { await db.collection('control').doc('servos').set({ entrada: 'cerrar' }, { merge: true }); }
  async abrirSalida()   { await db.collection('control').doc('servos').set({ salida:  'abrir'  }, { merge: true }); }
  async cerrarSalida()  { await db.collection('control').doc('servos').set({ salida:  'cerrar' }, { merge: true }); }
}

document.addEventListener('DOMContentLoaded', () => new ParkingManager());
