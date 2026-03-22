// ============================================================
// SystemBoost Pro - Cleanup Page
// Temp file scanner and cleaner
// ============================================================
const CleanupPage = {
    scanResult: null,
    isScanning: false,
    isCleaning: false,

    render() {
        return `
        <div class="page" id="page-cleanup">
            <div class="page-header flex-between">
                <div>
                    <h1>Disk Cleanup</h1>
                    <p>Scan and remove temporary files, cache, and junk</p>
                </div>
                <div class="flex gap-sm">
                    <button class="btn btn-ghost" id="btn-scan" onclick="CleanupPage.scan()">
                        🔍 Scan Now
                    </button>
                    <button class="btn btn-primary" id="btn-clean" onclick="CleanupPage.clean()" disabled>
                        🧹 Clean All
                    </button>
                </div>
            </div>

            <div id="cleanup-content">
                <div class="empty-state glass-card-static">
                    <div class="empty-icon">🔍</div>
                    <div class="empty-title">Ready to Scan</div>
                    <div class="empty-desc">Click "Scan Now" to find temporary files, cache, and other junk files that can be safely removed.</div>
                </div>
            </div>
        </div>
        `;
    },

    async init() {
        // Auto-scan on page load
    },

    async scan() {
        if (this.isScanning) return;
        this.isScanning = true;

        const content = document.getElementById('cleanup-content');
        const scanBtn = document.getElementById('btn-scan');
        const cleanBtn = document.getElementById('btn-clean');

        scanBtn.disabled = true;
        scanBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Scanning...';

        content.innerHTML = `
            <div class="glass-card-static cleanup-progress">
                <div class="progress-icon animate-spin">⚙️</div>
                <div class="progress-text">Scanning your system...</div>
                <div class="progress-sub">Looking for temporary files, cache, and junk</div>
            </div>
        `;

        try {
            this.scanResult = await window.systemboost.cleaner.scan();
            this.renderScanResults();
            cleanBtn.disabled = false;
            Notify.success('Scan Complete', `Found ${this.scanResult.totalFiles} files (${this.formatSize(this.scanResult.totalSize)})`);
        } catch (err) {
            content.innerHTML = `
                <div class="empty-state glass-card-static">
                    <div class="empty-icon">❌</div>
                    <div class="empty-title">Scan Failed</div>
                    <div class="empty-desc">${err.message}</div>
                </div>
            `;
            Notify.error('Scan Failed', err.message);
        } finally {
            this.isScanning = false;
            scanBtn.disabled = false;
            scanBtn.innerHTML = '🔍 Scan Now';
        }
    },

    renderScanResults() {
        if (!this.scanResult) return;
        const content = document.getElementById('cleanup-content');

        const categoryIcons = {
            tempFiles: '📄',
            cache: '🗃️',
            logs: '📋',
            thumbnails: '🖼️',
            recycleBin: '🗑️'
        };

        const categories = Object.entries(this.scanResult.categories)
            .filter(([_, cat]) => cat.size > 0)
            .sort((a, b) => b[1].size - a[1].size);

        if (categories.length === 0) {
            content.innerHTML = `
                <div class="empty-state glass-card-static">
                    <div class="empty-icon">✨</div>
                    <div class="empty-title">System is Clean!</div>
                    <div class="empty-desc">No significant junk files found. Your system is already optimized.</div>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="glass-card-static" style="padding:20px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:13px;color:var(--text-secondary);">Total Space to Free</div>
                        <div style="font-size:32px;font-weight:800;letter-spacing:-1px;background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${this.formatSize(this.scanResult.totalSize)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:24px;font-weight:700;">${this.scanResult.totalFiles}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">files found</div>
                    </div>
                </div>
                <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px;">Scanned in ${this.scanResult.scanTime}ms</div>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px;">
                ${categories.map(([key, cat]) => `
                    <div class="glass-card scan-result-card">
                        <div class="scan-icon">${categoryIcons[key] || '📦'}</div>
                        <div class="scan-info">
                            <div class="scan-name">${cat.label}</div>
                            <div class="scan-detail">${cat.files.length} file${cat.files.length !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="scan-size">${this.formatSize(cat.size)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async clean() {
        if (this.isCleaning || !this.scanResult) return;
        
        // Show confirmation modal
        App.showModal(
            '🧹',
            'Clean All Files?',
            `This will permanently delete ${this.scanResult.totalFiles} temporary files (${this.formatSize(this.scanResult.totalSize)}). This action cannot be undone.`,
            async () => {
                await this.performClean();
            }
        );
    },

    async performClean() {
        this.isCleaning = true;
        const cleanBtn = document.getElementById('btn-clean');
        const content = document.getElementById('cleanup-content');

        cleanBtn.disabled = true;
        cleanBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Cleaning...';

        content.innerHTML = `
            <div class="glass-card-static cleanup-progress">
                <div class="progress-icon animate-spin">🧹</div>
                <div class="progress-text">Cleaning your system...</div>
                <div class="progress-sub">Removing temporary files and cache</div>
            </div>
        `;

        try {
            const result = await window.systemboost.cleaner.clean();
            
            content.innerHTML = `
                <div class="glass-card-static cleanup-progress">
                    <div class="progress-icon">✅</div>
                    <div class="progress-text">Cleanup Complete!</div>
                    <div class="progress-sub">
                        Deleted ${result.filesDeleted} files · Freed ${result.sizeFreedFormatted}
                        ${result.errors > 0 ? ` · ${result.errors} files skipped (in use)` : ''}
                    </div>
                </div>
            `;

            Notify.success('Cleanup Complete', `Freed ${result.sizeFreedFormatted}`);
            this.scanResult = null;
        } catch (err) {
            Notify.error('Cleanup Failed', err.message);
        } finally {
            this.isCleaning = false;
            cleanBtn.disabled = false;
            cleanBtn.innerHTML = '🧹 Clean All';
        }
    },

    formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    destroy() {}
};
