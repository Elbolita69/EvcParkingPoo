class RecordsManager {
    constructor() {
        this.#load();
        this.#bindExports();
    }

    async #load() {
        const snap  = await db.collection('reservations').get();
        const tbody = document.getElementById('tableBody');
        snap.forEach(doc => {
            const car = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${car.userName}</td>
                <td>${car.documentNumber}</td>
                <td>${doc.id}</td>
                <td>${car.plateNumber}</td>`;
            tbody.appendChild(row);
        });
        this.#initTable();
    }

    #initTable() {
        $('#registrosTable').DataTable({
            language: {
                sProcessing:   'Procesando...',
                sLengthMenu:   'Mostrar _MENU_ registros',
                sZeroRecords:  'No se encontraron resultados',
                sEmptyTable:   'Sin datos disponibles',
                sInfo:         'Registros _START_–_END_ de _TOTAL_',
                sInfoEmpty:    'Mostrando 0 registros',
                sInfoFiltered: '(filtrado de _MAX_ registros)',
                sSearch:       'Buscar:',
                oPaginate: { sFirst: 'Primero', sPrevious: 'Anterior', sNext: 'Siguiente', sLast: 'Último' }
            }
        });
    }

    #bindExports() {
        document.getElementById('exportXLSX').addEventListener('click', () => {
            const wb = XLSX.utils.table_to_book(document.getElementById('registrosTable'), { sheet: 'Registros' });
            XLSX.writeFile(wb, 'registros_evc_parking.xlsx');
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            html2pdf().set({
                margin:      10,
                filename:    'registros_evc_parking.pdf',
                image:       { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF:       { unit: 'mm', format: 'a4', orientation: 'landscape' }
            }).from(document.getElementById('registrosTable')).save();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new RecordsManager());
