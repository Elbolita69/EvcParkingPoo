class HistoryManager {
    #history = [];
    #table   = null;

    constructor() {
        this.#load();
        this.#bindExportEvents();
    }

    async #load() {
        if (this.#table) {
            this.#table.clear().destroy();
            this.#table = null;
        }

        const snap = await db.collection('reservationHistory')
            .orderBy('timestamp', 'desc').get();
        this.#history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.#initTable();
    }

    #formatDate(iso) {
        return new Date(iso).toLocaleString('es-CO', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
    }

    #initTable() {
        this.#table = $('#reservationHistoryTable').DataTable({
            data: this.#history,
            columns: [
                { data: 'timestamp', render: d => this.#formatDate(d) },
                { data: 'space',     render: d => d ?? 'No disponible' },
                { data: 'name' },
                { data: 'plate' },
                { data: 'status' },
                {
                    data: null,
                    render: (d, t, r) =>
                        `<button class="btn btn-sm btn-danger delete-btn" data-id="${r.id}">
                            <i class="fa-solid fa-trash me-1"></i>Eliminar
                        </button>`
                }
            ],
            order: [[0, 'desc']],
            responsive: true,
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Excel', className: 'btn btn-success', title: 'Historial de Reservas' },
                { extend: 'pdfHtml5',  text: 'PDF',   className: 'btn btn-danger',  title: 'Historial de Reservas', orientation: 'landscape', pageSize: 'A4' }
            ],
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' }
        });

        $('#reservationHistoryTable').off('click', '.delete-btn').on('click', '.delete-btn', async e => {
            const id = $(e.currentTarget).data('id');
            await db.collection('reservationHistory').doc(id).delete();
            await this.#load();
        });
    }

    #bindExportEvents() {
        document.getElementById('exportExcel')?.addEventListener('click', () => {
            if (this.#history.length > 0) {
                this.#table?.button('.buttons-excel').trigger();
            } else {
                new bootstrap.Modal(document.getElementById('noDataExcelModal')).show();
            }
        });

        document.getElementById('exportPdf')?.addEventListener('click', () => {
            if (this.#history.length > 0) {
                this.#table?.button('.buttons-pdf').trigger();
            } else {
                new bootstrap.Modal(document.getElementById('noDataModal')).show();
            }
        });
    }
}

$(document).ready(() => new HistoryManager());
