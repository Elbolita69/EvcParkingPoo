// Función para inicializar las gráficas
function inicializarGraficas(datosGrafico1, datosGrafico2, datosGrafico3, datosGrafico4) {
    try {
        if (datosGrafico1.length > 0) {
            const etiquetas1 = datosGrafico1.map(d => d[0]); // Fechas
            const valores1 = datosGrafico1.map(d => d[1]);  // Cantidad

            new Chart(document.getElementById('grafico1').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: etiquetas1,
                    datasets: [{
                        label: 'Cantidad de Placas',
                        data: valores1,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                }
            });
        }

        if (datosGrafico2.length > 0) {
            const etiquetas2 = datosGrafico2.map(d => d[0]); // Rangos de confianza
            const valores2 = datosGrafico2.map(d => d[1]);  // Cantidad

            new Chart(document.getElementById('grafico2').getContext('2d'), {
                type: 'pie',
                data: {
                    labels: etiquetas2,
                    datasets: [{
                        data: valores2,
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(255, 99, 132, 0.5)'
                        ]
                    }]
                }
            });
        }

        if (datosGrafico3.length > 0) {
            const etiquetas3 = datosGrafico3.map(d => `${d[0]}:00`); // Horas
            const valores3 = datosGrafico3.map(d => d[1]);          // Cantidad

            new Chart(document.getElementById('grafico3').getContext('2d'), {
                type: 'line',
                data: {
                    labels: etiquetas3,
                    datasets: [{
                        label: 'Placas Detectadas',
                        data: valores3,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }]
                }
            });
        }

        if (datosGrafico4.length > 0) {
            const etiquetas4 = datosGrafico4.map(d => d[0]); // Placas
            const valores4 = datosGrafico4.map(d => d[1]);  // Frecuencia

            new Chart(document.getElementById('grafico4').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: etiquetas4,
                    datasets: [{
                        label: 'Frecuencia',
                        data: valores4,
                        backgroundColor: 'rgba(255, 159, 64, 0.5)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1
                    }]
                }
            });
        }
    } catch (error) {
        console.error('Error al procesar las gráficas:', error);
    }
}
