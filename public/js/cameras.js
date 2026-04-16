const PLATE_TOKEN = '94e38f36dce5e23afbea8d2b194b67a99a326215';

class CameraApp {
    static #stream       = null;
    static #facingMode   = 'environment';
    static #usingFile    = false;
    static #pendingBlob  = null;

    /* ── Initialise ─────────────────────────────────────── */
    static async init() {
        await CameraApp.#startCamera();
        CameraApp.#listenDetections();
        CameraApp.#bindFileInput();
    }

    /* ── Camera start ───────────────────────────────────── */
    static async #startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: CameraApp.#facingMode },
                    width:  { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            CameraApp.#stream   = stream;
            CameraApp.#usingFile = false;

            const video = document.getElementById('camVideo');
            video.srcObject = stream;

            document.getElementById('videoWrap').style.display = 'block';
            document.getElementById('fileWrap').style.display  = 'none';

            /* Show switch-camera button only if device has multiple cameras */
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoCams = devices.filter(d => d.kind === 'videoinput');
            if (videoCams.length > 1) {
                document.getElementById('switchCamBtn').style.display = 'block';
            }
        } catch {
            /* Fall back to file input (blocked camera, older browser, iOS quirks) */
            CameraApp.#usingFile = true;
            document.getElementById('videoWrap').style.display = 'none';
            document.getElementById('fileWrap').style.display  = 'block';
        }
    }

    /* ── Switch front/back camera ───────────────────────── */
    static async switchCamera() {
        if (CameraApp.#stream) {
            CameraApp.#stream.getTracks().forEach(t => t.stop());
        }
        CameraApp.#facingMode = CameraApp.#facingMode === 'environment' ? 'user' : 'environment';
        await CameraApp.#startCamera();
    }

    /* ── File input binding ─────────────────────────────── */
    static #bindFileInput() {
        document.getElementById('fileInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            CameraApp.#pendingBlob = file;

            const preview = document.getElementById('imgPreview');
            preview.src  = URL.createObjectURL(file);
            document.getElementById('previewWrap').style.display = 'block';
            document.getElementById('fileLabel').textContent = file.name;
        });
    }

    /* ── Public capture trigger ─────────────────────────── */
    static capture() {
        CameraApp.#hideError();
        if (CameraApp.#usingFile) {
            if (CameraApp.#pendingBlob) {
                CameraApp.#analyzePlate(CameraApp.#pendingBlob);
            } else {
                document.getElementById('fileInput').click();
            }
        } else {
            CameraApp.#captureFrame();
        }
    }

    /* ── Grab frame from live video ─────────────────────── */
    static #captureFrame() {
        const video  = document.getElementById('camVideo');
        const canvas = document.getElementById('snapCanvas');
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => CameraApp.#analyzePlate(blob), 'image/jpeg', 0.92);
    }

    /* ── Call PlateRecognizer API ───────────────────────── */
    static async #analyzePlate(imageBlob) {
        CameraApp.#setLoading(true);

        try {
            const formData = new FormData();
            formData.append('upload', imageBlob, 'capture.jpg');

            const res  = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
                method:  'POST',
                headers: { 'Authorization': `Token ${PLATE_TOKEN}` },
                body:    formData
            });

            if (!res.ok) throw new Error(`API ${res.status}`);

            const data = await res.json();
            CameraApp.#setLoading(false);

            if (data.results?.length) {
                const r = data.results[0];
                await CameraApp.#saveDetection(r);
                CameraApp.#showResult(r);
            } else {
                CameraApp.#showError('No se detectó ninguna placa en la imagen. Intenta con mejor iluminación o más cerca.');
            }
        } catch (err) {
            CameraApp.#setLoading(false);
            CameraApp.#showError('Error al conectar con el servicio de reconocimiento. Verifica tu conexión.');
            console.error('PlateRecognizer error:', err);
        }
    }

    /* ── Save to Firestore ──────────────────────────────── */
    static async #saveDetection(result) {
        try {
            await db.collection('plateDetections').add({
                plate:       result.plate.toUpperCase(),
                confidence:  Math.round((result.score || 0) * 100),
                vehicleType: result.vehicle?.type  || null,
                region:      result.region?.code   || null,
                timestamp:   firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('Firestore save error:', e);
        }
    }

    /* ── Live Firestore listener ────────────────────────── */
    static #listenDetections() {
        db.collection('plateDetections')
            .orderBy('timestamp', 'desc')
            .limit(25)
            .onSnapshot(snap => {
                const tbody = document.getElementById('detectionsBody');
                const empty = document.getElementById('emptyRow');

                if (snap.empty) {
                    if (empty) empty.style.display = '';
                    return;
                }
                if (empty) empty.style.display = 'none';

                /* Check if there is a truly new doc (added after page load) */
                const changes = snap.docChanges();
                const newIds  = new Set(changes.filter(c => c.type === 'added').map(c => c.doc.id));

                tbody.innerHTML = snap.docs.map(doc => {
                    const d   = doc.data();
                    const ts  = d.timestamp?.toDate();
                    const timeStr = ts
                        ? ts.toLocaleDateString('es-CO') + ' ' + ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—';

                    const conf  = d.confidence || 0;
                    const cls   = conf >= 85 ? 'high' : conf >= 65 ? 'medium' : 'low';
                    const isNew = newIds.has(doc.id) ? 'new-row' : '';

                    return `<tr class="${isNew}">
                        <td><span class="cam-plate-cell">${d.plate || '—'}</span></td>
                        <td><span class="cam-confidence ${cls}">${conf}%</span></td>
                        <td style="font-size:.82rem;color:#718096;">${d.vehicleType || '—'}</td>
                        <td style="font-size:.8rem;color:#718096;">${timeStr}</td>
                        <td>
                          <button class="cam-delete-btn" onclick="CameraApp.deleteDetection('${doc.id}')" title="Eliminar">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                    </tr>`;
                }).join('');
            });
    }

    /* ── UI helpers ─────────────────────────────────────── */
    static #showResult(r) {
        const plate = (r.plate || '---').toUpperCase();
        const conf  = Math.round((r.score || 0) * 100);
        const type  = r.vehicle?.type || '—';
        const reg   = (r.region?.code || '—').toUpperCase();

        document.getElementById('plateDisplay').textContent      = plate;
        document.getElementById('confidenceDisplay').innerHTML   = `<i class="fa-solid fa-gauge me-1"></i>${conf}% confianza`;
        document.getElementById('vehicleDisplay').innerHTML      = `<i class="fa-solid fa-car me-1"></i>${type}`;
        document.getElementById('regionDisplay').innerHTML       = `<i class="fa-solid fa-location-dot me-1"></i>${reg}`;
        document.getElementById('resultCard').style.display      = 'block';
    }

    static #setLoading(on) {
        document.getElementById('loadingWrap').style.display  = on ? 'block' : 'none';
        document.getElementById('captureBtn').disabled        = on;
    }

    static #showError(msg) {
        const el = document.getElementById('errorWrap');
        document.getElementById('errorMsg').textContent = msg;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }

    static #hideError() {
        document.getElementById('errorWrap').style.display = 'none';
    }

    /* ── Delete detection from Firestore ────────────────── */
    static async deleteDetection(docId) {
        try {
            await db.collection('plateDetections').doc(docId).delete();
        } catch (e) {
            console.error('Delete error:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => CameraApp.init());
