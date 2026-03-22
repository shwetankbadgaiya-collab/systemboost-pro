// ============================================================
// SystemBoost Pro - Chart.js Wrapper
// Real-time line charts, doughnut gauges
// ============================================================
class ChartManager {
    constructor() {
        this.charts = {};
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 26, 0.9)',
                    titleColor: '#f0f0ff',
                    bodyColor: 'rgba(240, 240, 255, 0.7)',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { family: 'Inter', weight: '600' },
                    bodyFont: { family: 'Inter' }
                }
            }
        };
    }

    createRealtimeChart(canvasId, label, color, maxPoints = 30) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: Array(maxPoints).fill(''),
                datasets: [{
                    label: label,
                    data: Array(maxPoints).fill(0),
                    borderColor: color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: color,
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: {
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(240, 240, 255, 0.3)',
                            font: { family: 'Inter', size: 10 },
                            padding: 8,
                            callback: (v) => v + '%'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    createNetworkChart(canvasId)  {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [
                    {
                        label: 'Download',
                        data: Array(30).fill(0),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Upload',
                        data: Array(30).fill(0),
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    x: { display: false },
                    y: {
                        min: 0,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.04)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(240, 240, 255, 0.3)',
                            font: { family: 'Inter', size: 10 },
                            padding: 8,
                            callback: (v) => formatBytes(v) + '/s'
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: 'rgba(240, 240, 255, 0.5)',
                            font: { family: 'Inter', size: 10 },
                            boxWidth: 8,
                            boxHeight: 8,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 12
                        }
                    }
                }
            }
        });

        this.charts[canvasId] = chart;
        return chart;
    }

    updateChart(canvasId, value) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        chart.data.datasets[0].data.push(value);
        chart.data.datasets[0].data.shift();
        chart.data.labels.push('');
        chart.data.labels.shift();
        chart.update('none');
    }

    updateNetworkChart(canvasId, rx, tx) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        chart.data.datasets[0].data.push(rx);
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.push(tx);
        chart.data.datasets[1].data.shift();
        chart.data.labels.push('');
        chart.data.labels.shift();
        chart.update('none');
    }

    destroyAll() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
    }

    destroy(id) {
        if (this.charts[id]) {
            this.charts[id].destroy();
            delete this.charts[id];
        }
    }
}

// Utility
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

window.Charts = new ChartManager();
window.formatBytes = formatBytes;
window.formatUptime = formatUptime;
