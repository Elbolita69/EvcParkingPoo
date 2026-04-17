class ChatbotManager {
  #panel     = null;
  #messages  = null;
  #input     = null;
  #sendBtn   = null;
  #isOpen    = false;
  #isLoading = false;
  #history   = [];

  #SYSTEM_PROMPT = `Eres el asistente virtual de EVC Parking, un sistema inteligente de gestión de estacionamiento.

SOBRE EVC PARKING:
- Sistema con 4 espacios monitoreados por sensores IoT (espacio1, espacio2, espacio3, espacio4)
- Los usuarios pueden reservar espacios ingresando su nombre y placa
- Hay 8 puestos en el mapa de reservas (A1–A4, B1–B4)
- El sistema reconoce matrículas con IA (cámara + PlateRecognizer)
- Barreras de acceso controladas por servomotores

PÁGINAS DEL SISTEMA:
- Parking.html: estado en tiempo real de los 4 sensores IoT
- Reserva.html: reservar un puesto (A1–A4, B1–B4)
- Registros.html: vehículos actualmente estacionados
- historial.html: historial completo de reservas, exportable a Excel/PDF
- Estadisticas.html: gráfico de ocupación en tiempo real
- Admin.html y GestionPuestos.html: solo para administradores

CÓMO RESERVAR:
1. Ir a "Reservar Espacio"
2. Ingresar número de documento, nombre y placa del vehículo
3. Seleccionar un puesto disponible en el mapa (verde = libre, rojo = ocupado)
4. Confirmar la reserva

CÓMO CANCELAR:
1. Ir a "Estado Parking"
2. En el espacio reservado aparece el botón "Cancelar reserva"

ROLES:
- Admin: acceso completo, puede liberar puestos, gestionar usuarios, ver cámaras y estadísticas
- Usuario regular: puede ver parking, reservar, ver historial y estadísticas
- El primer usuario registrado es automáticamente administrador

REGLAS DE RESPUESTA:
- Responde siempre en español
- Sé conciso, amable y profesional
- Si el usuario pregunta por espacios disponibles, usa el ESTADO ACTUAL que se te proporciona
- Si no sabes algo específico, sugiere contactar al administrador
- No inventes información sobre reservas de usuarios específicos`;

  constructor() {
    this.#buildWidget();
  }

  #buildWidget() {
    const btn = document.createElement('button');
    btn.id = 'evc-chat-btn';
    btn.setAttribute('aria-label', 'Abrir asistente virtual');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C6.48 3 2 6.92 2 11.7c0 2.62 1.35 4.96 3.47 6.53L4.5 21l3.2-1.6A10.6 10.6 0 0 0 12 20.4c5.52 0 10-3.92 10-8.7S17.52 3 12 3Z"/>
      </svg>
      <div class="evc-badge"></div>`;
    btn.addEventListener('click', () => this.#toggle());
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'evc-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Asistente EVC Parking');
    panel.innerHTML = `
      <div class="evc-chat-header">
        <div class="evc-chat-header-avatar">
          <svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2Zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4Z"/></svg>
        </div>
        <div class="evc-chat-header-info">
          <strong>Asistente EVC Parking</strong>
          <span>Con tecnología IA · En línea</span>
        </div>
        <button class="evc-chat-close" aria-label="Cerrar chat">✕</button>
      </div>
      <div class="evc-chat-messages"></div>
      <div class="evc-quick-replies">
        <button class="evc-qr-btn">¿Espacios disponibles?</button>
        <button class="evc-qr-btn">¿Cómo reservo?</button>
        <button class="evc-qr-btn">¿Cómo cancelo?</button>
        <button class="evc-qr-btn">¿Quién es admin?</button>
      </div>
      <div class="evc-chat-input-row">
        <input class="evc-chat-input" type="text" placeholder="Escribe tu consulta..." maxlength="300" />
        <button class="evc-chat-send" aria-label="Enviar">
          <svg viewBox="0 0 24 24"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>`;
    document.body.appendChild(panel);

    this.#panel   = panel;
    this.#messages = panel.querySelector('.evc-chat-messages');
    this.#input    = panel.querySelector('.evc-chat-input');
    this.#sendBtn  = panel.querySelector('.evc-chat-send');

    panel.querySelector('.evc-chat-close').addEventListener('click', () => this.#toggle());
    this.#sendBtn.addEventListener('click', () => this.#submit());
    this.#input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.#submit(); }
    });
    panel.querySelectorAll('.evc-qr-btn').forEach(b => {
      b.addEventListener('click', () => { this.#input.value = b.textContent; this.#submit(); });
    });

    setTimeout(() => this.#addMsg('bot', '¡Hola! 👋 Soy el asistente de <strong>EVC Parking</strong>. ¿En qué puedo ayudarte hoy?'), 400);
  }

  #toggle() {
    this.#isOpen = !this.#isOpen;
    this.#panel.classList.toggle('open', this.#isOpen);
    if (this.#isOpen) this.#input.focus();
  }

  async #getContext() {
    try {
      const [estadoSnap, reservasSnap] = await Promise.all([
        db.collection('parking').doc('estado').get(),
        db.collection('iotReservations').get()
      ]);
      const estado   = estadoSnap.exists ? estadoSnap.data() : {};
      const reservas = {};
      reservasSnap.forEach(d => { reservas[d.id] = d.data(); });

      const espacios = ['espacio1', 'espacio2', 'espacio3', 'espacio4'];
      const resumen  = espacios.map((k, i) => {
        if (reservas[k]) return `Espacio ${i + 1}: RESERVADO (${reservas[k].name}, placa ${reservas[k].plate})`;
        return `Espacio ${i + 1}: ${(estado[k] || 'disponible').toUpperCase()}`;
      }).join('\n');

      return `\nESTADO ACTUAL DEL PARKING (tiempo real):\n${resumen}`;
    } catch (_) {
      return '';
    }
  }

  async #submit() {
    const text = this.#input.value.trim();
    if (!text || this.#isLoading) return;
    this.#input.value = '';
    this.#addMsg('user', this.#escapeHtml(text));
    this.#history.push({ role: 'user', content: text });
    await this.#callGroq();
  }

  async #callGroq() {
    this.#isLoading = true;
    this.#sendBtn.disabled = true;
    const typingEl = this.#showTyping();

    const context = await this.#getContext();

    const messages = [
      { role: 'system', content: this.#SYSTEM_PROMPT + context },
      ...this.#history
    ];

    try {
      const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.GROQ_API_KEY || ''}`
        },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7 })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error?.message || 'Error API');

      const reply = data.choices?.[0]?.message?.content || 'Lo siento, no pude procesar tu consulta.';
      this.#history.push({ role: 'assistant', content: reply });
      typingEl.remove();
      this.#addMsg('bot', this.#formatMd(reply));
    } catch (err) {
      typingEl.remove();
      this.#addMsg('bot', 'Ocurrió un error al contactar el asistente. Por favor intenta de nuevo.');
      console.error('[EVC Chatbot]', err);
    } finally {
      this.#isLoading = false;
      this.#sendBtn.disabled = false;
      this.#input.focus();
    }
  }

  #addMsg(role, html) {
    const div = document.createElement('div');
    div.className = `evc-msg ${role}`;
    div.innerHTML = html;
    this.#messages.appendChild(div);
    this.#messages.scrollTop = this.#messages.scrollHeight;
    return div;
  }

  #showTyping() {
    const div = document.createElement('div');
    div.className = 'evc-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    this.#messages.appendChild(div);
    this.#messages.scrollTop = this.#messages.scrollHeight;
    return div;
  }

  #escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  #formatMd(text) {
    return this.#escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/\n/g,            '<br>');
  }
}

document.addEventListener('DOMContentLoaded', () => new ChatbotManager());
