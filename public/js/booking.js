class BookingManager {
  #spots;
  #parkedCars    = {};
  #selectedSpot  = null;
  #step          = 1;
  #formData      = {};
  #selectedHours = 1;
  #PRICE_PER_HOUR = 5000;

  constructor() {
    this.#spots = document.getElementsByClassName('parking-spot');
    this.#listenReservations();
    this.#bindEvents();
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
    const el = document.getElementById('availabilityCounter');
    if (el) el.innerHTML = `<strong>${free}</strong> de ${total} puestos disponibles`;
    const bar = document.getElementById('availabilityBar');
    if (bar) bar.style.width = `${(occupied / total) * 100}%`;
  }

  static #spotHTML(id, occupied) {
    if (occupied) {
      return `
        <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg">
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
      <svg class="spot-car-svg" viewBox="0 0 40 72" xmlns="http://www.w3.org/2000/svg" style="opacity:.18">
        <rect x="5" y="6" width="30" height="60" rx="8" fill="none"
              stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="4 3"/>
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

  #bindEvents() {
    document.getElementById('parkingLot').addEventListener('click', e => {
      const t = e.target.closest('.parking-spot');
      if (!t || t.classList.contains('bg-danger')) return;
      this.#openModal(t.getAttribute('data-spot'));
    });

    document.getElementById('btnStep1Next').addEventListener('click', () => this.#nextStep());
    document.getElementById('btnStep2Back').addEventListener('click', () => this.#goToStep(1));
    document.getElementById('btnStep2Next').addEventListener('click', () => this.#nextStep());
    document.getElementById('btnStep3Back').addEventListener('click', () => this.#goToStep(2));
    document.getElementById('btnPay').addEventListener('click', () => this.#processPayment());

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
  }

  #openModal(spot) {
    this.#selectedSpot  = spot;
    this.#step          = 1;
    this.#formData      = {};
    this.#selectedHours = 1;

    document.getElementById('bookingForm')?.reset();
    document.getElementById('cardForm')?.reset();
    document.getElementById('cardVisualNumber').textContent  = '•••• •••• •••• ••••';
    document.getElementById('cardVisualName').textContent    = 'NOMBRE APELLIDO';
    document.getElementById('cardVisualExpiry').textContent  = 'MM/AA';
    document.getElementById('cardTypeIcon').innerHTML        = '<i class="fa-solid fa-credit-card"></i>';

    document.getElementById('modalSpotBadge').textContent = `Puesto ${spot}`;

    document.querySelectorAll('.duration-btn').forEach(b =>
      b.classList.toggle('active', parseInt(b.dataset.hours) === 1)
    );
    this.#updatePricePreview();
    this.#goToStep(1);
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
  }

  #goToStep(n) {
    this.#step = n;
    document.querySelectorAll('.booking-step-panel').forEach(p =>
      p.classList.toggle('active', parseInt(p.dataset.step) === n)
    );
    document.querySelectorAll('.step-dot').forEach(d => {
      const s = parseInt(d.dataset.step);
      d.classList.toggle('active', s === n);
      d.classList.toggle('done', s < n);
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
    const total   = this.#selectedHours * this.#PRICE_PER_HOUR;
    const now     = new Date();
    const exit    = new Date(now.getTime() + this.#selectedHours * 3600000);
    const fmt     = d => d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('pricePreview').textContent  = `$${total.toLocaleString('es-CO')} COP`;
    document.getElementById('entryTime').textContent     = fmt(now);
    document.getElementById('exitTime').textContent      = fmt(exit);
    document.getElementById('selectedSpotLabel').textContent = this.#selectedSpot;
  }

  #fillPaymentSummary() {
    const total = this.#selectedHours * this.#PRICE_PER_HOUR;
    document.getElementById('paySpot').textContent     = this.#selectedSpot;
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
    if (/^4/.test(num))       el.innerHTML = '<i class="fa-brands fa-cc-visa fs-4"></i>';
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

    await db.collection('reservations').doc(this.#selectedSpot).set({
      ...this.#formData,
      spotId:        this.#selectedSpot,
      hours:         this.#selectedHours,
      amount:        total,
      reference,
      entryTime:     now.toISOString(),
      exitTime:      exit.toISOString(),
      paymentStatus: 'confirmado',
      timestamp:     now.toISOString()
    });

    document.getElementById('confReference').textContent = reference;
    document.getElementById('confSpot').textContent      = this.#selectedSpot;
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
}

document.addEventListener('DOMContentLoaded', () => new BookingManager());
