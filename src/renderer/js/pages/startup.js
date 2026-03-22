// ============================================================
// SystemBoost Pro - Startup Manager Page
// Toggle startup programs on/off
// ============================================================
const StartupPage = {
    items: [],

    render() {
        return `
        <div class="page" id="page-startup">
            <div class="page-header flex-between">
                <div>
                    <h1>Startup Manager</h1>
                    <p>Control which programs launch at startup</p>
                </div>
                <button class="btn btn-ghost" onclick="StartupPage.refresh()">🔄 Refresh</button>
            </div>

            <div id="startup-content">
                <div class="glass-card-static" style="padding:40px;text-align:center;">
                    <span class="spinner spinner-lg"></span>
                    <div style="margin-top:16px;color:var(--text-secondary);">Loading startup items...</div>
                </div>
            </div>
        </div>
        `;
    },

    async init() {
        await this.refresh();
    },

    async refresh() {
        try {
            this.items = await window.systemboost.startup.list();
            this.renderItems();
        } catch (err) {
            const content = document.getElementById('startup-content');
            if (content) {
                content.innerHTML = `
                    <div class="empty-state glass-card-static">
                        <div class="empty-icon">⚠️</div>
                        <div class="empty-title">Could Not Load Startup Items</div>
                        <div class="empty-desc">${err.message || 'Failed to access startup registry'}</div>
                    </div>
                `;
            }
        }
    },

    renderItems() {
        const content = document.getElementById('startup-content');
        if (!content) return;

        if (!this.items || this.items.length === 0) {
            content.innerHTML = `
                <div class="empty-state glass-card-static">
                    <div class="empty-icon">🚀</div>
                    <div class="empty-title">No Startup Items Found</div>
                    <div class="empty-desc">No programs are configured to launch at system startup.</div>
                </div>
            `;
            return;
        }

        const impactColors = { high: 'danger', medium: 'warning', low: 'success' };
        const impactLabels = { high: 'High Impact', medium: 'Medium Impact', low: 'Low Impact' };

        content.innerHTML = `
            <div class="glass-card-static" style="padding:16px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:13px;color:var(--text-secondary);">
                        ${this.items.length} startup program${this.items.length !== 1 ? 's' : ''} found
                    </span>
                    <span style="font-size:12px;color:var(--text-tertiary);">
                        Disabling startup items can improve boot time
                    </span>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                ${this.items.map((item, index) => `
                    <div class="glass-card" style="padding:16px;display:flex;align-items:center;gap:16px;">
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:600;font-size:13px;margin-bottom:3px;">${this.escapeHtml(item.name)}</div>
                            <div style="font-size:11px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(item.command)}</div>
                        </div>
                        <span class="badge badge-${impactColors[item.impact] || 'info'}">${impactLabels[item.impact] || 'Unknown'}</span>
                        <label class="toggle-switch">
                            <input type="checkbox" ${item.enabled ? 'checked' : ''} 
                                onchange="StartupPage.toggle(${index}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async toggle(index, enabled) {
        const item = this.items[index];
        if (!item) return;

        try {
            let result;
            if (enabled) {
                result = await window.systemboost.startup.enable(item.name, item.registryPath);
            } else {
                result = await window.systemboost.startup.disable(item.name, item.registryPath);
            }

            if (result.success) {
                Notify.success(enabled ? 'Enabled' : 'Disabled', result.message);
                item.enabled = enabled;
            } else {
                Notify.error('Failed', result.message);
                // Revert toggle
                this.renderItems();
            }
        } catch (err) {
            Notify.error('Error', err.message);
            this.renderItems();
        }
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },

    destroy() {}
};
