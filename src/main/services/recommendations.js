// ============================================================
// SystemBoost Pro - AI Recommendations Engine
// Analyzes system state and suggests optimizations
// ============================================================
const os = require('os');
const logger = require('./logger');

class Recommendations {
    async generate() {
        const recommendations = [];

        try {
            // Check RAM usage
            const ramPercent = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;
            if (ramPercent > 85) {
                recommendations.push({
                    id: 'ram-high',
                    severity: 'critical',
                    category: 'Memory',
                    icon: '🧠',
                    title: 'High Memory Usage Detected',
                    description: `Your RAM usage is at ${Math.round(ramPercent)}%. Close unused applications or run RAM Optimizer to free memory.`,
                    action: 'optimize-ram',
                    actionLabel: 'Optimize RAM'
                });
            } else if (ramPercent > 70) {
                recommendations.push({
                    id: 'ram-moderate',
                    severity: 'warning',
                    category: 'Memory',
                    icon: '🧠',
                    title: 'Moderate Memory Usage',
                    description: `RAM usage is at ${Math.round(ramPercent)}%. Consider closing some background applications.`,
                    action: 'optimize-ram',
                    actionLabel: 'Optimize RAM'
                });
            }

            // Check uptime
            const uptimeHours = os.uptime() / 3600;
            if (uptimeHours > 168) {
                recommendations.push({
                    id: 'uptime-high',
                    severity: 'warning',
                    category: 'System',
                    icon: '🔄',
                    title: 'System Restart Recommended',
                    description: `Your PC has been running for ${Math.round(uptimeHours / 24)} days. Restarting clears memory leaks and applies updates.`,
                    action: null,
                    actionLabel: 'Noted'
                });
            }

            // Check CPU count vs typical workload
            const cpuCount = os.cpus().length;
            if (cpuCount <= 2) {
                recommendations.push({
                    id: 'cpu-low',
                    severity: 'info',
                    category: 'Performance',
                    icon: '⚡',
                    title: 'Limited CPU Cores',
                    description: `Your system has ${cpuCount} CPU cores. Enable Gaming Mode for better performance during heavy tasks.`,
                    action: 'gaming-mode',
                    actionLabel: 'Enable Gaming Mode'
                });
            }

            // Check disk usage
            try {
                const si = require('systeminformation');
                const disks = await si.fsSize();
                for (const disk of disks) {
                    if (disk.use > 90) {
                        recommendations.push({
                            id: `disk-full-${disk.mount}`,
                            severity: 'critical',
                            category: 'Storage',
                            icon: '💾',
                            title: `Low Disk Space on ${disk.mount}`,
                            description: `Drive ${disk.mount} is ${Math.round(disk.use)}% full. Run Disk Cleanup to free space.`,
                            action: 'cleanup',
                            actionLabel: 'Run Cleanup'
                        });
                    } else if (disk.use > 75) {
                        recommendations.push({
                            id: `disk-moderate-${disk.mount}`,
                            severity: 'warning',
                            category: 'Storage',
                            icon: '💾',
                            title: `Storage Getting Full on ${disk.mount}`,
                            description: `Drive ${disk.mount} is ${Math.round(disk.use)}% full. Consider cleaning temporary files.`,
                            action: 'cleanup',
                            actionLabel: 'Scan Files'
                        });
                    }
                }
            } catch { /* skip disk check */ }

            // Check processes
            try {
                const processManager = require('./processManager');
                const stats = await processManager.getProcessStats();
                
                if (stats.totalProcesses > 150) {
                    recommendations.push({
                        id: 'too-many-processes',
                        severity: 'warning',
                        category: 'Processes',
                        icon: '📋',
                        title: 'Too Many Running Processes',
                        description: `${stats.totalProcesses} processes running. Consider closing unnecessary apps or using Process Manager.`,
                        action: 'nav-processes',
                        actionLabel: 'View Processes'
                    });
                }

                if (stats.notResponding > 0) {
                    recommendations.push({
                        id: 'not-responding',
                        severity: 'critical',
                        category: 'Processes',
                        icon: '⚠️',
                        title: 'Unresponsive Processes Detected',
                        description: `${stats.notResponding} process(es) are not responding. They may be consuming resources.`,
                        action: 'nav-processes',
                        actionLabel: 'Manage Processes'
                    });
                }

                if (stats.bloatCount > 0) {
                    recommendations.push({
                        id: 'bloat-detected',
                        severity: 'info',
                        category: 'Optimization',
                        icon: '🎯',
                        title: 'Background Apps Running',
                        description: `${stats.bloatCount} non-essential background application(s) detected. These can be safely closed.`,
                        action: 'kill-bloat',
                        actionLabel: 'Clean Up'
                    });
                }
            } catch { /* skip process check */ }

            // Battery-specific recommendations
            try {
                const si = require('systeminformation');
                const battery = await si.battery();
                if (battery.hasBattery) {
                    if (battery.percent < 20 && !battery.isCharging) {
                        recommendations.push({
                            id: 'battery-low',
                            severity: 'critical',
                            category: 'Battery',
                            icon: '🔋',
                            title: 'Low Battery',
                            description: `Battery is at ${battery.percent}%. Enable Battery Saver mode to extend battery life.`,
                            action: 'battery-saver',
                            actionLabel: 'Enable Battery Saver'
                        });
                    }
                    
                    if (battery.maxCapacity && battery.designedCapacity) {
                        const health = (battery.maxCapacity / battery.designedCapacity) * 100;
                        if (health < 60) {
                            recommendations.push({
                                id: 'battery-health',
                                severity: 'warning',
                                category: 'Battery',
                                icon: '🔋',
                                title: 'Battery Health Degraded',
                                description: `Battery health is at ${Math.round(health)}%. Consider battery replacement for optimal performance.`,
                                action: null,
                                actionLabel: 'Noted'
                            });
                        }
                    }
                }
            } catch { /* skip battery check */ }

            // Always include a positive recommendation if system is healthy
            if (recommendations.length === 0) {
                recommendations.push({
                    id: 'system-healthy',
                    severity: 'success',
                    category: 'System',
                    icon: '✅',
                    title: 'System Running Optimally',
                    description: 'Your system is performing well! No immediate optimizations needed.',
                    action: null,
                    actionLabel: null
                });
            }

        } catch (err) {
            logger.error('Failed to generate recommendations', 'recommendations', { error: err.message });
        }

        // Sort by severity
        const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
        recommendations.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

        logger.info(`Generated ${recommendations.length} recommendations`, 'recommendations');
        return recommendations;
    }
}

module.exports = new Recommendations();
