# Chatbot IA Profesional — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el widget Voiceflow por un chatbot IA propio usando la API de Google Gemini, integrado con datos en tiempo real de Firestore y con UI profesional que sigue el diseño de EVC Parking.

**Architecture:** Un `ChatbotManager` (ES6 class, private fields) construye un widget flotante (botón + panel) directamente en el DOM. Llama a Gemini 2.0 Flash vía fetch() desde el cliente con la API key en app-config.js (gitignoreado). Antes de cada llamada, lee parking/estado e iotReservations de Firestore para inyectar estado real en el system prompt.

**Tech Stack:** Google Gemini 2.0 Flash API, Firestore (firebase-compat SDK), CSS custom widget, ES6 classes con private fields.

---

## Archivos

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Reescribir | `public/js/chatbot.js` | ChatbotManager: UI widget + Gemini API + Firestore |
| Crear | `public/css/chatbot.css` | Estilos del widget |
| Modificar (×10) | Todos los HTML con chatbot.js | Añadir link a chatbot.css |
| Modificar | `public/js/app-config.example.js` | Añadir window.GEMINI_API_KEY |

HTML a modificar: Parking.html, Estadisticas.html, index.html, historial.html, Inicio.html, Cameras.html, Reserva.html, Faq.html, GestionPuestos.html, Registros.html

---

## Task 1: Obtener API Key de Gemini y actualizar app-config

**Files:**
- Modify: `public/js/app-config.example.js`
- Modify: `public/js/app-config.js` (manual, gitignoreado)

- [ ] **Paso 1: Obtener la API Key**

  Ve a https://aistudio.google.com/app/apikey → "Create API Key" → copia la clave.

- [ ] **Paso 2: Actualizar la plantilla**

  En `public/js/app-config.example.js`, añadir al final:
  ```js
  window.GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
  ```

- [ ] **Paso 3: Añadir la clave real en app-config.js local**

  En `public/js/app-config.js`:
  ```js
  window.GEMINI_API_KEY = 'TU_CLAVE_REAL_AQUI';
  ```

---

## Task 2: Crear chatbot.css

**Files:**
- Create: `public/css/chatbot.css`

- [ ] **Paso 1: Crear el archivo**

  Ver contenido completo en el plan de implementación (Task 2 del plan original).

---

## Task 3: Reescribir chatbot.js

**Files:**
- Modify: `public/js/chatbot.js`

- [ ] **Paso 1: Reemplazar completamente con ChatbotManager**

  Ver contenido completo en el plan de implementación (Task 3 del plan original).

---

## Task 4: Añadir chatbot.css a los 10 HTML

- [ ] Añadir `<link rel="stylesheet" href="css/chatbot.css">` en cada HTML

---

## Task 5: Commit, push y deploy

- [ ] `git add` archivos relevantes
- [ ] `git commit -m "Reemplazar Voiceflow por chatbot IA propio con Gemini y Firestore"`
- [ ] `git push origin main`
- [ ] `firebase deploy --only hosting`
