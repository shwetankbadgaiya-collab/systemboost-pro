// ============================================================
// SystemBoost Pro - Battery Service
// Battery status, health, and power plan management
// ============================================================
const si = require('systeminformation');
const { exec } = require('child_process');
const logger = require('./logger');

class BatteryService {
    async getStatus() {
        try {
            const battery = await si.battery();
            return {
                hasBattery: battery.hasBattery,
                percent: battery.percent,
                isCharging: battery.isCharging,
                acConnected: battery.acConnected,
                timeRemaining: battery.timeRemaining,
                timeRemainingFormatted: this._formatTime(battery.timeRemaining),
                voltage: battery.voltage,
                designedCapacity: battery.designedCapacity,
                maxCapacity: battery.maxCapacity,
                currentCapacity: battery.currentCapacity,
                health: battery.maxCapacity && battery.designedCapacity 
                    ? Math.round((battery.maxCapacity / battery.designedCapacity) * 100)
                    : null,
                cycleCount: battery.cycleCount || null,
                status: this._getStatusLabel(battery.percent, battery.isCharging)
            };
        } catch (err) {
            logger.error('Failed to get battery status', 'battery', { error: err.message });
            return { hasBattery: false };
        }
    }

    async getCurrentPowerPlan() {
        return new Promise((resolve) => {
            exec('powershell -Command "powercfg /getactivescheme"', { timeout: 5000 }, (err, stdout) => {
                if (err) {
                    resolve({ name: 'Unknown', guid: '' });
                    return;
                }
                const match = stdout.match(/:\s*(.+?)\s*\((.+?)\)/);
                resolve({
                    guid: match ? match[1].trim() : '',
                    name: match ? match[2].trim() : 'Unknown'
                });
            });
        });
    }

    async setPowerPlan(mode) {
        const plans = {
            'power-saver': { guid: 'a1841308-3541-4fab-bc81-f71556f20b4a', name: 'Power Saver' },
            'balanced': { guid: '381b4222-f694-41f0-9685-ff5bb260df2e', name: 'Balanced' },
            'high-performance': { guid: '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c', name: 'High Performance' }
        };

        const plan = plans[mode];
        if (!plan) {
            return { success: false, message: `Unknown power plan: ${mode}` };
        }

        return new Promise((resolve) => {
            exec(`powercfg /setactive ${plan.guid}`, { timeout: 5000 }, (err) => {
                if (err) {
                    logger.error(`Failed to set power plan to ${plan.name}`, 'battery', { error: err.message });
                    resolve({ success: false, message: err.message });
                } else {
                    logger.success(`Power plan set to ${plan.name}`, 'battery');
                    resolve({ success: true, message: `Switched to ${plan.name}` });
                }
            });
        });
    }

    async enableBatterySaver() {
        const result = await this.setPowerPlan('power-saver');
        if (result.success) {
            logger.info('Battery saver mode enabled', 'battery');
        }
        return result;
    }

    async enableGamingMode() {
        const result = await this.setPowerPlan('high-performance');
        if (result.success) {
            logger.info('Gaming mode (high performance) enabled', 'battery');
        }
        return result;
    }

    _getStatusLabel(percent, isCharging) {
        if (isCharging) return 'Charging';
        if (percent > 80) return 'Excellent';
        if (percent > 50) return 'Good';
        if (percent > 20) return 'Low';
        return 'Critical';
    }

    _formatTime(minutes) {
        if (!minutes || minutes < 0) return 'Calculating...';
        const h = Math.floor(minutes / 60);
        const m = Math.round(minutes % 60);
        if (h === 0) return `${m}m remaining`;
        return `${h}h ${m}m remaining`;
    }
}

module.exports = new BatteryService();
