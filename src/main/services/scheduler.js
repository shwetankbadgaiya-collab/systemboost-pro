// ============================================================
// SystemBoost Pro - Auto-Optimization Scheduler
// Cron-like scheduling for automated cleanup and boost
// ============================================================
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class Scheduler {
    constructor() {
        this.configPath = null;
        this.config = {
            enabled: false,
            schedule: 'daily',  // daily, weekly, custom
            time: '03:00',     // Time to run (24h format)
            dayOfWeek: 1,       // 0=Sun, 1=Mon, ... 6=Sat (for weekly)
            tasks: {
                cleanup: true,
                ramOptimize: true,
                killBloat: false
            },
            lastRun: null,
            nextRun: null
        };
        this.timer = null;
        this.checkInterval = null;
    }

    init() {
        try {
            this.configPath = path.join(app.getPath('userData'), 'scheduler-config.json');
            this._loadConfig();
            if (this.config.enabled) {
                this._startScheduler();
            }
        } catch (err) {
            logger.error('Scheduler init failed', 'scheduler', { error: err.message });
        }
    }

    _loadConfig() {
        try {
            if (this.configPath && fs.existsSync(this.configPath)) {
                this.config = { ...this.config, ...JSON.parse(fs.readFileSync(this.configPath, 'utf-8')) };
            }
        } catch { /* use defaults */ }
    }

    _saveConfig() {
        try {
            if (this.configPath) {
                fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            }
        } catch (err) {
            logger.error('Failed to save scheduler config', 'scheduler', { error: err.message });
        }
    }

    getConfig() {
        return { ...this.config };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this._saveConfig();

        if (this.config.enabled) {
            this._startScheduler();
        } else {
            this._stopScheduler();
        }

        logger.info('Scheduler config updated', 'scheduler', this.config);
        return this.config;
    }

    _startScheduler() {
        this._stopScheduler();
        this._calculateNextRun();
        
        // Check every minute if it's time to run
        this.checkInterval = setInterval(() => {
            this._checkAndRun();
        }, 60000);

        logger.info('Scheduler started', 'scheduler', { nextRun: this.config.nextRun });
    }

    _stopScheduler() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    _calculateNextRun() {
        const now = new Date();
        const [hours, minutes] = this.config.time.split(':').map(Number);
        
        let next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        if (next <= now) {
            if (this.config.schedule === 'daily') {
                next.setDate(next.getDate() + 1);
            } else if (this.config.schedule === 'weekly') {
                next.setDate(next.getDate() + 7);
            }
        }

        if (this.config.schedule === 'weekly') {
            while (next.getDay() !== this.config.dayOfWeek) {
                next.setDate(next.getDate() + 1);
            }
        }

        this.config.nextRun = next.toISOString();
        this._saveConfig();
    }

    async _checkAndRun() {
        if (!this.config.enabled || !this.config.nextRun) return;

        const now = new Date();
        const nextRun = new Date(this.config.nextRun);

        if (now >= nextRun) {
            logger.info('Scheduled optimization triggered', 'scheduler');
            await this._runScheduledTasks();
            this.config.lastRun = now.toISOString();
            this._calculateNextRun();
        }
    }

    async _runScheduledTasks() {
        try {
            if (this.config.tasks.cleanup) {
                const cleaner = require('./cleaner');
                await cleaner.clean();
            }

            if (this.config.tasks.ramOptimize) {
                const ramOptimizer = require('./ramOptimizer');
                await ramOptimizer.optimize();
            }

            if (this.config.tasks.killBloat) {
                const processManager = require('./processManager');
                await processManager.killBloatProcesses();
            }

            logger.success('Scheduled optimization complete', 'scheduler');
        } catch (err) {
            logger.error('Scheduled optimization failed', 'scheduler', { error: err.message });
        }
    }

    async runNow() {
        logger.info('Manual scheduled run triggered', 'scheduler');
        await this._runScheduledTasks();
        this.config.lastRun = new Date().toISOString();
        this._saveConfig();
        return { success: true, message: 'Optimization completed' };
    }

    destroy() {
        this._stopScheduler();
    }
}

module.exports = new Scheduler();
