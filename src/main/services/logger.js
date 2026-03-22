// ============================================================
// SystemBoost Pro - Logger Service
// Structured action logging with rotation
// ============================================================
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
    constructor() {
        this.logDir = path.join(app.getPath('userData'), 'logs');
        this.maxLogSize = 5 * 1024 * 1024; // 5MB
        this.maxLogFiles = 5;
        this.logs = [];
        this._ensureLogDir();
    }

    _ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    _getLogFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `systemboost-${date}.json`);
    }

    log(action, category, details = {}, level = 'info') {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            action,
            details,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        this.logs.push(entry);
        if (this.logs.length > 500) {
            this.logs = this.logs.slice(-300);
        }

        this._writeToFile(entry);
        return entry;
    }

    info(action, category, details) {
        return this.log(action, category, details, 'info');
    }

    warn(action, category, details) {
        return this.log(action, category, details, 'warn');
    }

    error(action, category, details) {
        return this.log(action, category, details, 'error');
    }

    success(action, category, details) {
        return this.log(action, category, details, 'success');
    }

    _writeToFile(entry) {
        try {
            const filePath = this._getLogFilePath();
            let existingLogs = [];
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                if (stat.size > this.maxLogSize) {
                    this._rotateLog(filePath);
                } else {
                    try {
                        existingLogs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    } catch { existingLogs = []; }
                }
            }
            existingLogs.push(entry);
            fs.writeFileSync(filePath, JSON.stringify(existingLogs, null, 2));
        } catch (err) {
            console.error('Logger write error:', err.message);
        }
    }

    _rotateLog(filePath) {
        try {
            const ext = path.extname(filePath);
            const base = filePath.replace(ext, '');
            for (let i = this.maxLogFiles - 1; i >= 1; i--) {
                const oldFile = `${base}.${i}${ext}`;
                const newFile = `${base}.${i + 1}${ext}`;
                if (fs.existsSync(oldFile)) {
                    if (i === this.maxLogFiles - 1) fs.unlinkSync(oldFile);
                    else fs.renameSync(oldFile, newFile);
                }
            }
            fs.renameSync(filePath, `${base}.1${ext}`);
        } catch (err) {
            console.error('Log rotation error:', err.message);
        }
    }

    getRecentLogs(count = 100, category = null) {
        let filtered = this.logs;
        if (category) {
            filtered = filtered.filter(l => l.category === category);
        }
        return filtered.slice(-count).reverse();
    }

    async getLogsFromDisk(days = 7) {
        const logs = [];
        try {
            const files = fs.readdirSync(this.logDir)
                .filter(f => f.startsWith('systemboost-') && f.endsWith('.json'))
                .sort()
                .reverse()
                .slice(0, days);

            for (const file of files) {
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(this.logDir, file), 'utf-8'));
                    logs.push(...data);
                } catch { /* skip corrupted */ }
            }
        } catch { /* no logs yet */ }
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    getStats() {
        const categories = {};
        for (const log of this.logs) {
            categories[log.category] = (categories[log.category] || 0) + 1;
        }
        return {
            totalLogs: this.logs.length,
            categories,
            oldestLog: this.logs[0]?.timestamp || null,
            newestLog: this.logs[this.logs.length - 1]?.timestamp || null
        };
    }
}

module.exports = new Logger();
