// ============================================================
// SystemBoost Pro - System Monitor Service
// Real-time CPU, RAM, Disk, Network monitoring
// ============================================================
const si = require('systeminformation');
const os = require('os');
const logger = require('./logger');

class SystemMonitor {
    constructor() {
        this.history = {
            cpu: [],
            ram: [],
            disk: [],
            network: []
        };
        this.maxHistory = 60; // 60 data points
        this.interval = null;
    }

    async getCpuUsage() {
        try {
            const load = await si.currentLoad();
            return {
                usage: Math.round(load.currentLoad * 10) / 10,
                cores: load.cpus.map(c => Math.round(c.load * 10) / 10),
                coreCount: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown',
                speed: os.cpus()[0]?.speed || 0
            };
        } catch (err) {
            logger.error('Failed to get CPU usage', 'monitor', { error: err.message });
            return { usage: 0, cores: [], coreCount: os.cpus().length, model: 'Unknown', speed: 0 };
        }
    }

    async getRamUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        return {
            total: total,
            used: used,
            free: free,
            usagePercent: Math.round((used / total) * 1000) / 10,
            totalGB: (total / (1024 ** 3)).toFixed(1),
            usedGB: (used / (1024 ** 3)).toFixed(1),
            freeGB: (free / (1024 ** 3)).toFixed(1)
        };
    }

    async getDiskUsage() {
        try {
            const disks = await si.fsSize();
            return disks.map(d => ({
                fs: d.fs,
                mount: d.mount,
                type: d.type,
                size: d.size,
                used: d.used,
                available: d.available,
                usagePercent: Math.round(d.use * 10) / 10,
                sizeGB: (d.size / (1024 ** 3)).toFixed(1),
                usedGB: (d.used / (1024 ** 3)).toFixed(1),
                availableGB: (d.available / (1024 ** 3)).toFixed(1)
            }));
        } catch (err) {
            logger.error('Failed to get disk usage', 'monitor', { error: err.message });
            return [];
        }
    }

    async getNetworkStats() {
        try {
            const netStats = await si.networkStats();
            const primary = netStats[0] || {};
            return {
                interface: primary.iface || 'Unknown',
                rxSec: primary.rx_sec || 0,
                txSec: primary.tx_sec || 0,
                rxBytes: primary.rx_bytes || 0,
                txBytes: primary.tx_bytes || 0,
                rxFormatted: this._formatBytes(primary.rx_sec || 0) + '/s',
                txFormatted: this._formatBytes(primary.tx_sec || 0) + '/s'
            };
        } catch (err) {
            logger.error('Failed to get network stats', 'monitor', { error: err.message });
            return { interface: 'Unknown', rxSec: 0, txSec: 0, rxFormatted: '0 B/s', txFormatted: '0 B/s' };
        }
    }

    async getSystemInfo() {
        try {
            const [cpu, mem, osInfo, batt] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.osInfo(),
                si.battery()
            ]);
            return {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    cores: cpu.cores,
                    physicalCores: cpu.physicalCores,
                    speed: cpu.speed
                },
                memory: {
                    total: (mem.total / (1024 ** 3)).toFixed(1) + ' GB'
                },
                os: {
                    platform: osInfo.platform,
                    distro: osInfo.distro,
                    release: osInfo.release,
                    arch: osInfo.arch,
                    hostname: os.hostname()
                },
                battery: {
                    hasBattery: batt.hasBattery,
                    percent: batt.percent,
                    isCharging: batt.isCharging,
                    timeRemaining: batt.timeRemaining
                },
                uptime: os.uptime()
            };
        } catch (err) {
            logger.error('Failed to get system info', 'monitor', { error: err.message });
            return {};
        }
    }

    async getFullSnapshot() {
        const [cpu, ram, disk, network] = await Promise.all([
            this.getCpuUsage(),
            this.getRamUsage(),
            this.getDiskUsage(),
            this.getNetworkStats()
        ]);

        // Push to history
        const timestamp = Date.now();
        this._pushHistory('cpu', { value: cpu.usage, timestamp });
        this._pushHistory('ram', { value: ram.usagePercent, timestamp });
        this._pushHistory('network', { rx: network.rxSec, tx: network.txSec, timestamp });

        return { cpu, ram, disk, network, timestamp };
    }

    _pushHistory(key, data) {
        this.history[key].push(data);
        if (this.history[key].length > this.maxHistory) {
            this.history[key].shift();
        }
    }

    getHistory() {
        return this.history;
    }

    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

module.exports = new SystemMonitor();
