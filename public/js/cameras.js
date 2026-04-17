const PLATE_TOKEN = '94e38f36dce5e23afbea8d2b194b67a99a326215';

class CameraApp {
    static #stream        = null;
    static #facingMode    = 'environment';
    static #usingFile     = false;
    static #pendingBlob   = null;
    static #pendingImg    = null;  // base64 thumbnail del archivo seleccionado
    static #autoInterval  = null;
    static #isLoading     = false;
    static #lastPlate     = null;
    static #lastPlateTime = 0;
    static #COOLDOWN_MS   = 15000;
    static #SCAN_MS       = 3000;

    /* ── Init ───────────────────────────────────────────────── */
    static async init() {
        await CameraApp.#startCamera();
        CameraApp.#listenDetections();
        CameraApp.#bindFileInput();
    }

    /* ── Camera start ───────────────────────────────────────── */
    static async #startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: CameraApp.#facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            CameraApp.#stream    = stream;
            CameraApp.#usingFile = false;
            document.getElementById('camVideo').srcObject = stream;
            document.getElementById('videoWrap').style.display = 'block';
            document.getElementById('fileWrap').style.display  = 'none';

            const devices = await navigator.mediaDevices.enumerateDevices();
            if (devices.filter(d => d.kind === 'videoinput').length > 1) {
                document.getElementById('switchCamBtn').style.display = 'block';
            }
        } catch {
            CameraApp.#usingFile = true;
            document.getElementById('videoWrap').style.display = 'none';
            document.getElementById('fileWrap').style.display  = 'block';
            // Ocultar auto-scan si no hay cámara en vivo
            document.getElementById('autoScanBtn').style.display = 'none';
        }
    }

    /* ── Switch front/back ──────────────────────────────────── */
    static async switchCamera() {
        if (CameraApp.#stream) CameraApp.#stream.getTracks().forEach(t => t.stop());
        CameraApp.#facingMode = CameraApp.#facingMode === 'environment' ? 'user' : 'environment';
        await CameraApp.#startCamera();
    }

    /* ── File input ─────────────────────────────────────────── */
    static #bindFileInput() {
        document.getElementById('fileInput').addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;
            CameraApp.#pendingBlob = file;
            const reader = new FileReader();
            reader.onload = e => { CameraApp.#pendingImg = e.target.result; };
            reader.readAsDataURL(file);
            document.getElementById('imgPreview').src = URL.createObjectURL(file);
            document.getElementById('previewWrap').style.display = 'block';
            document.getElementById('fileLabel').textContent = file.name;
        });
    }

    /* ── Auto-scan toggle ───────────────────────────────────── */
    static toggleAutoScan() {
        if (CameraApp.#autoInterval) {
            clearInterval(CameraApp.#autoInterval);
            CameraApp.#autoInterval = null;
            document.getElementById('autoScanBtn').className = 'btn cam-auto-btn off w-100';
            document.getElementById('autoScanBtn').innerHTML = '<i class="fa-solid fa-rotate me-2"></i>Activar detección automática';
            document.getElementById('videoWrap').classList.remove('scanning', 'detected');
            document.getElementById('scanStatus').className   = 'badge bg-secondary';
            document.getElementById('scanStatus').textContent = 'Manual';
        } else {
            CameraApp.#autoInterval = setInterval(CameraApp.#autoScanStep, CameraApp.#SCAN_MS);
            document.getElementById('autoScanBtn').className = 'btn cam-auto-btn on w-100';
            document.getElementById('autoScanBtn').innerHTML = '<i class="fa-solid fa-stop me-2"></i>Detener detección automática';
            document.getElementById('videoWrap').classList.add('scanning');
            document.getElementById('scanStatus').className   = 'badge bg-success';
            document.getElementById('scanStatus').textContent = 'Auto-scan activo';
            CameraApp.#autoScanStep();
        }
    }

    static async #autoScanStep() {
        if (CameraApp.#isLoading || CameraApp.#usingFile) return;
        CameraApp.#hideError();
        const { blob, imageB64 } = CameraApp.#grabFrame();
        if (!blob) return;
        CameraApp.#setLoading(true);
        try {
            const data = await CameraApp.#callAPI(blob);
            CameraApp.#setLoading(false);
            if (data.results?.length) {
                const r    = data.results[0];
                const plate = r.plate.toUpperCase();
                const now  = Date.now();
                const dup  = plate === CameraApp.#lastPlate && (now - CameraApp.#lastPlateTime) < CameraApp.#COOLDOWN_MS;
                if (!dup) {
                    CameraApp.#lastPlate     = plate;
                    CameraApp.#lastPlateTime = now;
                    await CameraApp.#saveDetection(r, imageB64);
                    CameraApp.#showResult(r, imageB64);
                    CameraApp.#flashDetected();
                }
            }
        } catch { CameraApp.#setLoading(false); }
    }

    static #flashDetected() {
        const w = document.getElementById('videoWrap');
        w.classList.remove('scanning');
        w.classList.add('detected');
        setTimeout(() => {
            w.classList.remove('detected');
            if (CameraApp.#autoInterval) w.classList.add('scanning');
        }, 1500);
    }

    /* ── Manual capture ─────────────────────────────────────── */
    static capture() {
        CameraApp.#hideError();
        if (CameraApp.#usingFile) {
            if (CameraApp.#pendingBlob) {
                CameraApp.#analyzeFile(CameraApp.#pendingBlob, CameraApp.#pendingImg);
            } else {
                document.getElementById('fileInput').click();
            }
        } else {
            CameraApp.#analyzeFromCamera();
        }
    }

    static async #analyzeFromCamera() {
        const { blob, imageB64 } = CameraApp.#grabFrame();
        if (!blob) return;
        CameraApp.#setLoading(true);
        try {
            const data = await CameraApp.#callAPI(blob);
            CameraApp.#setLoading(false);
            if (data.results?.length) {
                const r = data.results[0];
                CameraApp.#lastPlate = r.plate.toUpperCase(); CameraApp.#lastPlateTime = Date.now();
                await CameraApp.#saveDetection(r, imageB64);
                CameraApp.#showResult(r, imageB64);
            } else {
                CameraApp.#showError('No se detectó ninguna placa. Intenta con mejor iluminación o más cerca.');
            }
        } catch (err) {
            CameraApp.#setLoading(false);
            CameraApp.#showError('Error al conectar con el servicio de reconocimiento.');
            console.error('[CameraApp]', err);
        }
    }

    static async #analyzeFile(blob, imageB64) {
        CameraApp.#setLoading(true);
        try {
            const data = await CameraApp.#callAPI(blob);
            CameraApp.#setLoading(false);
            if (data.results?.length) {
                const r = data.results[0];
                await CameraApp.#saveDetection(r, imageB64);
                CameraApp.#showResult(r, imageB64);
            } else {
                CameraApp.#showError('No se detectó ninguna placa en la imagen.');
            }
        } catch (err) {
            CameraApp.#setLoading(false);
            CameraApp.#showError('Error al conectar con el servicio de reconocimiento.');
            console.error('[CameraApp]', err);
        }
    }

    /* ── Grab frame from video → {blob, imageB64} ───────────── */
    static #grabFrame() {
        const video  = document.getElementById('camVideo');
        const canvas = document.getElementById('snapCanvas');
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Thumbnail (480px max, 65% quality)
        const scale  = Math.min(1, 480 / canvas.width);
        const tc     = document.createElement('canvas');
        tc.width     = Math.round(canvas.width  * scale);
        tc.height    = Math.round(canvas.height * scale);
        tc.getContext('2d').drawImage(canvas, 0, 0, tc.width, tc.height);
        const imageB64 = tc.toDataURL('image/jpeg', 0.65);

        return new Promise(resolve => {
            canvas.toBlob(blob => resolve({ blob, imageB64 }), 'image/jpeg', 0.92);
        });
    }

    /* ── PlateRecognizer API ─────────────────────────────────── */
    static async #callAPI(blob) {
        const fd = new FormData();
        fd.append('upload', blob, 'capture.jpg');
        const res = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
            method:  'POST',
            headers: { 'Authorization': `Token ${PLATE_TOKEN}` },
            body:    fd
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        return res.json();
    }

    /* ── Save to Firestore ──────────────────────────────────── */
    static async #saveDetection(result, imageB64) {
        try {
            await db.collection('plateDetections').add({
                plate:       result.plate.toUpperCase(),
                confidence:  Math.round((result.score || 0) * 100),
                vehicleType: result.vehicle?.type || null,
                region:      result.region?.code  || null,
                image:       imageB64 || null,
                timestamp:   firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error('[CameraApp] Firestore save error:', e);
        }
    }

    /* ── Show last-detection card ───────────────────────────── */
    static #showResult(r, imageB64) {
        const plate = (r.plate || '---').toUpperCase();
        const conf  = Math.round((r.score || 0) * 100);
        const type  = r.vehicle?.type || '—';
        const reg   = (r.region?.code || '—').toUpperCase();

        document.getElementById('plateDisplay').textContent    = plate;
        document.getElementById('confidenceDisplay').innerHTML = `<i class="fa-solid fa-gauge me-1"></i>${conf}% confianza`;
        document.getElementById('vehicleDisplay').innerHTML    = `<i class="fa-solid fa-car me-1"></i>${type}`;
        document.getElementById('regionDisplay').innerHTML     = `<i class="fa-solid fa-location-dot me-1"></i>${reg}`;
        document.getElementById('resultCard').style.display    = 'block';

        if (imageB64) {
            const img  = document.getElementById('resultThumb');
            img.src    = imageB64;
            img.onclick = () => CameraApp.openPhotoModal(imageB64, plate, conf, type);
            document.getElementById('resultThumbWrap').style.display = 'block';
        } else {
            document.getElementById('resultThumbWrap').style.display = 'none';
        }
    }

    /* ── Live Firestore listener ────────────────────────────── */
    static #listenDetections() {
        db.collection('plateDetections')
            .orderBy('timestamp', 'desc')
            .limit(30)
            .onSnapshot(snap => {
                const tbody = document.getElementById('detectionsBody');
                const empty = document.getElementById('emptyRow');
                if (snap.empty) { if (empty) empty.style.display = ''; return; }
                if (empty) empty.style.display = 'none';

                const changes = snap.docChanges();
                const newIds  = new Set(changes.filter(c => c.type === 'added').map(c => c.doc.id));

                tbody.innerHTML = snap.docs.map(doc => {
                    const d  = doc.data();
                    const ts = d.timestamp?.toDate();
                    const t  = ts
                        ? ts.toLocaleDateString('es-CO') + ' ' + ts.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
                        : '—';
                    const c   = d.confidence || 0;
                    const cls = c >= 85 ? 'high' : c >= 65 ? 'medium' : 'low';
                    const isNew = newIds.has(doc.id) ? 'new-row' : '';
                    const thumb = d.image
                        ? `<img class="det-thumb" src="${d.image}" alt="" loading="lazy">`
                        : `<div class="det-thumb-empty"><i class="fa-solid fa-image"></i></div>`;
                    const clickable = d.image
                        ? `style="cursor:pointer;" onclick="CameraApp.openPhotoModal('${d.image}','${d.plate||''}','${c}','${d.vehicleType||''}','${t}')"`
                        : '';
                    return `<tr class="${isNew}" ${clickable}>
                        <td>${thumb}</td>
                        <td><span class="cam-plate-cell">${d.plate || '—'}</span></td>
                        <td><span class="cam-confidence ${cls}">${c}%</span></td>
                        <td style="font-size:.82rem;color:#718096;">${d.vehicleType || '—'}</td>
                        <td style="font-size:.8rem;color:#718096;">${t}</td>
                        <td>
                          <button class="cam-delete-btn" onclick="event.stopPropagation();CameraApp.deleteDetection('${doc.id}')" title="Eliminar">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                    </tr>`;
                }).join('');
            });
    }

    /* ── Photo modal ────────────────────────────────────────── */
    static openPhotoModal(img, plate, conf, type, time) {
        document.getElementById('photoModalImg').src = img || '';
        document.getElementById('photoModalPlate').textContent = plate || '—';
        document.getElementById('photoModalInfo').textContent  =
            [conf ? conf + '% confianza' : null, type || null, time || null].filter(Boolean).join(' · ');
        new bootstrap.Modal(document.getElementById('photoModal')).show();
    }

    /* ── Delete ─────────────────────────────────────────────── */
    static async deleteDetection(docId) {
        try { await db.collection('plateDetections').doc(docId).delete(); }
        catch (e) { console.error('[CameraApp] Delete error:', e); }
    }

    /* ── UI helpers ─────────────────────────────────────────── */
    static #setLoading(on) {
        CameraApp.#isLoading = on;
        document.getElementById('loadingWrap').style.display = on ? 'block' : 'none';
        document.getElementById('captureBtn').disabled       = on;
    }
    static #showError(msg) {
        document.getElementById('errorMsg').textContent    = msg;
        document.getElementById('errorWrap').style.display = 'block';
        setTimeout(() => { document.getElementById('errorWrap').style.display = 'none'; }, 6000);
    }
    static #hideError() { document.getElementById('errorWrap').style.display = 'none'; }
}

document.addEventListener('DOMContentLoaded', () => CameraApp.init());
