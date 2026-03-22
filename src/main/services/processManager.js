// ============================================================
// SystemBoost Pro - Process Manager Service
// List, analyze, and terminate processes
// ============================================================
const { exec } = require('child_process');
const logger = require('./logger');

class ProcessManager {
    constructor() {
        // Processes that should NEVER be killed
        this.criticalProcesses = new Set([
            'system', 'smss.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe',
            'services.exe', 'lsass.exe', 'svchost.exe', 'dwm.exe', 'explorer.exe',
            'taskmgr.exe', 'systemboost pro.exe', 'electron.exe',
            'ntoskrnl.exe', 'registry', 'memory compression',
            'searchindexer.exe', 'spoolsv.exe', 'audiodg.exe',
            'fontdrvhost.exe', 'conhost.exe', 'dllhost.exe',
            'runtimebroker.exe', 'shellexperiencehost.exe',
            'sihost.exe', 'taskhostw.exe', 'ctfmon.exe',
            'securityhealthservice.exe', 'msmpeng.exe'
        ]);

        // Known non-essential processes
        this.knownBloat = new Set([
            'onedrive.exe', 'teams.exe', 'slack.exe', 'discord.exe',
            'spotify.exe', 'steam.exe', 'epicgameslauncher.exe',
            'skype.exe', 'zoom.exe', 'dropbox.exe',
            'cortana.exe', 'yourphone.exe', 'gamingservices.exe'
        ]);
    }

    async getProcessList() {
        return new Promise((resolve, reject) => {
            const cmd = `powershell -Command "Get-Process | Select-Object Id, ProcessName, CPU, @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet64/1MB,1)}}, @{Name='Responding';Expression={$_.Responding}}, Description, Path | ConvertTo-Json -Depth 2"`;
            
            exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 15000 }, (err, stdout) => {
                if (err) {
                    logger.error('Failed to get process list', 'processes', { error: err.message });
                    reject(err);
                    return;
                }
                try {
                    let processes = JSON.parse(stdout);
                    if (!Array.isArray(processes)) processes = [processes];
                    
                    processes = processes.map(p => ({
                        pid: p.Id,
                        name: (p.ProcessName || '').toLowerCase() + '.exe',
                        displayName: p.ProcessName || 'Unknown',
                        cpu: p.CPU ? Math.round(p.CPU * 10) / 10 : 0,
                        memoryMB: p.MemoryMB || 0,
                        responding: p.Responding !== false,
                        description: p.Description || '',
                        path: p.Path || '',
                        isCritical: this.criticalProcesses.has((p.ProcessName || '').toLowerCase() + '.exe'),
                        isBloat: this.knownBloat.has((p.ProcessName || '').toLowerCase() + '.exe')
                    }));

                    // Sort by memory usage descending
                    processes.sort((a, b) => b.memoryMB - a.memoryMB);
                    resolve(processes);
                } catch (parseErr) {
                    logger.error('Failed to parse process list', 'processes', { error: parseErr.message });
                    reject(parseErr);
                }
            });
        });
    }

    async killProcess(pid, processName) {
        // Safety check
        const name = (processName || '').toLowerCase();
        if (this.criticalProcesses.has(name)) {
            const msg = `Cannot kill critical system process: ${processName}`;
            logger.warn(msg, 'processes', { pid, processName });
            return { success: false, message: msg };
        }

        return new Promise((resolve) => {
            exec(`taskkill /PID ${pid} /F`, { timeout: 10000 }, (err) => {
                if (err) {
                    logger.error(`Failed to kill process ${processName} (PID: ${pid})`, 'processes', { error: err.message });
                    resolve({ success: false, message: `Failed to terminate ${processName}: ${err.message}` });
                } else {
                    logger.success(`Killed process ${processName} (PID: ${pid})`, 'processes', { pid, processName });
                    resolve({ success: true, message: `${processName} terminated successfully` });
                }
            });
        });
    }

    async killBloatProcesses() {
        const processes = await this.getProcessList();
        const bloatProcs = processes.filter(p => p.isBloat);
        const results = [];

        for (const proc of bloatProcs) {
            const result = await this.killProcess(proc.pid, proc.name);
            results.push({ ...result, process: proc.displayName });
        }

        logger.info(`Killed ${results.filter(r => r.success).length} bloat processes`, 'processes');
        return results;
    }

    async getProcessStats() {
        const processes = await this.getProcessList();
        const totalMemory = processes.reduce((sum, p) => sum + p.memoryMB, 0);
        return {
            totalProcesses: processes.length,
            totalMemoryMB: Math.round(totalMemory),
            criticalCount: processes.filter(p => p.isCritical).length,
            bloatCount: processes.filter(p => p.isBloat).length,
            notResponding: processes.filter(p => !p.responding).length,
            topMemory: processes.slice(0, 5).map(p => ({ name: p.displayName, memoryMB: p.memoryMB })),
            topCpu: [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, 5)
                .map(p => ({ name: p.displayName, cpu: p.cpu }))
        };
    }
}

module.exports = new ProcessManager();
