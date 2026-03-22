// ============================================================
// SystemBoost Pro - Health Score Calculator
// Composite system health rating (0-100)
// ============================================================
const monitor = require('./monitor');
const logger = require('./logger');

class HealthScore {
    constructor() {
        this.weights = {
            cpu: 0.30,      // 30% weight
            ram: 0.25,      // 25% weight
            disk: 0.20,     // 20% weight
            uptime: 0.10,   // 10% weight
            processes: 0.15  // 15% weight
        };

        this.lastScore = null;
        this.scoreHistory = [];
    }

    async calculate() {
        try {
            const snapshot = await monitor.getFullSnapshot();
            
            // CPU Score (lower usage = higher score)
            const cpuScore = Math.max(0, 100 - snapshot.cpu.usage);
            
            // RAM Score (lower usage = higher score)
            const ramScore = Math.max(0, 100 - snapshot.ram.usagePercent);
            
            // Disk Score (more free space = higher score)
            let diskScore = 100;
            if (snapshot.disk.length > 0) {
                const primaryDisk = snapshot.disk[0];
                diskScore = Math.max(0, 100 - primaryDisk.usagePercent);
            }
            
            // Uptime Score (restarting regularly is healthy)
            const os = require('os');
            const uptimeHours = os.uptime() / 3600;
            let uptimeScore = 100;
            if (uptimeHours > 168) uptimeScore = 40;     // > 7 days
            else if (uptimeHours > 72) uptimeScore = 65;   // > 3 days
            else if (uptimeHours > 24) uptimeScore = 85;   // > 1 day
            
            // Process Score (fewer processes = healthier)
            let processScore = 80; // default
            try {
                const processManager = require('./processManager');
                const stats = await processManager.getProcessStats();
                if (stats.totalProcesses > 200) processScore = 40;
                else if (stats.totalProcesses > 150) processScore = 55;
                else if (stats.totalProcesses > 100) processScore = 70;
                else processScore = 90;
                
                // Penalize for not-responding processes
                processScore -= stats.notResponding * 5;
            } catch { /* use default */ }
            
            // Weighted composite
            const composite = Math.round(
                cpuScore * this.weights.cpu +
                ramScore * this.weights.ram +
                diskScore * this.weights.disk +
                uptimeScore * this.weights.uptime +
                processScore * this.weights.processes
            );

            const score = Math.max(0, Math.min(100, composite));
            
            const result = {
                overall: score,
                grade: this._getGrade(score),
                label: this._getLabel(score),
                color: this._getColor(score),
                breakdown: {
                    cpu: { score: Math.round(cpuScore), weight: this.weights.cpu, usage: snapshot.cpu.usage },
                    ram: { score: Math.round(ramScore), weight: this.weights.ram, usage: snapshot.ram.usagePercent },
                    disk: { score: Math.round(diskScore), weight: this.weights.disk },
                    uptime: { score: Math.round(uptimeScore), weight: this.weights.uptime, hours: Math.round(uptimeHours) },
                    processes: { score: Math.round(processScore), weight: this.weights.processes }
                },
                timestamp: Date.now()
            };

            this.lastScore = result;
            this.scoreHistory.push({ score, timestamp: Date.now() });
            if (this.scoreHistory.length > 100) this.scoreHistory.shift();

            return result;
        } catch (err) {
            logger.error('Failed to calculate health score', 'health', { error: err.message });
            return { overall: 0, grade: '?', label: 'Unknown', color: '#888', breakdown: {} };
        }
    }

    _getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    _getLabel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Fair';
        if (score >= 40) return 'Poor';
        return 'Critical';
    }

    _getColor(score) {
        if (score >= 80) return '#00e676';
        if (score >= 60) return '#ffca28';
        if (score >= 40) return '#ff9800';
        return '#ff5252';
    }

    getHistory() {
        return this.scoreHistory;
    }

    getLastScore() {
        return this.lastScore;
    }
}

module.exports = new HealthScore();
