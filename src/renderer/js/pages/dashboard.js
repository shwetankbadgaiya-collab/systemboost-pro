// ============================================================
// SystemBoost Pro - Dashboard Page
// Health score ring, live charts, quick stats, boost button
// ============================================================
const Dashboard = {
    charts: { cpu: null, ram: null, network: null },
    healthInterval: null,

    render() {
        return `
        <div class="page" id="page-dashboard">
            <div class="page-header">
                <h1>Dashboard</h1>
                <p>Real-time system performance overview</p>
            </div>

            <!-- Quick Stats Row -->
            <div class="quick-stats">
                <div class="glass-card stat-card cpu">
                    <div class="stat-icon">⚡</div>
                    <div class="stat-value" id="stat-cpu">--</div>
                    <div class="stat-label">CPU Usage</div>
                    <div class="stat-change neutral" id="stat-cpu-cores">-- cores</div>
                </div>
                <div class="glass-card stat-card ram">
                    <div class="stat-icon">🧠</div>
                    <div class="stat-value" id="stat-ram">--</div>
                    <div class="stat-label">RAM Usage</div>
                    <div class="stat-change neutral" id="stat-ram-detail">--</div>
                </div>
                <div class="glass-card stat-card disk">
                    <div class="stat-icon">💾</div>
                    <div class="stat-value" id="stat-disk">--</div>
                    <div class="stat-label">Disk Usage</div>
                    <div class="stat-change neutral" id="stat-disk-detail">--</div>
                </div>
                <div class="glass-card stat-card network">
                    <div class="stat-icon">🌐</div>
                    <div class="stat-value" id="stat-net-down">--</div>
                    <div class="stat-label">Download</div>
                    <div class="stat-change neutral" id="stat-net-up">↑ --</div>
                </div>
            </div>

            <!-- Main Layout: Charts + Health Ring + Boost -->
            <div class="dashboard-top">
                <div style="display:flex;flex-direction:column;gap:16px;">
                    <!-- CPU Chart -->
                    <div class="glass-card chart-container">
                        <div class="chart-header">
                            <span class="chart-title">CPU Usage</span>
                            <span class="text-muted" id="cpu-model" style="font-size:11px;"></span>
                        </div>
                        <canvas id="chart-cpu" height="140"></canvas>
                    </div>
                    <!-- RAM Chart -->
                    <div class="glass-card chart-container">
                        <div class="chart-header">
                            <span class="chart-title">Memory Usage</span>
                            <span class="text-muted" id="ram-total" style="font-size:11px;"></span>
                        </div>
                        <canvas id="chart-ram" height="140"></canvas>
                    </div>
                </div>

                <!-- Right Column: Health Score + Boost -->
                <div style="display:flex;flex-direction:column;gap:16px;">
                    <!-- Health Score Ring -->
                    <div class="glass-card health-ring-container">
                        <div class="health-ring">
                            <svg viewBox="0 0 120 120">
                                <circle class="ring-bg" cx="60" cy="60" r="52"/>
                                <circle class="ring-progress" id="health-ring-circle" cx="60" cy="60" r="52"
                                    stroke-dasharray="326.73" stroke-dashoffset="326.73" stroke="#6366f1"/>
                            </svg>
                            <div class="health-ring-info">
                                <div class="health-ring-score" id="health-score">--</div>
                                <div class="health-ring-grade" id="health-grade">--</div>
                                <div class="health-ring-label">Health Score</div>
                            </div>
                        </div>
                    </div>

                    <!-- Boost Button -->
                    <div style="display:flex;justify-content:center;">
                        <button class="boost-btn" id="btn-boost" onclick="Dashboard.boost()">
                            <span class="boost-icon">⚡</span>
                            <span class="boost-label">Boost Now</span>
                            <span class="boost-sub">One-click optimization</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Network Chart -->
            <div class="glass-card chart-container" style="margin-bottom:20px;">
                <div class="chart-header">
                    <span class="chart-title">Network Activity</span>
                </div>
                <canvas id="chart-network" height="120"></canvas>
            </div>

            <!-- Recommendations -->
            <div class="section-header">
                <h2>💡 AI Recommendations</h2>
                <button class="btn btn-ghost btn-sm" onclick="Dashboard.refreshRecs()">Refresh</button>
            </div>
            <div id="recommendations-container" style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
                <div class="loading-skeleton" style="height:72px;"></div>
                <div class="loading-skeleton" style="height:72px;"></div>
            </div>

            <!-- System Info -->
            <div class="section-header">
                <h2>📊 System Information</h2>
            </div>
            <div class="glass-card-static" style="padding:20px;" id="system-info-container">
                <div class="loading-skeleton" style="height:100px;"></div>
            </div>
        </div>
        `;
    },

    async init() {
        // Initialize charts
        Charts.createRealtimeChart('chart-cpu', 'CPU', '#6366f1');
        Charts.createRealtimeChart('chart-ram', 'RAM', '#ec4899');
        Charts.createNetworkChart('chart-network');

        // Load initial data
        await this.loadSystemInfo();
        await this.refreshHealth();
        await this.refreshRecs();

        // Listen for real-time updates
        if (window.systemboost) {
            window.systemboost.monitor.onUpdate((data) => {
                this.updateStats(data);
            });
        }
    },

    updateStats(data) {
        if (!data) return;

        // CPU
        const cpuEl = document.getElementById('stat-cpu');
        if (cpuEl) cpuEl.textContent = data.cpu.usage.toFixed(1) + '%';
        const cpuCores = document.getElementById('stat-cpu-cores');
        if (cpuCores) cpuCores.textContent = data.cpu.coreCount + ' cores';
        Charts.updateChart('chart-cpu', data.cpu.usage);

        // RAM
        const ramEl = document.getElementById('stat-ram');
        if (ramEl) ramEl.textContent = data.ram.usagePercent.toFixed(1) + '%';
        const ramDetail = document.getElementById('stat-ram-detail');
        if (ramDetail) ramDetail.textContent = data.ram.usedGB + ' / ' + data.ram.totalGB + ' GB';
        Charts.updateChart('chart-ram', data.ram.usagePercent);

        // Disk
        if (data.disk && data.disk.length > 0) {
            const disk = data.disk[0];
            const diskEl = document.getElementById('stat-disk');
            if (diskEl) diskEl.textContent = disk.usagePercent.toFixed(1) + '%';
            const diskDetail = document.getElementById('stat-disk-detail');
            if (diskDetail) diskDetail.textContent = disk.availableGB + ' GB free';
        }

        // Network
        const netDown = document.getElementById('stat-net-down');
        if (netDown) netDown.textContent = data.network.rxFormatted;
        const netUp = document.getElementById('stat-net-up');
        if (netUp) netUp.textContent = '↑ ' + data.network.txFormatted;
        Charts.updateNetworkChart('chart-network', data.network.rxSec, data.network.txSec);
    },

    async loadSystemInfo() {
        try {
            const info = await window.systemboost.monitor.getSystemInfo();
            const container = document.getElementById('system-info-container');
            if (!container) return;

            container.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;">
                    <div>
                        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Processor</div>
                        <div style="font-size:13px;font-weight:600;">${info.cpu?.brand || 'Unknown'}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${info.cpu?.cores || 0} cores @ ${info.cpu?.speed || 0} GHz</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Memory</div>
                        <div style="font-size:13px;font-weight:600;">${info.memory?.total || 'Unknown'}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Operating System</div>
                        <div style="font-size:13px;font-weight:600;">${info.os?.distro || 'Unknown'}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${info.os?.release || ''} (${info.os?.arch || ''})</div>
                    </div>
                    <div>
                        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Uptime</div>
                        <div style="font-size:13px;font-weight:600;">${formatUptime(info.uptime || 0)}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">Host: ${info.os?.hostname || 'Unknown'}</div>
                    </div>
                    ${info.battery?.hasBattery ? `
                    <div>
                        <div style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Battery</div>
                        <div style="font-size:13px;font-weight:600;">${info.battery.percent}% ${info.battery.isCharging ? '⚡ Charging' : ''}</div>
                    </div>
                    ` : ''}
                </div>
            `;

            const cpuModel = document.getElementById('cpu-model');
            if (cpuModel) cpuModel.textContent = info.cpu?.brand || '';
            const ramTotal = document.getElementById('ram-total');
            if (ramTotal) ramTotal.textContent = info.memory?.total || '';
        } catch (err) {
            console.error('Failed to load system info:', err);
        }
    },

    async refreshHealth() {
        try {
            const health = await window.systemboost.health.calculate();
            
            const scoreEl = document.getElementById('health-score');
            if (scoreEl) scoreEl.textContent = health.overall;
            
            const gradeEl = document.getElementById('health-grade');
            if (gradeEl) {
                gradeEl.textContent = health.grade + ' · ' + health.label;
                gradeEl.style.color = health.color;
            }

            // Animate ring
            const circle = document.getElementById('health-ring-circle');
            if (circle) {
                const circumference = 2 * Math.PI * 52;
                const offset = circumference - (health.overall / 100) * circumference;
                circle.style.strokeDasharray = circumference;
                circle.style.strokeDashoffset = offset;
                circle.style.stroke = health.color;
            }
        } catch (err) {
            console.error('Failed to calculate health:', err);
        }
    },

    async refreshRecs() {
        try {
            const recs = await window.systemboost.recommendations.get();
            const container = document.getElementById('recommendations-container');
            if (!container) return;

            if (!recs || recs.length === 0) {
                container.innerHTML = '<div class="rec-card success"><span class="rec-icon">✅</span><div class="rec-content"><div class="rec-title">System Running Optimally</div><div class="rec-desc">No recommendations at this time.</div></div></div>';
                return;
            }

            container.innerHTML = recs.slice(0, 5).map(rec => `
                <div class="rec-card ${rec.severity}">
                    <span class="rec-icon">${rec.icon}</span>
                    <div class="rec-content">
                        <div class="rec-title">${rec.title}</div>
                        <div class="rec-desc">${rec.description}</div>
                        ${rec.action ? `<button class="btn btn-sm btn-ghost" onclick="Dashboard.handleRecAction('${rec.action}')">${rec.actionLabel}</button>` : ''}
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error('Failed to load recommendations:', err);
        }
    },

    async handleRecAction(action) {
        switch (action) {
            case 'optimize-ram':
                Notify.info('Optimizing RAM', 'Freeing unused memory...');
                await window.systemboost.ram.optimize();
                Notify.success('RAM Optimized', 'Memory has been freed');
                this.refreshRecs();
                break;
            case 'cleanup':
                App.navigate('cleanup');
                break;
            case 'nav-processes':
                App.navigate('processes');
                break;
            case 'kill-bloat':
                await window.systemboost.processes.killBloat();
                Notify.success('Cleaned Up', 'Non-essential processes terminated');
                this.refreshRecs();
                break;
            case 'gaming-mode':
                document.querySelector('#gaming-toggle input').checked = true;
                await window.systemboost.gaming.toggle(true);
                Notify.success('Gaming Mode', 'High performance mode enabled');
                break;
            case 'battery-saver':
                await window.systemboost.battery.setPlan('power-saver');
                Notify.success('Battery Saver', 'Power saver mode enabled');
                break;
        }
    },

    async boost() {
        const btn = document.getElementById('btn-boost');
        if (!btn || btn.classList.contains('boosting')) return;

        btn.classList.add('boosting');
        btn.querySelector('.boost-label').textContent = 'BOOSTING...';
        Notify.info('Boost Started', 'Optimizing your system...');

        try {
            const result = await window.systemboost.boost.run();
            
            btn.classList.remove('boosting');
            btn.querySelector('.boost-label').textContent = 'BOOST NOW';
            
            let message = '';
            if (result.ram) message += `RAM freed: ${result.ram.freedFormatted}. `;
            if (result.cleanup) message += `Files cleaned: ${result.cleanup.filesDeleted}. `;
            
            Notify.success('Boost Complete! 🚀', message || 'System optimized');
            
            await this.refreshHealth();
            await this.refreshRecs();
        } catch (err) {
            btn.classList.remove('boosting');
            btn.querySelector('.boost-label').textContent = 'BOOST NOW';
            Notify.error('Boost Failed', err.message);
        }
    },

    destroy() {
        if (window.systemboost) {
            window.systemboost.monitor.removeUpdateListener();
        }
        Charts.destroy('chart-cpu');
        Charts.destroy('chart-ram');
        Charts.destroy('chart-network');
    }
};
