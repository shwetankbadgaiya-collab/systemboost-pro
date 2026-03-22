// ============================================================
// SystemBoost Pro - Logs & Analytics Page
// ============================================================
const LogsPage = {
    logs: [],
    filter: null,

    render() {
        return `
        <div class="page" id="page-logs">
            <div class="page-header flex-between">
                <div>
                    <h1>Logs & Analytics</h1>
                    <p>Action history and optimization trends</p>
                </div>
                <div class="flex gap-sm">
                    <select class="form-select" style="width:150px;" id="log-filter" onchange="LogsPage.onFilter(this.value)">
                        <option value="">All Categories</option>
                        <option value="boost">Boost</option>
                        <option value="cleaner">Cleanup</option>
                        <option value="processes">Processes</option>
                        <option value="ram">RAM</option>
                        <option value="startup">Startup</option>
                        <option value="system">System</option>
                    </select>
                    <button class="btn btn-ghost btn-sm" onclick="LogsPage.refresh()">🔄</button>
                </div>
            </div>
            <div class="grid-4" style="margin-bottom:20px;">
                <div class="glass-card stat-card"><div class="stat-value" id="log-total">--</div><div class="stat-label">Total</div></div>
                <div class="glass-card stat-card"><div class="stat-value" id="log-today">--</div><div class="stat-label">Today</div></div>
                <div class="glass-card stat-card"><div class="stat-value text-success" id="log-success">--</div><div class="stat-label">Success</div></div>
                <div class="glass-card stat-card"><div class="stat-value text-danger" id="log-errors">--</div><div class="stat-label">Errors</div></div>
            </div>
            <div class="glass-card-static" style="padding:4px;">
                <div class="log-timeline" id="log-timeline">
                    <div style="text-align:center;padding:40px;color:var(--text-secondary);"><span class="spinner spinner-lg"></span></div>
                </div>
            </div>
        </div>`;
    },

    async init() { await this.refresh(); },

    async refresh() {
        try {
            this.logs = await window.systemboost.logs.recent(200, this.filter);
            this.renderLogs();
            this.updateStats();
        } catch (err) { console.error('Failed to load logs:', err); }
    },

    onFilter(v) { this.filter = v || null; this.refresh(); },

    updateStats() {
        const today = this.logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length;
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        el('log-total', this.logs.length);
        el('log-today', today);
        el('log-success', this.logs.filter(l => l.level === 'success').length);
        el('log-errors', this.logs.filter(l => l.level === 'error').length);
    },

    renderLogs() {
        const timeline = document.getElementById('log-timeline');
        if (!timeline) return;
        if (!this.logs.length) {
            timeline.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">📋 No logs found.</div>';
            return;
        }
        timeline.innerHTML = this.logs.map(log => {
            const t = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `<div class="log-entry"><span class="log-time">${t}</span><span class="log-level ${log.level}"></span><span class="log-action">${this.esc(log.action)}</span><span class="log-category">${log.category||''}</span></div>`;
        }).join('');
    },

    esc(s) { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; },
    destroy() {}
};
