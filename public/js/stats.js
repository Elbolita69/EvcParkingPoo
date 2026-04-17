class StatsManager {
    #chart = null;
    #spaces = ['espacio1', 'espacio2', 'espacio3', 'espacio4'];
    #parkingStates = {};
    #reservations = {};

    constructor() {
        this.#createChart(0, 0, 0);
        this.#listenParkingStates();
        this.#listenReservations();
    }

    #listenParkingStates() {
        db.collection('parking').doc('estado').onSnapshot(doc => {
            this.#parkingStates = doc.exists ? doc.data() : {};
            this.#refresh();
        });
    }

    #listenReservations() {
        db.collection('iotReservations').onSnapshot(snap => {
            this.#reservations = {};
            snap.forEach(doc => { this.#reservations[doc.id] = true; });
            this.#refresh();
        });
    }

    #refresh() {
        let disponibles = 0, ocupados = 0, reservados = 0;
        for (const key of this.#spaces) {
            if (this.#reservations[key]) {
                reservados++;
            } else if ((this.#parkingStates[key] || 'disponible') === 'disponible') {
                disponibles++;
            } else {
                ocupados++;
            }
        }
        this.#updateChart(disponibles, ocupados, reservados);
    }

    #createChart(disponibles, ocupados, reservados) {
        const ctx = document.getElementById('parkingChart').getContext('2d');
        this.#chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Disponibles', 'Ocupados', 'Reservados'],
                datasets: [{
                    data: [disponibles, ocupados, reservados],
                    backgroundColor: ['#28a745', '#dc3545', '#F8A71C'],
                    borderColor:     ['#28a745', '#dc3545', '#F8A71C'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: item => `${item.label}: ${item.raw} puesto${item.raw !== 1 ? 's' : ''}`
                        }
                    }
                }
            }
        });
        this.#updateSummary(disponibles, ocupados, reservados);
    }

    #updateChart(disponibles, ocupados, reservados) {
        if (this.#chart) {
            this.#chart.data.datasets[0].data = [disponibles, ocupados, reservados];
            this.#chart.update();
        }
        this.#updateSummary(disponibles, ocupados, reservados);
    }

    #updateSummary(disponibles, ocupados, reservados) {
        const avEl  = document.getElementById('statAvailable');
        const ocEl  = document.getElementById('statOccupied');
        const resEl = document.getElementById('statReserved');
        const totEl = document.getElementById('statTotal');
        if (avEl)  avEl.textContent  = disponibles;
        if (ocEl)  ocEl.textContent  = ocupados;
        if (resEl) resEl.textContent = reservados;
        if (totEl) totEl.textContent = this.#spaces.length;
    }
}

document.addEventListener('DOMContentLoaded', () => new StatsManager());
