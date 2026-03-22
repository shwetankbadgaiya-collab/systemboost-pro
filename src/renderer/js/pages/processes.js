// ============================================================
// SystemBoost Pro - Process Manager Page
// List, sort, and kill processes
// ============================================================
const ProcessesPage = {
    processes: [],
    sortBy: 'memoryMB',
    sortAsc: false,
    searchQuery: '',
    refreshInterval: null,

    render() {
        return `
        <div class="page" id="page-processes">
            <div class="page-header flex-between">
                <div>
                    <h1>Process Manager</h1>
                    <p>Monitor and manage running processes</p>
                </div>
                <div class="flex gap-sm">
                    <input type="text" class="form-input" placeholder="Search processes..." 
                        style="width:220px;" id="process-search" oninput="ProcessesPage.onSearch(this.value)">
                    <button class="btn btn-ghost" onclick="ProcessesPage.refresh()">🔄 Refresh</button>
                    <button class="btn btn-danger btn-sm" onclick="ProcessesPage.killAllBloat()">Kill Bloat</button>
                </div>
            </div>

            <div class="glass-card-static" style="padding:16px;margin-bottom:16px;">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;" id="process-stats">
                    <div><span style="font-size:24px;font-weight:700;" id="ps-total">--</span><br><span class="text-muted" style="font-size:11px;">Total Processes</span></div>
                    <div><span style="font-size:24px;font-weight:700;" id="ps-memory">--</span><br><span class="text-muted" style="font-size:11px;">Total Memory</span></div>
                    <div><span style="font-size:24px;font-weight:700;color:var(--color-warning);" id="ps-bloat">--</span><br><span class="text-muted" style="font-size:11px;">Bloat Detected</span></div>
                    <div><span style="font-size:24px;font-weight:700;color:var(--color-danger);" id="ps-unresponsive">--</span><br><span class="text-muted" style="font-size:11px;">Not Responding</span></div>
                </div>
            </div>

            <div class="glass-card-static process-table-wrap">
                <table class="data-table" id="process-table">
                    <thead>
                        <tr>
                            <th style="width:30px;"></th>
                            <th style="cursor:pointer;" onclick="ProcessesPage.sort('displayName')">Name ↕</th>
                            <th style="cursor:pointer;width:100px;" onclick="ProcessesPage.sort('cpu')">CPU ↕</th>
                            <th style="cursor:pointer;width:120px;" onclick="ProcessesPage.sort('memoryMB')">Memory ↕</th>
                            <th style="width:90px;">Status</th>
                            <th style="width:80px;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="process-tbody">
                        <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">
                            <span class="spinner spinner-lg"></span><br><br>Loading processes...
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        `;
    },

    async init() {
        await this.refresh();
        this.refreshInterval = setInterval(() => this.refresh(), 5000);
    },

    async refresh() {
        try {
            this.processes = await window.systemboost.processes.list();
            this.renderTable();
            this.updateStats();
        } catch (err) {
            console.error('Failed to load processes:', err);
        }
    },

    updateStats() {
        const total = this.processes.length;
        const totalMem = this.processes.reduce((sum, p) => sum + p.memoryMB, 0);
        const bloat = this.processes.filter(p => p.isBloat).length;
        const unresponsive = this.processes.filter(p => !p.responding).length;

        const totalEl = document.getElementById('ps-total');
        if (totalEl) totalEl.textContent = total;
        const memEl = document.getElementById('ps-memory');
        if (memEl) memEl.textContent = (totalMem / 1024).toFixed(1) + ' GB';
        const bloatEl = document.getElementById('ps-bloat');
        if (bloatEl) bloatEl.textContent = bloat;
        const unresEl = document.getElementById('ps-unresponsive');
        if (unresEl) unresEl.textContent = unresponsive;
    },

    renderTable() {
        const tbody = document.getElementById('process-tbody');
        if (!tbody) return;

        let filtered = this.processes;
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.displayName.toLowerCase().includes(q) || 
                p.description.toLowerCase().includes(q)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal = a[this.sortBy], bVal = b[this.sortBy];
            if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
            if (this.sortAsc) return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-secondary);">No processes found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.slice(0, 100).map(p => `
            <tr>
                <td>
                    <span class="proc-dot ${p.isCritical ? 'critical' : p.isBloat ? 'bloat' : 'normal'}" 
                        style="display:inline-block;width:6px;height:6px;border-radius:50;background:${p.isCritical ? 'var(--color-danger)' : p.isBloat ? 'var(--color-warning)' : 'var(--color-success)'}"></span>
                </td>
                <td>
                    <div style="font-weight:500;">${this.escapeHtml(p.displayName)}</div>
                    ${p.description ? `<div style="font-size:11px;color:var(--text-tertiary);">${this.escapeHtml(p.description).substring(0, 50)}</div>` : ''}
                </td>
                <td><span style="font-variant-numeric:tabular-nums;">${p.cpu.toFixed(1)}s</span></td>
                <td>
                    <div style="font-variant-numeric:tabular-nums;font-weight:500;">${p.memoryMB.toFixed(1)} MB</div>
                    <div class="progress-bar" style="margin-top:4px;">
                        <div class="progress-fill ${p.memoryMB > 500 ? 'danger' : 'cpu'}" style="width:${Math.min(100, (p.memoryMB / 500) * 100)}%"></div>
                    </div>
                </td>
                <td>
                    ${p.responding 
                        ? '<span class="badge badge-success">Running</span>' 
                        : '<span class="badge badge-danger">Hung</span>'}
                </td>
                <td>
                    ${p.isCritical 
                        ? '<span class="badge badge-info" style="font-size:10px;">System</span>'
                        : `<button class="btn btn-sm btn-danger" onclick="ProcessesPage.killProcess(${p.pid}, '${this.escapeHtml(p.name)}', '${this.escapeHtml(p.displayName)}')" style="padding:4px 8px;font-size:11px;">End</button>`
                    }
                </td>
            </tr>
        `).join('');
    },

    sort(field) {
        if (this.sortBy === field) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortBy = field;
            this.sortAsc = false;
        }
        this.renderTable();
    },

    onSearch(query) {
        this.searchQuery = query;
        this.renderTable();
    },

    async killProcess(pid, name, displayName) {
        App.showModal(
            '⚠️',
            'End Process?',
            `Are you sure you want to terminate "${displayName}" (PID: ${pid})? Unsaved data in this application will be lost.`,
            async () => {
                try {
                    const result = await window.systemboost.processes.kill(pid, name);
                    if (result.success) {
                        Notify.success('Process Terminated', result.message);
                    } else {
                        Notify.error('Failed', result.message);
                    }
                    await this.refresh();
                } catch (err) {
                    Notify.error('Error', err.message);
                }
            }
        );
    },

    async killAllBloat() {
        const bloatCount = this.processes.filter(p => p.isBloat).length;
        if (bloatCount === 0) {
            Notify.info('No Bloat Found', 'No known bloatware processes are running');
            return;
        }

        App.showModal(
            '🎯',
            'Kill Bloat Processes?',
            `This will terminate ${bloatCount} non-essential background process(es). Active work in those apps may be lost.`,
            async () => {
                try {
                    await window.systemboost.processes.killBloat();
                    Notify.success('Bloat Cleared', `Terminated ${bloatCount} processes`);
                    await this.refresh();
                } catch (err) {
                    Notify.error('Error', err.message);
                }
            }
        );
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
};
