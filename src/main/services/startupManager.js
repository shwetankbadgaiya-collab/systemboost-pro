// ============================================================
// SystemBoost Pro - Startup Manager Service
// Manage Windows startup programs via registry
// ============================================================
const { exec } = require('child_process');
const logger = require('./logger');

class StartupManager {
    constructor() {
        this.registryPaths = [
            'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce'
        ];
    }

    async getStartupItems() {
        return new Promise((resolve) => {
            const cmd = `powershell -Command "
                $items = @();
                $paths = @(
                    'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
                    'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
                );
                foreach ($p in $paths) {
                    try {
                        $props = Get-ItemProperty -Path $p -ErrorAction SilentlyContinue;
                        if ($props) {
                            $props.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
                                $items += [PSCustomObject]@{
                                    Name = $_.Name;
                                    Command = $_.Value;
                                    RegistryPath = $p;
                                    Enabled = $true
                                }
                            }
                        }
                    } catch {}
                }
                $items | ConvertTo-Json -Depth 2
            "`;

            exec(cmd, { maxBuffer: 5 * 1024 * 1024, timeout: 15000 }, (err, stdout) => {
                if (err) {
                    logger.error('Failed to get startup items', 'startup', { error: err.message });
                    resolve([]);
                    return;
                }
                try {
                    let items = JSON.parse(stdout || '[]');
                    if (!Array.isArray(items)) items = [items];
                    
                    items = items.map(item => ({
                        name: item.Name || 'Unknown',
                        command: item.Command || '',
                        registryPath: item.RegistryPath || '',
                        enabled: item.Enabled !== false,
                        impact: this._estimateImpact(item.Command || '')
                    }));

                    logger.info(`Found ${items.length} startup items`, 'startup');
                    resolve(items);
                } catch {
                    resolve([]);
                }
            });
        });
    }

    async disableStartupItem(name, registryPath) {
        logger.info(`Disabling startup item: ${name}`, 'startup', { registryPath });
        
        return new Promise((resolve) => {
            const safeName = name.replace(/'/g, "''");
            const cmd = `powershell -Command "
                try {
                    $val = (Get-ItemProperty -Path '${registryPath}' -Name '${safeName}' -ErrorAction Stop).'${safeName}';
                    Remove-ItemProperty -Path '${registryPath}' -Name '${safeName}' -ErrorAction Stop;
                    Set-ItemProperty -Path '${registryPath}' -Name '${safeName}_disabled' -Value $val -ErrorAction Stop;
                    Write-Output 'SUCCESS'
                } catch {
                    Write-Output ('ERROR: ' + $_.Exception.Message)
                }
            "`;

            exec(cmd, { timeout: 10000 }, (err, stdout) => {
                const output = (stdout || '').trim();
                if (err || output.startsWith('ERROR')) {
                    const msg = output.replace('ERROR: ', '') || err?.message || 'Unknown error';
                    logger.error(`Failed to disable ${name}: ${msg}`, 'startup');
                    resolve({ success: false, message: msg });
                } else {
                    logger.success(`Disabled startup item: ${name}`, 'startup');
                    resolve({ success: true, message: `${name} disabled from startup` });
                }
            });
        });
    }

    async enableStartupItem(name, registryPath) {
        logger.info(`Enabling startup item: ${name}`, 'startup', { registryPath });
        
        return new Promise((resolve) => {
            const safeName = name.replace(/'/g, "''");
            const cmd = `powershell -Command "
                try {
                    $val = (Get-ItemProperty -Path '${registryPath}' -Name '${safeName}_disabled' -ErrorAction Stop).'${safeName}_disabled';
                    Remove-ItemProperty -Path '${registryPath}' -Name '${safeName}_disabled' -ErrorAction Stop;
                    Set-ItemProperty -Path '${registryPath}' -Name '${safeName}' -Value $val -ErrorAction Stop;
                    Write-Output 'SUCCESS'
                } catch {
                    Write-Output ('ERROR: ' + $_.Exception.Message)
                }
            "`;

            exec(cmd, { timeout: 10000 }, (err, stdout) => {
                const output = (stdout || '').trim();
                if (err || output.startsWith('ERROR')) {
                    const msg = output.replace('ERROR: ', '') || err?.message || 'Unknown error';
                    logger.error(`Failed to enable ${name}: ${msg}`, 'startup');
                    resolve({ success: false, message: msg });
                } else {
                    logger.success(`Enabled startup item: ${name}`, 'startup');
                    resolve({ success: true, message: `${name} enabled for startup` });
                }
            });
        });
    }

    _estimateImpact(command) {
        const cmd = command.toLowerCase();
        const highImpact = ['chrome', 'firefox', 'edge', 'teams', 'slack', 'discord', 'steam', 'spotify'];
        const medImpact = ['onedrive', 'dropbox', 'skype', 'zoom', 'adobe'];
        
        if (highImpact.some(h => cmd.includes(h))) return 'high';
        if (medImpact.some(m => cmd.includes(m))) return 'medium';
        return 'low';
    }
}

module.exports = new StartupManager();
