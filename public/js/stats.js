class StatsManager {
    #chart = null;
    #total = 8;

    constructor() {
        this.#createChart(0, this.#total);
        db.collection('reservations').onSnapshot(snap => {
            const occupied = snap.size;
            const free     = this.#total - occupied;
            this.#updateChart(occupied, free);
        });
    }

    #createChart(occupied, free) {
        const ctx = document.getElementById('parkingChart').getContext('2d');
        this.#chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Ocupados', 'Libres'],
                datasets: [{
                    data:            [occupied, free],
                    backgroundColor: ['#dc3545', '#28a745'],
                    borderColor:     ['#dc3545', '#28a745'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: item => `${item.label}: ${item.raw} puestos`
                        }
                    }
                }
            }
        });
        this.#updateSummary(occupied, free);
    }

    #updateChart(occupied, free) {
        if (this.#chart) {
            this.#chart.data.datasets[0].data = [occupied, free];
            this.#chart.update();
        }
        this.#updateSummary(occupied, free);
    }

    #updateSummary(occupied, free) {
        const avEl  = document.getElementById('statAvailable');
        const ocEl  = document.getElementById('statOccupied');
        const totEl = document.getElementById('statTotal');
        if (avEl)  avEl.textContent  = free;
        if (ocEl)  ocEl.textContent  = occupied;
        if (totEl) totEl.textContent = this.#total;
    }
}

document.addEventListener('DOMContentLoaded', () => new StatsManager());
