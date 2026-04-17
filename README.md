# EVC Parking

Sistema inteligente de gestión de estacionamiento que combina sensores IoT (ESP32), reconocimiento de placas con IA (OpenCV + PlateRecognizer), y una interfaz web en tiempo real respaldada por Firebase.


---

## Tabla de contenidos

1. [Descripción general](#descripción-general)
2. [Tecnologías utilizadas](#tecnologías-utilizadas)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Configuración de Firebase](#configuración-de-firebase)
6. [Configuración del archivo de credenciales](#configuración-del-archivo-de-credenciales)
7. [Configuración del hardware ESP32](#configuración-del-hardware-esp32)
8. [Configuración del lector de placas (Python)](#configuración-del-lector-de-placas-python)
9. [Despliegue en Firebase Hosting](#despliegue-en-firebase-hosting)
10. [Uso de la aplicación](#uso-de-la-aplicación)
11. [Páginas y funcionalidades](#páginas-y-funcionalidades)
12. [Seguridad](#seguridad)
13. [Reglas de Firestore](#reglas-de-firestore)

---

## Descripción general

EVC Parking es una plataforma de estacionamiento automatizada que integra tres componentes principales:

- **Interfaz web** — permite ver disponibilidad en tiempo real, hacer reservas, ver historial, exportar reportes y administrar usuarios desde cualquier dispositivo.
- **Hardware IoT** — un microcontrolador ESP32 con sensores ultrasónicos detecta si cada espacio está ocupado o libre, y servomotores controlan las barreras de acceso. La comunicación se realiza a través de una plataforma IoT cloud (configurable).
- **Lector de placas con IA** — un script Python con OpenCV y la API de PlateRecognizer captura y reconoce las matrículas de los vehículos en la entrada/salida.

---

## Tecnologías utilizadas

### Web
| Tecnología | Uso |
|---|---|
| HTML5 + CSS3 | Estructura y estilos |
| JavaScript ES6 (clases con `#` private fields) | Lógica del cliente |
| Bootstrap 5.3.3 | Diseño responsivo |
| Font Awesome 6.5 | Iconos |
| Firebase Authentication | Login y registro con email/contraseña |
| Firebase Firestore | Base de datos en tiempo real |
| Firebase Hosting | Despliegue del sitio web |
| Chart.js | Gráfico de ocupación |
| DataTables 1.13.6 | Tablas con búsqueda, paginación y exportación |
| XLSX.js | Exportar a Excel |
| html2pdf.js | Exportar a PDF |
| Groq API (llama-3.3-70b) | Chatbot IA integrado (oculto del repo) |

### Hardware / IoT
| Tecnología | Uso |
|---|---|
| ESP32 | Microcontrolador principal |
| Sensores ultrasónicos HC-SR04 | Detección de vehículos en cada espacio |
| Servomotores SG90 | Control de barreras de acceso |
| Plataforma IoT cloud | Comunicación entre ESP32 y la web (por definir) |

### Inteligencia Artificial
| Tecnología | Uso |
|---|---|
| Python 3 | Lenguaje del script de visión |
| OpenCV | Captura y procesamiento de video |
| PlateRecognizer API | Reconocimiento de matrículas |
| Flask | Servidor web local para la cámara |

---

## Estructura del proyecto

```
EvcParking/
│
├── public/                          # Todo lo que se despliega en Firebase Hosting
│   ├── index.html                   # Página de inicio / landing
│   ├── Login.html                   # Login y registro
│   ├── Inicio.html                  # Dashboard del usuario
│   ├── Admin.html                   # Panel de administración (solo admin)
│   ├── Parking.html                 # Estado en tiempo real (sensores IoT)
│   ├── Reserva.html                 # Reservar un puesto (A1–B4)
│   ├── Registros.html               # Tabla de reservas activas + exportar
│   ├── GestionPuestos.html          # Gestión de vehículos y usuarios (solo admin)
│   ├── Estadisticas.html            # Gráfico de ocupación
│   ├── Faq.html                     # Preguntas frecuentes + formulario de contacto
│   ├── historial.html               # Historial completo de reservas + exportar
│   │
│   ├── css/                         # Estilos por página
│   │   ├── main.css                 # Estilos globales (navbar, hero, footer, cards)
│   │   ├── auth.css                 # Página de login
│   │   ├── admin.css                # Panel de administración
│   │   ├── parking.css              # Vista de sensores IoT
│   │   ├── booking.css              # Reserva de puestos
│   │   ├── records.css              # Tabla de registros
│   │   ├── faq.css                  # FAQ y formulario
│   │   └── history.css              # Historial de reservas
│   │
│   ├── js/                          # Scripts por funcionalidad (OOP, clases ES6)
│   │   ├── app-config.example.js    # Plantilla de configuración (sin credenciales)
│   │   ├── app-config.js            # Credenciales reales (NO está en el repo)
│   │   ├── auth.js                  # Firebase Auth — login y registro
│   │   ├── navbar.js                # Navbar dinámica según rol
│   │   ├── guard.js                 # Protección de páginas por autenticación/rol
│   │   ├── parking.js               # Estado de sensores IoT en tiempo real
│   │   ├── booking.js               # Lógica de reservas de puestos
│   │   ├── records.js               # Tabla de registros activos
│   │   ├── spots-admin.js           # Gestión de puestos (admin)
│   │   ├── user-admin.js            # Gestión de usuarios (admin)
│   │   ├── history.js               # Historial con DataTables
│   │   ├── stats.js                 # Gráfico de ocupación con Chart.js
│   │   └── chatbot.js               # Chatbot IA con Groq (no está en el repo)
│   │
│   ├── img/                         # Imágenes del sitio
│   │   ├── evclogo.png
│   │   ├── evcblanco.png
│   │   └── fondoparking.jpg
│   │
│   ├── EvcParking/
│   │   └── Lector_PlacasIA/         # Script Python de reconocimiento de placas
│   │       ├── lectorplacas.py      # Script principal
│   │       ├── templates/           # HTML de la interfaz de cámara
│   │       └── static/              # Recursos estáticos del servidor Flask
│   │
│   └── IoTParkingESP32/
│       └── IoTParkingESP32.ino      # Código Arduino para el ESP32
│
├── firestore.rules                  # Reglas de seguridad de Firestore
├── firestore.indexes.json           # Índices de Firestore
├── firebase.json                    # Configuración de Firebase Hosting
├── .firebaserc                      # Proyecto de Firebase vinculado
└── .gitignore                       # Archivos excluidos del repositorio
```

---

## Requisitos previos

Asegúrate de tener instalado lo siguiente antes de empezar:

- [Node.js](https://nodejs.org/) (versión 16 o superior)
- [Firebase CLI](https://firebase.google.com/docs/cli): `npm install -g firebase-tools`
- Una cuenta en [Firebase](https://firebase.google.com/) con un proyecto creado
- Python 3.8+ (solo para el lector de placas)

---

## Configuración de Firebase

### 1. Crear el proyecto en Firebase Console

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **Agregar proyecto** → sigue los pasos
3. Una vez creado, en el menú izquierdo activa:
   - **Authentication** → Sign-in method → **Email/Password** → activar y guardar
   - **Firestore Database** → Crear base de datos → modo producción → elige región

### 2. Registrar la app web

1. En la página principal del proyecto → ícono `</>` (Web)
2. Registra la app con un nombre (ej: `EVC Parking Web`)
3. Copia el objeto `firebaseConfig` que aparece — lo necesitarás en el siguiente paso

### 3. Vincular Firebase CLI con tu proyecto

```bash
firebase login
firebase use --add
```

Selecciona tu proyecto cuando lo solicite.

---

## Configuración del archivo de credenciales

El archivo `public/js/app-config.js` **no está en el repositorio** por seguridad. Debes crearlo manualmente a partir de la plantilla incluida.

### Paso 1 — Copiar la plantilla

```bash
cp public/js/app-config.example.js public/js/app-config.js
```

O en Windows:

```cmd
copy public\js\app-config.example.js public\js\app-config.js
```

### Paso 2 — Llenar tus credenciales

Abre `public/js/app-config.js` y reemplaza los valores:

```js
firebase.initializeApp({
    apiKey:            "TU_API_KEY",
    authDomain:        "tu-proyecto.firebaseapp.com",
    projectId:         "tu-proyecto",
    storageBucket:     "tu-proyecto.firebasestorage.app",
    messagingSenderId: "TU_SENDER_ID",
    appId:             "TU_APP_ID"
});

const auth = firebase.auth();
const db   = firebase.firestore();

```

> Todos estos valores los obtienes de Firebase Console → Configuración del proyecto → General → Tu app web.

---

## Configuración del hardware ESP32

El archivo `public/IoTParkingESP32/IoTParkingESP32.ino` contiene el código para el microcontrolador.

### Componentes necesarios

| Componente | Cantidad |
|---|---|
| ESP32 DevKit | 1 |
| Sensor ultrasónico HC-SR04 | 4 (uno por espacio) |
| Servomotor SG90 | 2 (barrera entrada y salida) |
| Resistencias, cables, protoboard | c/n |

### Pasos de configuración

1. Instala el IDE de Arduino y agrega soporte para ESP32:
   - Archivo → Preferencias → URL adicionales: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Herramientas → Placa → Gestor de tarjetas → buscar `esp32` → instalar

2. Abre `IoTParkingESP32.ino` y edita las credenciales WiFi al inicio del archivo:

```cpp
char ssid[] = "NOMBRE_DE_TU_WIFI";
char pass[] = "CONTRASEÑA_DE_TU_WIFI";
```

3. Integra la plataforma IoT cloud elegida (ver comentarios `TODO` en el sketch)

4. Conecta el ESP32 al PC, selecciona la placa y el puerto correcto, y sube el sketch

### Pines físicos usados

| Pin ESP32 | Componente |
|---|---|
| GPIO 4 | Sensor espacio 1 |
| GPIO 15 | Sensor espacio 2 |
| GPIO 5 | Sensor espacio 3 |
| GPIO 19 | Sensor espacio 4 |
| GPIO 14 | Servo barrera entrada |
| GPIO 27 | Servo barrera salida |

### Identificadores de espacio (Firestore)

Los documentos en la colección `iotReservations` usan los IDs `space0`, `space1`, `space2`, `space3`.

---

## Configuración del lector de placas (Python)

El script `lectorplacas.py` usa la cámara del equipo para capturar matrículas en tiempo real.

### Instalación de dependencias

```bash
cd public/EvcParking/Lector_PlacasIA
pip install opencv-python flask requests
```

### API Key de PlateRecognizer

1. Crea una cuenta en [platerecognizer.com](https://platerecognizer.com/)
2. Copia tu API token desde el dashboard
3. Ábrelo en `lectorplacas.py` y reemplaza:

```python
API_TOKEN = 'TU_TOKEN_DE_PLATERECOGNIZER'
```

### Ejecutar el lector

```bash
python lectorplacas.py
```

Esto levanta un servidor Flask local. Accede desde el navegador en:

```
http://localhost:5000
```

También puedes acceder desde la navbar de la app web si estás en la misma red local (el link de **Cámaras** apunta a esta ruta).

---

## Despliegue en Firebase Hosting

Una vez configurado `app-config.js`, despliega con:

```bash
firebase deploy
```

O si solo quieres desplegar el hosting (sin reglas):

```bash
firebase deploy --only hosting
```

O solo las reglas de Firestore:

```bash
firebase deploy --only firestore:rules
```

Tu app estará disponible en:

```
https://tu-proyecto.web.app
```

---

## Uso de la aplicación

### Primer uso — crear el administrador

1. Ve a la URL de tu app desplegada
2. Clic en **Login** → pestaña **Registrarse**
3. Completa el formulario con tu correo y contraseña
4. **El primer usuario registrado queda automáticamente como administrador**
5. Los usuarios que se registren después quedan como usuarios regulares

### Roles

| Rol | Acceso |
|---|---|
| **Admin** | Todas las páginas: panel de admin, gestión de puestos, estadísticas, historial, cámaras |
| **Regular** | Parking, reservas, historial, FAQ |
| **Sin sesión** | Solo página de inicio y FAQ |

---

## Páginas y funcionalidades

### `/` — Inicio
Página introductoria con descripción del sistema y acceso al login.

### `/Login.html` — Acceso
- **Iniciar sesión** con correo y contraseña (Firebase Auth)
- **Registrarse** — crea una cuenta nueva. El primer registro es admin, los siguientes son regulares.

### `/Inicio.html` — Dashboard
Panel principal del usuario con accesos rápidos a todas las funciones.

### `/Parking.html` — Estado en tiempo real
Muestra el estado de los 4 espacios monitoreados por sensores IoT. Se actualiza en tiempo real vía Firestore. Desde aquí también se puede reservar un espacio directamente.

### `/Reserva.html` — Reservar espacio
Formulario para ingresar documento, nombre y placa del vehículo, luego seleccionar uno de los 8 puestos del mapa (A1–A4, B1–B4). Los puestos ocupados se marcan en rojo.

### `/Registros.html` — Registros activos
Tabla con todos los vehículos actualmente estacionados. Se puede exportar a Excel o PDF.

### `/historial.html` — Historial
Historial completo de reservas (realizadas y canceladas) con fecha, espacio, nombre, placa y estado. Se puede eliminar entradas y exportar a Excel o PDF.

### `/Estadisticas.html` — Estadísticas *(solo admin)*
Gráfico de torta en tiempo real mostrando puestos ocupados vs disponibles, con resumen numérico.

### `/GestionPuestos.html` — Gestión *(solo admin)*
- Lista de vehículos actualmente estacionados con opción de **liberar puestos**
- Lista de todos los usuarios del sistema con opciones de **cambiar rol**, **editar** y **eliminar**

### `/Admin.html` — Panel de administración *(solo admin)*
Gestión completa de usuarios: ver, editar nombre, cambiar rol entre admin/regular, y eliminar.

### `/Faq.html` — Preguntas frecuentes
Respuestas a las preguntas más comunes sobre el sistema, más un formulario de contacto.

---

## Seguridad

### Qué está protegido

- `public/js/app-config.js` — ignorado por `.gitignore`, nunca se sube a GitHub
- `public/js/chatbot.js` — ignorado por `.gitignore`, contiene la lógica IA del chatbot (API key de Groq)
- Credenciales de Firebase — solo en `app-config.js`

### Headers HTTP (Firebase Hosting)

El archivo `firebase.json` configura los siguientes headers de seguridad en todas las respuestas:

| Header | Valor | Protege contra |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Filtración de URLs |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Acceso no autorizado a hardware |

### Reglas de Firestore

El acceso a la base de datos está controlado por reglas de seguridad. Ver sección siguiente.

---

## Reglas de Firestore

Las reglas en `firestore.rules` aplican la siguiente política:

| Colección | Leer | Crear | Actualizar | Eliminar |
|---|---|---|---|---|
| `users` | Autenticado | Solo el propio usuario | Propio usuario o admin | Solo admin |
| `reservations` | Público | Autenticado | Autenticado | Solo admin |
| `iotReservations` | Público | Autenticado | Autenticado | Autenticado |
| `reservationHistory` | Autenticado | Autenticado | — | Autenticado |

> Las reservas (`reservations` e `iotReservations`) son públicas para lectura para que el mapa de parking sea visible sin necesidad de login.

---

## Cambios recientes

### Chatbot IA (Groq)
El chatbot fue migrado de Voiceflow a una solución propia con **Groq API** (`llama-3.3-70b-versatile`). El widget es completamente personalizado (ES6 class, sin dependencias externas) e incluye:
- Contexto en tiempo real del estado del parking vía Firestore
- Respuestas rápidas predefinidas
- Historial de conversación por sesión

> `public/js/chatbot.js` está excluido del repositorio por seguridad (contiene la API key de Groq).

### Flujo de reserva mejorado
El proceso de reserva fue movido a la página **Parking**, usando un modal de 4 pasos:
1. Datos personales (documento, nombre, placa)
2. Selección del puesto en el mapa
3. Resumen de la reserva
4. Confirmación / pago simulado

### Controles de barreras (admin)
Los botones de apertura/cierre de barreras de acceso ahora son **visibles únicamente para administradores**. Los usuarios regulares no ven ni pueden interactuar con estos controles.

---

## Licencia

Este proyecto es de uso académico. Si lo usas como base para tu propio proyecto, da crédito a los autores originales.
