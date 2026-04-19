const PLATE_TOKEN      = '94e38f36dce5e23afbea8d2b194b67a99a326215';
const SCAN_INTERVAL_MS = 3000;
const COOLDOWN_MS      = 10000;
const STORAGE_PATH     = 'plateCaptures';

class BaseScanner {
    captureFrame() {
        throw new Error('captureFrame() must be implemented by subclass');
    }

    get isReady() {
        return false;
    }

    destroy() {}
}

class LiveCameraScanner extends BaseScanner {
    #stream     = null;
    #facingMode = 'environment';
    #video;
    #canvas;

    constructor(videoEl, canvasEl) {
        super();
        this.#video  = videoEl;
        this.#canvas = canvasEl;
    }

    async start() {
        if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';

        const constraints = [
            { video: { facingMode: { ideal: this.#facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
            { video: { facingMode: { ideal: this.#facingMode } } },
            { video: { facingMode: this.#facingMode } },
            { video: true }
        ];

        for (const config of constraints) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(config);
                this.#stream          = stream;
                this.#video.srcObject = stream;
                await new Promise(res => {
                    if (this.#video.readyState >= 2) return res();
                    this.#video.addEventListener('canplay', res, { once: true });
                });
                return 'ok';
            } catch (e) {
                if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') return 'denied';
            }
        }
        return 'error';
    }

    captureFrame() {
        if (!this.#video.videoWidth) return null;
        this.#canvas.width  = this.#video.videoWidth;
        this.#canvas.height = this.#video.videoHeight;
        this.#canvas.getContext('2d').drawImage(this.#video, 0, 0);
        return new Promise(resolve => this.#canvas.toBlob(resolve, 'image/jpeg', 0.92));
    }

    async switchCamera() {
        this.destroy();
        this.#facingMode = this.#facingMode === 'environment' ? 'user' : 'environment';
        return await this.start();
    }

    async countCameras() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'videoinput').length;
    }

    get isReady() {
        return !!this.#stream && this.#video.readyState >= 2;
    }

    destroy() {
        if (this.#stream) {
            this.#stream.getTracks().forEach(t => t.stop());
            this.#stream = null;
        }
    }
}

class FileCameraScanner extends BaseScanner {
    #pendingBlob  = null;
    #onFileReady;

    constructor(fileInputEl, previewEl, onFileReady) {
        super();
        this.#onFileReady = onFileReady;
        fileInputEl.addEventListener('change', () => {
            const file = fileInputEl.files[0];
            if (!file) return;
            this.#pendingBlob = file;
            previewEl.src = URL.createObjectURL(file);
            document.getElementById('previewWrap').style.display = 'block';
            document.getElementById('fileLabel').textContent     = file.name;
            this.#onFileReady();
        });
    }

    captureFrame() {
        if (!this.#pendingBlob) return null;
        const blob       = this.#pendingBlob;
        this.#pendingBlob = null;
        return Promise.resolve(blob);
    }

    get isReady() {
        return !!this.#pendingBlob;
    }
}

class ScanCooldown {
    #plates = new Map();
    #ms;

    constructor(ms = COOLDOWN_MS) {
        this.#ms = ms;
    }

    canSave(plate) {
        const last = this.#plates.get(plate);
        return !last || Date.now() - last > this.#ms;
    }

    register(plate) {
        this.#plates.set(plate, Date.now());
    }
}

class AutoScanLoop {
    #id      = null;
    #running = false;
    #ms;

    constructor(ms = SCAN_INTERVAL_MS) {
        this.#ms = ms;
    }

    start(cb) {
        if (this.#id) return;
        this.#running = true;
        this.#id      = setInterval(cb, this.#ms);
    }

    stop() {
        clearInterval(this.#id);
        this.#id      = null;
        this.#running = false;
    }

    toggle(cb) {
        this.#running ? this.stop() : this.start(cb);
        return this.#running;
    }

    get isRunning() {
        return this.#running;
    }
}

class PlateDetectorService {
    #token;

    constructor(token) {
        this.#token = token;
    }

    async analyze(blob) {
        const form = new FormData();
        form.append('upload', blob, 'capture.jpg');
        const res = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
            method:  'POST',
            headers: { 'Authorization': `Token ${this.#token}` },
            body:    form
        });
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        return data.results?.[0] ?? null;
    }
}

class DetectionRepository {
    #storage;
    #db;

    constructor(storage, db) {
        this.#storage = storage;
        this.#db      = db;
    }

    async save(blob, result) {
        const plate    = result.plate.toUpperCase();
        const ref      = this.#storage.ref(`${STORAGE_PATH}/${Date.now()}_${plate}.jpg`);
        await ref.put(blob, { contentType: 'image/jpeg' });
        const imageUrl = await ref.getDownloadURL();

        await this.#db.collection('plateDetections').add({
            plate,
            confidence:  Math.round((result.score || 0) * 100),
            vehicleType: result.vehicle?.type || null,
            region:      result.region?.code  || null,
            imageUrl,
            timestamp:   firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    async delete(docId) {
        await this.#db.collection('plateDetections').doc(docId).delete();
    }

    listen(limit, cb) {
        return this.#db.collection('plateDetections')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .onSnapshot(cb);
    }
}

class CameraUI {
    showResult(r) {
        document.getElementById('plateDisplay').textContent    = (r.plate || '---').toUpperCase();
        document.getElementById('confidenceDisplay').innerHTML = `<i class="fa-solid fa-gauge me-1"></i>${Math.round((r.score || 0) * 100)}% confianza`;
        document.getElementById('vehicleDisplay').innerHTML    = `<i class="fa-solid fa-car me-1"></i>${r.vehicle?.type || '—'}`;
        document.getElementById('regionDisplay').innerHTML     = `<i class="fa-solid fa-location-dot me-1"></i>${(r.region?.code || '—').toUpperCase()}`;
        document.getElementById('resultCard').style.display    = 'block';
    }

    showError(msg) {
        document.getElementById('errorMsg').textContent = msg;
        const el = document.getElementById('errorWrap');
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }

    setAnalyzing(on) {
        document.getElementById('loadingWrap').style.display = on ? 'block' : 'none';
    }

    setScanState(scanning) {
        const btn   = document.getElementById('toggleScanBtn');
        const dot   = document.getElementById('scanStatusDot');
        const label = document.getElementById('scanStatusLabel');
        if (btn) {
            btn.innerHTML = scanning
                ? '<i class="fa-solid fa-pause me-2"></i>Pausar Escaneo'
                : '<i class="fa-solid fa-play me-2"></i>Reanudar Escaneo';
        }
        if (dot)   dot.className     = `cam-rec-dot ${scanning ? 'text-danger' : 'text-muted'}`;
        if (label) label.textContent = scanning ? 'Escaneando...' : 'En pausa';
    }

    setFileMode() {
        const btn = document.getElementById('toggleScanBtn');
        if (btn) btn.style.display = 'none';
        const dot   = document.getElementById('scanStatusDot');
        const label = document.getElementById('scanStatusLabel');
        if (dot)   dot.className     = 'cam-rec-dot text-muted';
        if (label) label.textContent = 'Modo archivo';
    }

    showPermissionDenied() {
        document.getElementById('permissionWrap').style.display = 'flex';
        document.getElementById('fileWrap').style.display       = 'none';
        document.getElementById('videoWrap').style.display      = 'none';
        const btn = document.getElementById('toggleScanBtn');
        if (btn) btn.style.display = 'none';
    }

    hidePermissionDenied() {
        document.getElementById('permissionWrap').style.display = 'none';
    }

    showSwitchBtn(show) {
        document.getElementById('switchCamBtn').style.display = show ? 'block' : 'none';
    }

    showLiveMode(show) {
        document.getElementById('videoWrap').style.display = show ? 'block' : 'none';
        document.getElementById('fileWrap').style.display  = show ? 'none'  : 'block';
    }

    renderDetections(snap, newIds) {
        const tbody = document.getElementById('detectionsBody');
        const empty = document.getElementById('emptyRow');

        if (snap.empty) {
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        tbody.innerHTML = snap.docs.map(doc => {
            const d    = doc.data();
            const ts   = d.timestamp?.toDate();
            const time = ts
                ? ts.toLocaleDateString('es-CO') + ' ' + ts.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '—';
            const conf   = d.confidence || 0;
            const cls    = conf >= 85 ? 'high' : conf >= 65 ? 'medium' : 'low';
            const isNew  = newIds.has(doc.id) ? 'new-row' : '';
            const imgBtn = d.imageUrl
                ? `<button class="cam-img-btn ms-1" onclick="CameraApp.viewImage('${d.imageUrl}')" title="Ver foto"><i class="fa-solid fa-image"></i></button>`
                : '';
            return `<tr class="${isNew}">
                <td><span class="cam-plate-cell">${d.plate || '—'}</span>${imgBtn}</td>
                <td><span class="cam-confidence ${cls}">${conf}%</span></td>
                <td style="font-size:.82rem;color:#718096;">${d.vehicleType || '—'}</td>
                <td style="font-size:.8rem;color:#718096;">${time}</td>
                <td><button class="cam-delete-btn" onclick="CameraApp.deleteDetection('${doc.id}')" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>`;
        }).join('');
    }
}

class CameraApp {
    #scanner  = null;
    #live     = null;
    #loop     = new AutoScanLoop();
    #cooldown = new ScanCooldown();
    #detector = new PlateDetectorService(PLATE_TOKEN);
    #repo     = null;
    #ui       = new CameraUI();
    #busy     = false;

    static #instance = null;

    static getInstance() {
        if (!CameraApp.#instance) CameraApp.#instance = new CameraApp();
        return CameraApp.#instance;
    }

    async init() {
        try {
            this.#repo = new DetectionRepository(firebase.storage(), db);
        } catch (e) {
            this.#ui.showError('Firebase Storage no disponible. Las capturas no se guardarán.');
            console.error('Storage init error:', e);
        }

        await this.#setupScanner();

        if (this.#repo) {
            this.#repo.listen(25, snap => {
                const newIds = new Set(
                    snap.docChanges().filter(c => c.type === 'added').map(c => c.doc.id)
                );
                this.#ui.renderDetections(snap, newIds);
            });
        }

        document.getElementById('toggleScanBtn')?.addEventListener('click', () => this.toggleScan());
        document.getElementById('switchCamBtn')?.addEventListener('click',  () => this.switchCamera());
    }

    async #setupScanner() {
        const video  = document.getElementById('camVideo');
        const canvas = document.getElementById('snapCanvas');
        this.#live   = new LiveCameraScanner(video, canvas);
        const result = await this.#live.start();

        if (result === 'ok') {
            this.#activateLive();
        } else if (result === 'denied') {
            this.#ui.showPermissionDenied();
        } else {
            this.#activateFile();
        }
    }

    #activateLive() {
        this.#scanner = this.#live;
        this.#ui.showLiveMode(true);
        this.#live.countCameras().then(n => this.#ui.showSwitchBtn(n > 1));
        this.#loop.start(() => this.#scan());
        this.#ui.setScanState(true);
    }

    #activateFile() {
        this.#scanner = new FileCameraScanner(
            document.getElementById('fileInput'),
            document.getElementById('imgPreview'),
            () => this.#scan()
        );
        this.#ui.showLiveMode(false);
        this.#ui.setFileMode();
    }

    async retryCamera() {
        const result = await this.#live.start();
        if (result === 'ok') {
            this.#ui.hidePermissionDenied();
            this.#activateLive();
        }
    }

    async #scan() {
        if (this.#busy) return;
        this.#busy = true;

        try {
            const blob = await this.#scanner.captureFrame();
            if (!blob) return;

            this.#ui.setAnalyzing(true);
            const result = await this.#detector.analyze(blob);
            this.#ui.setAnalyzing(false);

            if (!result) return;

            const plate = result.plate.toUpperCase();
            this.#ui.showResult(result);

            if (this.#repo && this.#cooldown.canSave(plate)) {
                this.#cooldown.register(plate);
                try {
                    await this.#repo.save(blob, result);
                } catch (e) {
                    this.#ui.showError('Error al guardar la imagen. Verifica las reglas de Firebase Storage.');
                    console.error('Storage save error:', e);
                }
            }
        } catch (e) {
            this.#ui.setAnalyzing(false);
            console.error('Scan error:', e);
        } finally {
            this.#busy = false;
        }
    }

    toggleScan() {
        const running = this.#loop.toggle(() => this.#scan());
        this.#ui.setScanState(running);
    }

    async switchCamera() {
        if (this.#live) {
            const result = await this.#live.switchCamera();
            if (result === 'ok' && this.#scanner !== this.#live) {
                this.#ui.hidePermissionDenied();
                this.#activateLive();
            }
        }
    }

    static async deleteDetection(docId) {
        await CameraApp.getInstance().#repo.delete(docId);
    }

    static viewImage(url) {
        document.getElementById('modalImage').src = url;
        new bootstrap.Modal(document.getElementById('imageModal')).show();
    }
}

document.addEventListener('DOMContentLoaded', () => CameraApp.getInstance().init());
