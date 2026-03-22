// ============================================================
// SystemBoost Pro - Settings Page
// ============================================================
const SettingsPage = {
    config: null,

    render() {
        return `
        <div class="page" id="page-settings">
            <div class="page-header">
                <h1>Settings</h1>
                <p>Configure SystemBoost Pro preferences</p>
            </div>

            <div style="display:flex;flex-direction:column;gap:20px;">
                <!-- Appearance -->
                <div class="glass-card-static" style="padding:24px;">
                    <h2 style="font-size:16px;font-weight:600;margin-bottom:16px;">🎨 Appearance</h2>
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                        <div><div style="font-weight:500;font-size:13px;">Dark Mode</div><div style="font-size:12px;color:var(--text-secondary);">Toggle between dark and light themes</div></div>
                        <label class="toggle-switch"><input type="checkbox" id="setting-dark" onchange="SettingsPage.toggleTheme(this.checked)"><span class="toggle-slider"></span></label>
                    </div>
                </div>

                <!-- Performance Modes -->
                <div class="glass-card-static" style="padding:24px;">
                    <h2 style="font-size:16px;font-weight:600;margin-bottom:16px;">⚡ Performance Modes</h2>
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                        <div><div style="font-weight:500;font-size:13px;">Gaming Mode</div><div style="font-size:12px;color:var(--text-secondary);">Maximize performance, disable background tasks</div></div>
                        <label class="toggle-switch"><input type="checkbox" id="setting-gaming" onchange="SettingsPage.toggleGaming(this.checked)"><span class="toggle-slider"></span></label>
                    </div>
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                        <div><div style="font-weight:500;font-size:13px;">Battery Saver</div><div style="font-size:12px;color:var(--text-secondary);">Optimize for maximum battery life</div></div>
                        <button class="btn btn-ghost btn-sm" onclick="SettingsPage.setBatterySaver()">Enable</button>
                    </div>
                    <div class="flex-between" style="padding:10px 0;">
                        <div><div style="font-weight:500;font-size:13px;">Power Plan</div><div style="font-size:12px;color:var(--text-secondary);">Current Windows power plan</div></div>
                        <select class="form-select" style="width:180px;" id="setting-power" onchange="SettingsPage.setPowerPlan(this.value)">
                            <option value="balanced">Balanced</option>
                            <option value="high-performance">High Performance</option>
                            <option value="power-saver">Power Saver</option>
                        </select>
                    </div>
                </div>

                <!-- Scheduler -->
                <div class="glass-card-static" style="padding:24px;">
                    <h2 style="font-size:16px;font-weight:600;margin-bottom:16px;">⏰ Auto Optimization</h2>
                    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border-color);">
                        <div><div style="font-weight:500;font-size:13px;">Enable Scheduler</div><div style="font-size:12px;color:var(--text-secondary);">Automatically optimize on a schedule</div></div>
                        <label class="toggle-switch"><input type="checkbox" id="setting-scheduler" onchange="SettingsPage.toggleScheduler(this.checked)"><span class="toggle-slider"></span></label>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;" id="scheduler-options">
                        <div>
                            <label class="form-label">Frequency</label>
                            <select class="form-select" id="setting-schedule-freq" onchange="SettingsPage.updateScheduler()">
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Time</label>
                            <input type="time" class="form-input" id="setting-schedule-time" value="03:00" onchange="SettingsPage.updateScheduler()">
                        </div>
                    </div>
                    <div style="margin-top:12px;">
                        <button class="btn btn-ghost btn-sm" onclick="SettingsPage.runScheduleNow()">▶️ Run Now</button>
                        <span style="font-size:12px;color:var(--text-tertiary);margin-left:12px;" id="schedule-next">Next run: --</span>
                    </div>
                </div>

                <!-- About -->
                <div class="glass-card-static" style="padding:24px;">
                    <h2 style="font-size:16px;font-weight:600;margin-bottom:16px;">ℹ️ About</h2>
                    <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;">
                        <strong>SystemBoost Pro</strong> v1.0.0<br>
                        Premium System Optimizer for Windows<br>
                        Built with Electron + Node.js
                    </div>
                </div>
            </div>
        </div>`;
    },

    async init() {
        const darkEl = document.getElementById('setting-dark');
        if (darkEl) darkEl.checked = document.documentElement.getAttribute('data-theme') === 'dark';

        try {
            const gaming = await window.systemboost.gaming.status();
            const gamingEl = document.getElementById('setting-gaming');
            if (gamingEl) gamingEl.checked = gaming.enabled;
        } catch {}

        try {
            this.config = await window.systemboost.scheduler.getConfig();
            const schedEl = document.getElementById('setting-scheduler');
            if (schedEl) schedEl.checked = this.config.enabled;
            const freqEl = document.getElementById('setting-schedule-freq');
            if (freqEl) freqEl.value = this.config.schedule || 'daily';
            const timeEl = document.getElementById('setting-schedule-time');
            if (timeEl) timeEl.value = this.config.time || '03:00';
            const nextEl = document.getElementById('schedule-next');
            if (nextEl && this.config.nextRun) nextEl.textContent = 'Next: ' + new Date(this.config.nextRun).toLocaleString();
        } catch {}
    },

    toggleTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    },

    async toggleGaming(enabled) {
        try {
            await window.systemboost.gaming.toggle(enabled);
            const sidebarToggle = document.querySelector('#gaming-toggle input');
            if (sidebarToggle) sidebarToggle.checked = enabled;
            Notify.success(enabled ? 'Gaming Mode On' : 'Gaming Mode Off', enabled ? 'High performance enabled' : 'Balanced mode restored');
        } catch (err) { Notify.error('Error', err.message); }
    },

    async setBatterySaver() {
        try {
            await window.systemboost.battery.setPlan('power-saver');
            Notify.success('Battery Saver', 'Power saver mode enabled');
        } catch (err) { Notify.error('Error', err.message); }
    },

    async setPowerPlan(mode) {
        try {
            await window.systemboost.battery.setPlan(mode);
            Notify.success('Power Plan', `Switched to ${mode}`);
        } catch (err) { Notify.error('Error', err.message); }
    },

    async toggleScheduler(enabled) {
        try {
            await window.systemboost.scheduler.updateConfig({ enabled });
            Notify.success('Scheduler', enabled ? 'Auto-optimization enabled' : 'Scheduler disabled');
        } catch (err) { Notify.error('Error', err.message); }
    },

    async updateScheduler() {
        const freq = document.getElementById('setting-schedule-freq')?.value || 'daily';
        const time = document.getElementById('setting-schedule-time')?.value || '03:00';
        try {
            const config = await window.systemboost.scheduler.updateConfig({ schedule: freq, time });
            if (config.nextRun) {
                const nextEl = document.getElementById('schedule-next');
                if (nextEl) nextEl.textContent = 'Next: ' + new Date(config.nextRun).toLocaleString();
            }
        } catch {}
    },

    async runScheduleNow() {
        Notify.info('Running', 'Executing scheduled optimization...');
        try {
            await window.systemboost.scheduler.runNow();
            Notify.success('Done', 'Scheduled optimization completed');
        } catch (err) { Notify.error('Error', err.message); }
    },

    destroy() {}
};
