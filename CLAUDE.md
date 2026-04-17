# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EVC Parking is a three-tier IoT parking management system:
1. **Web frontend** — static HTML/CSS/JS deployed to Firebase Hosting
2. **IoT hardware** — ESP32 sensors communicating via IoT cloud (platform TBD)
3. **AI camera** — local Python/Flask server for license plate recognition

There is no build step. The `public/` directory is deployed directly to Firebase Hosting.

## Development Commands

### Firebase (web deployment)
```bash
firebase deploy                          # Deploy everything
firebase deploy --only hosting           # Web frontend only
firebase deploy --only firestore:rules   # Security rules only
firebase serve                           # Local dev server
```

### Python plate recognition server
```bash
cd public/EvcParking/Lector_PlacasIA
pip install opencv-python flask flask-cors requests
python lectorplacas.py                   # Runs Flask on :5000
```

## Credentials & Configuration

Firebase config and API keys are **never in the repo**. The real credentials live in `public/js/app-config.js` (gitignored). Use `public/js/app-config.example.js` as a template. Required secrets:
- Firebase project config (apiKey, authDomain, etc.)
- PlateRecognizer API key

## Architecture

### Frontend JS Pattern
All JS files use **ES6 classes with `#` private fields**. Each page has one manager class (e.g., `AuthManager`, `ParkingManager`, `BookingManager`) that owns that page's logic. There is no framework — state is driven by Firestore `onSnapshot()` listeners.

### Firestore Data Model
- `users/{uid}` — user profile with `role: "admin" | "regular"`
- `reservations/{spotId}` — current booking per spot (A1–A4, B1–B4)
- `iotReservations/{spaceId}` — real-time parking spot reservations (space0–space3)
- `reservationHistory/{docId}` — audit trail (all create/cancel events)
- `plateDetections/{docId}` — camera recognition records

### Auth & Role Guard
`public/js/guard.js` contains the `AccessGuard` class, which every protected page instantiates at load time. It checks Firebase Auth state and the user's Firestore `role` field before rendering. Admin-only pages: `Admin.html`, `Estadisticas.html`, `GestionPuestos.html`, `Cameras.html`.

First registered user is automatically assigned `role: "admin"` (set in `auth.js`).

### IoT Integration
The ESP32 reads 4 ultrasonic sensors and should write states (`space0`–`space3`) to the `iotReservations` Firestore collection. The IoT cloud platform is TBD — see `TODO` comments in `IoTParkingESP32.ino`. The web app (`parking.js`) listens to `iotReservations` via `onSnapshot` and reflects states in real time.

### Plate Recognition Flow
`Cameras.html` (admin only) sends a camera capture to the local Flask server (`lectorplacas.py` on `:5000`). The Flask server calls the PlateRecognizer API and returns the detected plate. Results are stored in `plateDetections`.

### External Libraries (CDN, no npm)
Bootstrap 5.3.3, Font Awesome 6.5, Chart.js, DataTables 1.13.6, XLSX.js, html2pdf.js, Voiceflow chatbot widget.
