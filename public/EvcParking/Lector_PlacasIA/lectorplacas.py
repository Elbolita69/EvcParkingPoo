"""
EVC Parking — Lector de Placas (Flask local server)
Requisitos: pip install flask flask-cors opencv-python requests
Uso: python lectorplacas.py
Acceso PC:     http://localhost:5000
Acceso móvil:  http://<IP-LAN>:5000   (misma red WiFi)
"""

from flask import Flask, render_template, Response, request, jsonify
from flask_cors import CORS
import cv2
import requests
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

PLATE_TOKEN = '94e38f36dce5e23afbea8d2b194b67a99a326215'

# Webcam (solo PC)
cap = None

def get_cap():
    global cap
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)
    return cap


def call_plate_recognizer(image_bytes, filename='capture.jpg'):
    """Llama a la API de PlateRecognizer y retorna los resultados."""
    try:
        response = requests.post(
            'https://api.platerecognizer.com/v1/plate-reader/',
            files={'upload': (filename, image_bytes, 'image/jpeg')},
            headers={'Authorization': f'Token {PLATE_TOKEN}'},
            timeout=10
        )
        return response.json()
    except Exception as e:
        print(f'PlateRecognizer error: {e}')
        return None


# ── Routes ────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/placas')
def mostrar_placas():
    return render_template('placas.html')


# ── Captura desde webcam (PC) ──────────────────────────────
@app.route('/leer_placa', methods=['POST'])
def leer_placa_webcam():
    camera = get_cap()
    ret, frame = camera.read()
    if not ret:
        return jsonify(success=False, message='No se pudo acceder a la webcam.')

    tmp = 'temp_capture.jpg'
    cv2.imwrite(tmp, frame)

    with open(tmp, 'rb') as f:
        image_bytes = f.read()

    try:
        os.remove(tmp)
    except Exception:
        pass

    data = call_plate_recognizer(image_bytes)
    return _process_result(data)


# ── Captura desde archivo / cámara móvil ──────────────────
@app.route('/leer_placa_upload', methods=['POST'])
def leer_placa_upload():
    file = request.files.get('image')
    if not file:
        return jsonify(success=False, message='No se recibió ninguna imagen.')

    image_bytes = file.read()
    data = call_plate_recognizer(image_bytes, file.filename or 'upload.jpg')
    return _process_result(data)


def _process_result(data):
    if data and data.get('results'):
        r = data['results'][0]
        plate      = r.get('plate', '').upper()
        confidence = round(r.get('score', 0) * 100)
        vehicle    = r.get('vehicle', {}).get('type', None)
        region     = r.get('region', {}).get('code', None)

        return jsonify(
            success=True,
            plate=plate,
            confidence=confidence,
            vehicleType=vehicle,
            region=region,
            timestamp=datetime.now().isoformat()
        )
    else:
        return jsonify(success=False, message='No se detectó ninguna placa.')


# ── Video stream (PC webcam) ───────────────────────────────
@app.route('/video_feed')
def video_feed():
    def generate():
        camera = get_cap()
        while True:
            ret, frame = camera.read()
            if not ret:
                break
            _, buf = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' +
                   buf.tobytes() + b'\r\n')

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


if __name__ == '__main__':
    print('\n' + '='*55)
    print('  EVC Parking — Lector de Placas')
    print('='*55)
    print(f'  PC:    http://localhost:5000')

    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        lan_ip = s.getsockname()[0]
        s.close()
        print(f'  Móvil: http://{lan_ip}:5000  (misma red WiFi)')
    except Exception:
        pass

    print('='*55 + '\n')
    app.run(host='0.0.0.0', port=5000, debug=False)
